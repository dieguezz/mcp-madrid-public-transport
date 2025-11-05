// ============================================================================
// Types
// ============================================================================

import { Either } from '../../../common/functional/index.js';
import { ITrainApiPort } from '../application/ITrainApiPort.js';
import { TrainStation } from '../domain/TrainStation.js';
import { TrainArrival, createTrainArrival } from '../domain/TrainArrival.js';
import { createTrainLine } from '../domain/TrainLine.js';
import { createDirection } from '../../shared/domain/Direction.js';
import { fromSeconds } from '../../shared/domain/TimeEstimate.js';
import { HttpErrorType } from '../../../common/http/index.js';
import { ILogger } from '../../../common/logger/index.js';
import { IGtfsStaticRepository } from '../../../gtfs/domain/IGtfsStaticRepository.js';
import {
  filterMadridVehicles,
  getVehiclesAtStop,
  extractLineFromLabel,
  GtfsRealtimeVehicle,
} from './renfe-gtfs-realtime-client.js';
import { GtfsRealtimeCache } from './GtfsRealtimeCache.js';
import { TrainStationMapper } from './train-station-mapper.js';

export type RenfeGtfsRealtimeAdapterDeps = {
  readonly logger: ILogger;
  readonly stationMapper: {
    toGtfsCode: (stationCode: string) => string | undefined;
    fromGtfsCode: (gtfsCode: string) => string | undefined;
    getStationName: (stationCode: string) => string | undefined;
  };
  readonly gtfsStatic?: IGtfsStaticRepository;
  readonly gtfsRtCache?: {
    get: (logger: ILogger) => Promise<Either.Either<Error, any>>;
    invalidate: () => void;
  };
};

// ============================================================================
// Factory Function
// ============================================================================

export const createRenfeGtfsRealtimeAdapter = (
  deps: RenfeGtfsRealtimeAdapterDeps
): ITrainApiPort => {
  const { logger, stationMapper, gtfsStatic, gtfsRtCache } = deps;

  return {
    fetchArrivals: async (station: TrainStation) =>
      fetchArrivalsImpl(logger, stationMapper, gtfsStatic, gtfsRtCache, station),
  };
};

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const fetchArrivalsImpl = async (
  logger: ILogger,
  stationMapper: {
    toGtfsCode: (stationCode: string) => string | undefined;
    fromGtfsCode: (gtfsCode: string) => string | undefined;
    getStationName: (stationCode: string) => string | undefined;
  },
  gtfsStatic: IGtfsStaticRepository | undefined,
  gtfsRtCache: { get: (logger: ILogger) => Promise<Either.Either<Error, any>>; invalidate: () => void } | undefined,
  station: TrainStation
): Promise<Either.Either<HttpErrorType, readonly TrainArrival[]>> => {
  logger.info('🚆 RenfeGtfsRealtimeAdapter: Fetching train arrivals', {
    stationCode: station.code,
    stationName: station.name,
  });

  // Get GTFS-RT stop ID from our station code using mapper
  const gtfsStopId = stationMapper.toGtfsCode(station.code) || station.code;

  logger.debug('🔍 Station code mapping', {
    ourCode: station.code,
    gtfsStopId,
    stationName: stationMapper.getStationName(station.code),
  });

  // Fetch GTFS Realtime feed (from cache if available)
  const feedResult = gtfsRtCache
    ? await gtfsRtCache.get(logger)
    : await import('./renfe-gtfs-realtime-client.js').then((m) =>
        m.getRenfeGtfsRealtime(logger)
      );

  if (Either.isLeft(feedResult)) {
    logger.error('❌ Failed to fetch GTFS-RT feed', {
      error: feedResult.left.message,
    });

    return Either.left({
      message: `Failed to fetch real-time data: ${feedResult.left.message}`,
      statusCode: 503,
      name: 'GtfsRealtimeError',
    } as HttpErrorType);
  }

  const feed = feedResult.right;

  // Filter for Madrid vehicles only
  const madridVehicles = filterMadridVehicles(feed, logger);

  // Get vehicles approaching or at this station
  const vehiclesAtStation = getVehiclesAtStop(madridVehicles, gtfsStopId, logger);

  if (vehiclesAtStation.length === 0) {
    logger.info('ℹ️  No trains currently at or approaching this station', {
      stationCode: station.code,
      gtfsStopId,
    });
    return Either.right([]);
  }

  // Convert to TrainArrival domain objects
  const arrivals = await convertToArrivals(vehiclesAtStation, gtfsStatic, logger);

  logger.info('✅ Train arrivals from Renfe GTFS-RT', {
    count: arrivals.length,
  });

  return Either.right(arrivals);
};

const convertToArrivals = async (
  vehicles: GtfsRealtimeVehicle[],
  gtfsStatic: IGtfsStaticRepository | undefined,
  logger: ILogger
): Promise<TrainArrival[]> => {
  const arrivals = await Promise.all(
    vehicles.map((vehicle) => convertVehicleToArrival(vehicle, gtfsStatic, logger))
  );

  return arrivals.filter((a): a is TrainArrival => a !== null);
};

const convertVehicleToArrival = async (
  vehicle: GtfsRealtimeVehicle,
  gtfsStatic: IGtfsStaticRepository | undefined,
  logger: ILogger
): Promise<TrainArrival | null> => {
  try {
    const v = vehicle.vehicle;

    // Extract line from label (e.g., "C1-21850" -> "C-1")
    const lineCode = extractLineFromLabel(v.vehicle.label);
    const lineResult = createTrainLine(lineCode);

    if (Either.isLeft(lineResult)) {
      logger.warn('⚠️  Invalid line code', { label: v.vehicle.label });
      return null;
    }

    const line = lineResult.right;

    // Extract platform from label if available
    const platformMatch = v.vehicle.label.match(/PLATF\.\((\d+)\)/);
    const platform = platformMatch ? platformMatch[1] : '';

    // Get destination and arrival time from GTFS static data (if available)
    const { destination, estimatedTime } = await getDestinationAndTime(
      v,
      gtfsStatic,
      logger
    );

    const arrivalResult = createTrainArrival({
      line,
      destination,
      estimatedTime,
      platform,
      delay: undefined,
    });

    if (Either.isLeft(arrivalResult)) {
      logger.warn('⚠️  Failed to create train arrival', {
        error: arrivalResult.left.message,
      });
      return null;
    }

    return arrivalResult.right;
  } catch (error) {
    // Skip invalid entries
    logger.warn('⚠️  Skipping invalid vehicle', { error });
    return null;
  }
};

const getDestinationAndTime = async (
  v: GtfsRealtimeVehicle['vehicle'],
  gtfsStatic: IGtfsStaticRepository | undefined,
  logger: ILogger
) => {
  let destinationStr = v.currentStatus || 'Unknown';
  let timeSeconds = v.currentStatus === 'STOPPED_AT' ? 0 : 30;

  if (gtfsStatic && v.trip?.tripId) {
    const destResult = await gtfsStatic.getTripDestination(v.trip.tripId);

    if (Either.isRight(destResult)) {
      destinationStr = destResult.right;
      logger.debug('📍 Got destination from GTFS static', {
        tripId: v.trip.tripId,
        destination: destResult.right,
      });
    }

    // TODO: Calculate actual arrival time from GTFS schedule
  }

  const destination = createDirection(destinationStr);
  const estimatedTime = fromSeconds(timeSeconds);

  return {
    destination,
    estimatedTime,
  };
};

// ============================================================================
// Legacy Class Wrapper
// ============================================================================

/**
 * Renfe GTFS Realtime Adapter for Train Arrivals
 *
 * Uses Renfe's official open data portal for real-time vehicle positions.
 * This is the OFFICIAL and WORKING data source for Cercanías Madrid.
 *
 * Data source: https://data.renfe.com/dataset/ubicacion-vehiculos
 * Feed URL: https://gtfsrt.renfe.com/vehicle_positions.json
 *
 * Note: This adapter needs to map between:
 * - GTFS-RT stopId (CODIGOEMPRESA from train_stations.csv)
 * - Our station code (CODIGOESTACION from train_stations.csv)
 *
 * The mapping is stored in train_stations.csv:
 * - Column 5: CODIGOESTACION (e.g., "11" for Atocha)
 * - Column 10: CODIGOEMPRESA (e.g., "18000" for Atocha) <- Used in GTFS-RT
 */
export class RenfeGtfsRealtimeAdapter implements ITrainApiPort {
  private readonly impl: ITrainApiPort;

  constructor(
    logger: ILogger,
    stationMapper: TrainStationMapper,
    gtfsStatic?: IGtfsStaticRepository,
    gtfsRtCache?: GtfsRealtimeCache
  ) {
    this.impl = createRenfeGtfsRealtimeAdapter({
      logger,
      stationMapper,
      gtfsStatic,
      gtfsRtCache,
    });
  }

  fetchArrivals(
    station: TrainStation
  ): Promise<Either.Either<HttpErrorType, readonly TrainArrival[]>> {
    return this.impl.fetchArrivals(station);
  }
}

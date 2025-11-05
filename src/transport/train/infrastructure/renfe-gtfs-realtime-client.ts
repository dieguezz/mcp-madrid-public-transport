import { ILogger } from '../../../common/logger/index.js';
import { Either } from '../../../common/functional/index.js';

/**
 * Renfe GTFS Realtime API Client
 *
 * Uses Renfe's official open data portal for real-time vehicle positions
 * https://data.renfe.com/dataset/ubicacion-vehiculos
 *
 * This feed includes ALL Cercanías networks in Spain (Madrid, Barcelona, Sevilla, etc.)
 * We filter by trip IDs starting with "1039" for Madrid.
 */

const GTFS_RT_URL = 'https://gtfsrt.renfe.com/vehicle_positions.json';
const MADRID_TRIP_PREFIX = '1039'; // Madrid trip IDs start with "1039X"

export interface GtfsRealtimeVehicle {
  id: string;
  vehicle: {
    trip: {
      tripId: string;
      routeId?: string;
      directionId?: number;
    };
    position: {
      latitude: number;
      longitude: number;
      speed?: number;
    };
    currentStatus?: 'INCOMING_AT' | 'STOPPED_AT' | 'IN_TRANSIT_TO';
    stopId?: string;
    currentStopSequence?: number;
    timestamp?: number;
    vehicle: {
      id: string;
      label: string;
    };
  };
}

export interface GtfsRealtimeFeed {
  header: {
    gtfsRealtimeVersion: string;
    timestamp: string;
  };
  entity: GtfsRealtimeVehicle[];
}

/**
 * Fetch GTFS Realtime feed from Renfe
 */
export async function getRenfeGtfsRealtime(
  logger: ILogger
): Promise<Either.Either<Error, GtfsRealtimeFeed>> {
  try {
    logger.info('🚆 Renfe GTFS-RT: Fetching vehicle positions');

    const response = await fetch(GTFS_RT_URL);

    if (!response.ok) {
      return Either.left(
        new Error(`GTFS-RT API error: ${response.status} ${response.statusText}`)
      );
    }

    const data = (await response.json()) as GtfsRealtimeFeed;

    logger.info('✅ Renfe GTFS-RT: Feed received', {
      totalVehicles: data.entity.length,
      timestamp: new Date(parseInt(data.header.timestamp) * 1000).toISOString(),
    });

    return Either.right(data);
  } catch (error: any) {
    logger.error('❌ Renfe GTFS-RT: Request failed', {
      error: error.message,
    });
    return Either.left(error);
  }
}

/**
 * Filter feed for Madrid Cercanías only
 */
export function filterMadridVehicles(
  feed: GtfsRealtimeFeed,
  logger: ILogger
): GtfsRealtimeVehicle[] {
  const madridVehicles = feed.entity.filter((entity) =>
    entity.vehicle.trip.tripId.startsWith(MADRID_TRIP_PREFIX)
  );

  logger.debug('🔍 Filtered Madrid vehicles', {
    total: feed.entity.length,
    madrid: madridVehicles.length,
  });

  return madridVehicles;
}

/**
 * Get vehicles approaching or at a specific stop
 */
export function getVehiclesAtStop(
  vehicles: GtfsRealtimeVehicle[],
  stopId: string,
  logger: ILogger
): GtfsRealtimeVehicle[] {
  const vehiclesAtStop = vehicles.filter(
    (v) => v.vehicle.stopId === stopId
  );

  logger.debug('🚉 Vehicles at stop', {
    stopId,
    count: vehiclesAtStop.length,
  });

  return vehiclesAtStop;
}

/**
 * Extract line from vehicle label
 * Examples: "C1-21850-PLATF.(2)" -> "C-1", "C10-21148-PLATF.(1)" -> "C-10"
 */
export function extractLineFromLabel(label: string): string {
  const match = label.match(/^(C\d+)/);
  if (match) {
    const lineCode = match[1]; // "C1", "C10", etc.
    return lineCode.replace('C', 'C-'); // "C-1", "C-10"
  }
  return 'Unknown';
}

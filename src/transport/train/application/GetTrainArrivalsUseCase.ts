import { Either, Option } from '../../../common/functional/index.js';
import { GetTrainArrivalsCommand } from './GetTrainArrivalsCommand.js';
import { GetTrainArrivalsResult, ArrivalDto } from './GetTrainArrivalsResult.js';
import { ITrainStationRepository } from '../domain/ITrainStationRepository.js';
import { ITrainApiPort } from './ITrainApiPort.js';
import { ICacheRepository } from '../../../cache/domain/ICacheRepository.js';
import { createCacheKey, cacheKeyGetValue } from '../../../cache/domain/CacheKey.js';
import { type TrainArrival } from '../domain/TrainArrival.js';
import { createTrainLine, trainLineGetDisplayName } from '../domain/TrainLine.js';
import { type TrainStation, trainStationGetCode, trainStationGetName } from '../domain/TrainStation.js';
import { TrainServices } from '../domain/index.js';
import { createApiNotAvailableError, type TransportError } from '../../shared/domain/transport-errors.js';
import { ILogger } from '../../../common/logger/index.js';
import { directionToString } from '../../shared/domain/Direction.js';
import { formatRelative } from '../../shared/domain/TimeEstimate.js';

// ============================================================================
// Types
// ============================================================================

export type GetTrainArrivalsDeps = {
  readonly stationRepository: ITrainStationRepository;
  readonly trainApi: ITrainApiPort;
  readonly cache: ICacheRepository;
  readonly logger: ILogger;
  readonly cacheTtl?: number;
};

// ============================================================================
// Main Use Case Function (Curried)
// ============================================================================

export const getTrainArrivals =
  (deps: GetTrainArrivalsDeps) =>
  async (
    command: GetTrainArrivalsCommand
  ): Promise<Either.Either<TransportError, GetTrainArrivalsResult>> => {
    const { stationRepository, trainApi, cache, logger, cacheTtl = 10 } = deps;

    logger.info('🚆 Getting train arrivals', { command });

    // 1. Resolve station
    logger.debug('🔎 Resolving train station...', { query: command.station });
    const stationResult = await resolveStation(stationRepository, logger, command.station);
    if (Either.isLeft(stationResult)) {
      logger.error('❌ Station resolution failed', {
        query: command.station,
        error: stationResult.left.message,
      });
      return stationResult;
    }
    const station = stationResult.right;

    logger.info('✅ Train station resolved', {
      query: command.station,
      code: trainStationGetCode(station),
      name: trainStationGetName(station),
      lines: station.lines,
    });

    // 2. Fetch arrivals (with cache)
    logger.debug('📡 Fetching train arrivals from API...', { stationCode: trainStationGetCode(station) });
    const arrivalsResult = await fetchArrivals(trainApi, cache, logger, cacheTtl, station);
    if (Either.isLeft(arrivalsResult)) {
      logger.error('❌ Failed to fetch train arrivals', {
        stationCode: trainStationGetCode(station),
        error: arrivalsResult.left.message,
      });
      return Either.left(
        createApiNotAvailableError('Train API', arrivalsResult.left.message)
      );
    }

    let arrivals = arrivalsResult.right;

    logger.info('✅ Train arrivals fetched', {
      arrivalsCount: arrivals.length,
    });

    // 3. Filter by line if specified
    if (command.line) {
      const lineResult = createTrainLine(command.line);
      if (Either.isRight(lineResult)) {
        arrivals = TrainServices.filterByLine(arrivals, lineResult.right);
        logger.debug('Filtered by line', { line: command.line, count: arrivals.length });
      }
    }

    // 4. Filter by direction if specified
    if (command.direction) {
      arrivals = TrainServices.filterByDirection(arrivals, command.direction);
      logger.debug('Filtered by direction', {
        direction: command.direction,
        count: arrivals.length,
      });
    }

    // 5. Get next N arrivals
    const count = command.count ?? 2;
    const nextArrivals = TrainServices.calculateNextArrivals(arrivals, count);

    // 6. Map to result DTO
    const result: GetTrainArrivalsResult = {
      station: trainStationGetName(station),
      stationCode: trainStationGetCode(station),
      arrivals: nextArrivals.map(mapArrivalToDto),
    };

    logger.info('Train arrivals retrieved', {
      station: trainStationGetName(station),
      count: result.arrivals.length,
    });

    return Either.right(result);
  };

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const resolveStation = async (
  repository: ITrainStationRepository,
  _logger: ILogger,
  query: string
): Promise<Either.Either<ReturnType<typeof TrainServices.resolveTrainStation> extends Either.Either<infer L, any> ? L : never, TrainStation>> => {
  const stations = await repository.findAll();
  return TrainServices.resolveTrainStation(stations, query);
};

const fetchArrivals = async (
  trainApi: ITrainApiPort,
  cache: ICacheRepository,
  logger: ILogger,
  cacheTtl: number,
  station: TrainStation
): Promise<Either.Either<Error, readonly TrainArrival[]>> => {
  const cacheKeyResult = createCacheKey(['train', 'arrivals', trainStationGetCode(station)]);

  if (Either.isLeft(cacheKeyResult)) {
    return Either.left(cacheKeyResult.left);
  }

  const cacheKey = cacheKeyResult.right;

  // Check cache
  const cached = cache.get<readonly TrainArrival[]>(cacheKey);
  if (Option.isSome(cached)) {
    logger.debug('Cache hit', { key: cacheKeyGetValue(cacheKey) });
    return Either.right(cached.value);
  }

  // Fetch from API
  logger.debug('Cache miss, fetching from API', { stationCode: trainStationGetCode(station) });
  const apiResult = await trainApi.fetchArrivals(station);

  if (Either.isRight(apiResult)) {
    // Cache successful result
    cache.set(cacheKey, apiResult.right, cacheTtl);
  }

  return apiResult as Either.Either<Error, readonly TrainArrival[]>;
};

const mapArrivalToDto = (arrival: TrainArrival): ArrivalDto => ({
  line: trainLineGetDisplayName(arrival.line),
  destination: directionToString(arrival.destination),
  estimatedTime: formatRelative(arrival.estimatedTime),
  platform: arrival.platform,
  delay: arrival.delay,
});

// ============================================================================
// Legacy Class Wrapper (for backward compatibility)
// ============================================================================

export class GetTrainArrivalsUseCase {
  readonly execute: (
    command: GetTrainArrivalsCommand
  ) => Promise<Either.Either<TransportError, GetTrainArrivalsResult>>;

  constructor(
    stationRepository: ITrainStationRepository,
    trainApi: ITrainApiPort,
    cache: ICacheRepository,
    logger: ILogger,
    cacheTtl: number = 10
  ) {
    this.execute = getTrainArrivals({
      stationRepository,
      trainApi,
      cache,
      logger,
      cacheTtl,
    });
  }
}

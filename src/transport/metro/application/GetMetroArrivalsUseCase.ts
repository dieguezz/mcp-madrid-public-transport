import { Either, Option } from '../../../common/functional/index.js';
import { GetMetroArrivalsCommand } from './GetMetroArrivalsCommand.js';
import { GetMetroArrivalsResult, ArrivalDto } from './GetMetroArrivalsResult.js';
import { IMetroStopRepository } from '../domain/IMetroStopRepository.js';
import { IMetroApiPort } from './IMetroApiPort.js';
import { ICacheRepository } from '../../../cache/domain/ICacheRepository.js';
import { createCacheKey, cacheKeyGetValue } from '../../../cache/domain/CacheKey.js';
import { type MetroArrival, metroArrivalGetLine, metroArrivalGetDestination, metroArrivalGetEstimatedTime } from '../domain/MetroArrival.js';
import { createMetroLine, metroLineGetDisplayName } from '../domain/MetroLine.js';
import { type MetroStop, metroStopGetCode, metroStopGetName, metroStopGetApiCodes, metroStopGetLines } from '../domain/MetroStop.js';
import { MetroServices } from '../domain/index.js';
import { createApiNotAvailableError, type TransportError } from '../../shared/domain/transport-errors.js';
import { ILogger } from '../../../common/logger/index.js';
import { directionToString } from '../../shared/domain/Direction.js';
import { formatRelative } from '../../shared/domain/TimeEstimate.js';

// ============================================================================
// Types
// ============================================================================

export type GetMetroArrivalsDeps = {
  readonly stopRepository: IMetroStopRepository;
  readonly metroApi: IMetroApiPort;
  readonly cache: ICacheRepository;
  readonly logger: ILogger;
  readonly cacheTtl?: number;
};

// ============================================================================
// Main Use Case Function (Curried)
// ============================================================================

export const getMetroArrivals =
  (deps: GetMetroArrivalsDeps) =>
  async (
    command: GetMetroArrivalsCommand
  ): Promise<Either.Either<TransportError, GetMetroArrivalsResult>> => {
    const { stopRepository, metroApi, cache, logger, cacheTtl = 30 } = deps;

    logger.info('🔍 Getting metro arrivals', { command });

    // 1. Resolve stop
    logger.debug('🔎 Resolving stop...', { query: command.station });
    const stopResult = await resolveStop(stopRepository, logger, command.station);
    if (Either.isLeft(stopResult)) {
      logger.error('❌ Stop resolution failed', {
        query: command.station,
        error: stopResult.left.message,
      });
      return stopResult;
    }
    const stop = stopResult.right;

    logger.info('✅ Stop resolved', {
      query: command.station,
      code: metroStopGetCode(stop),
      name: metroStopGetName(stop),
      apiCodes: metroStopGetApiCodes(stop),
      lines: metroStopGetLines(stop),
    });

    // 2. Fetch arrivals (with cache)
    logger.debug('📡 Fetching arrivals from API...', { stopCode: metroStopGetCode(stop) });
    const arrivalsResult = await fetchArrivals(metroApi, cache, logger, cacheTtl, stop);
    if (Either.isLeft(arrivalsResult)) {
      logger.error('❌ Failed to fetch arrivals', {
        stopCode: metroStopGetCode(stop),
        apiCodes: metroStopGetApiCodes(stop),
        error: arrivalsResult.left.message,
      });
      return Either.left(
        createApiNotAvailableError('Metro API', arrivalsResult.left.message)
      );
    }
    let arrivals = arrivalsResult.right;

    logger.info('✅ Arrivals fetched', { count: arrivals.length });

    // 3. Filter by line if specified
    if (command.line) {
      const lineResult = createMetroLine(command.line);
      if (Either.isRight(lineResult)) {
        arrivals = MetroServices.filterByLine(arrivals, lineResult.right);
        logger.debug('Filtered by line', { line: command.line, count: arrivals.length });
      }
    }

    // 4. Filter by direction if specified
    if (command.direction) {
      arrivals = MetroServices.filterByDirection(arrivals, command.direction);
      logger.debug('Filtered by direction', {
        direction: command.direction,
        count: arrivals.length,
      });
    }

    // 5. Get next N arrivals
    const count = command.count ?? 2;
    const nextArrivals = MetroServices.calculateNextArrivals(arrivals, count);

    // 6. Map to result DTO
    const result: GetMetroArrivalsResult = {
      station: metroStopGetName(stop),
      stationCode: metroStopGetCode(stop),
      arrivals: nextArrivals.map(mapArrivalToDto),
    };

    logger.info('Metro arrivals retrieved', {
      station: metroStopGetName(stop),
      count: result.arrivals.length,
    });

    return Either.right(result);
  };

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const resolveStop = async (
  repository: IMetroStopRepository,
  _logger: ILogger,
  query: string
): Promise<Either.Either<ReturnType<typeof MetroServices.resolveMetroStop> extends Either.Either<infer L, any> ? L : never, MetroStop>> => {
  const stops = await repository.findAll();
  return MetroServices.resolveMetroStop(stops, query);
};

const fetchArrivals = async (
  metroApi: IMetroApiPort,
  cache: ICacheRepository,
  logger: ILogger,
  cacheTtl: number,
  stop: MetroStop
): Promise<Either.Either<Error, readonly MetroArrival[]>> => {
  const cacheKeyResult = createCacheKey(['metro', 'arrivals', metroStopGetCode(stop)]);

  if (Either.isLeft(cacheKeyResult)) {
    return Either.left(cacheKeyResult.left);
  }

  const cacheKey = cacheKeyResult.right;

  // Check cache
  const cached = cache.get<readonly MetroArrival[]>(cacheKey);
  if (Option.isSome(cached)) {
    logger.debug('Cache hit', { key: cacheKeyGetValue(cacheKey) });
    return Either.right(cached.value);
  }

  // Fetch from API
  logger.debug('Cache miss, fetching from API', { stopCode: metroStopGetCode(stop) });
  const apiResult = await metroApi.fetchArrivals(stop);

  if (Either.isRight(apiResult)) {
    // Cache successful result
    cache.set(cacheKey, apiResult.right, cacheTtl);
  }

  return apiResult as Either.Either<Error, readonly MetroArrival[]>;
};

const mapArrivalToDto = (arrival: MetroArrival): ArrivalDto => ({
  line: metroLineGetDisplayName(metroArrivalGetLine(arrival)),
  destination: directionToString(metroArrivalGetDestination(arrival)),
  estimatedTime: formatRelative(metroArrivalGetEstimatedTime(arrival)),
  platform: arrival.platform,
});

// ============================================================================
// Legacy Class Wrapper (for backward compatibility)
// ============================================================================

export class GetMetroArrivalsUseCase {
  readonly execute: (
    command: GetMetroArrivalsCommand
  ) => Promise<Either.Either<TransportError, GetMetroArrivalsResult>>;

  constructor(
    stopRepository: IMetroStopRepository,
    metroApi: IMetroApiPort,
    cache: ICacheRepository,
    logger: ILogger,
    cacheTtl: number = 30
  ) {
    this.execute = getMetroArrivals({
      stopRepository,
      metroApi,
      cache,
      logger,
      cacheTtl,
    });
  }
}

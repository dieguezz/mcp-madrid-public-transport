import { Either, Option } from '../../../common/functional/index.js';
import { GetBusArrivalsCommand } from './GetBusArrivalsCommand.js';
import { GetBusArrivalsResult, ArrivalDto, IncidentDto } from './GetBusArrivalsResult.js';
import { IBusStopRepository } from '../domain/IBusStopRepository.js';
import { IBusApiPort, BusArrivalsResponse } from './IBusApiPort.js';
import { ICacheRepository } from '../../../cache/domain/ICacheRepository.js';
import { createCacheKey } from '../../../cache/domain/CacheKey.js';
import { type BusArrival } from '../domain/BusArrival.js';
import { type BusIncident } from '../domain/BusIncident.js';
import { createBusLine, busLineGetDisplayName } from '../domain/BusLine.js';
import { type BusStop } from '../domain/BusStop.js';
import { BusServices } from '../domain/index.js';
import { createApiNotAvailableError, type TransportError, type StopNotFoundError } from '../../shared/domain/transport-errors.js';
import { ILogger } from '../../../common/logger/index.js';
import { directionToString } from '../../shared/domain/Direction.js';
import { formatRelative } from '../../shared/domain/TimeEstimate.js';

// ============================================================================
// Types
// ============================================================================

export type GetBusArrivalsDeps = {
  readonly stopRepository: IBusStopRepository;
  readonly busApi: IBusApiPort;
  readonly cache: ICacheRepository;
  readonly logger: ILogger;
  readonly cacheTtl?: number;
};

// ============================================================================
// Main Use Case Function (Curried)
// ============================================================================

export const getBusArrivals =
  (deps: GetBusArrivalsDeps) =>
  async (
    command: GetBusArrivalsCommand
  ): Promise<Either.Either<TransportError | StopNotFoundError, GetBusArrivalsResult>> => {
    const { stopRepository, busApi, cache, logger, cacheTtl = 10 } = deps;

    logger.info('🚌 Getting bus arrivals', { command });

    // 1. Resolve stop
    logger.debug('🔎 Resolving bus stop...', { query: command.stop });
    const stopResult = await resolveStop(stopRepository, logger, command.stop);
    if (Either.isLeft(stopResult)) {
      logger.error('❌ Stop resolution failed', {
        query: command.stop,
        error: stopResult.left.message,
      });
      return stopResult;
    }
    const stop = stopResult.right;

    logger.info('✅ Bus stop resolved', {
      query: command.stop,
      code: stop.code,
      name: stop.name,
      lines: stop.lines,
    });

    // 2. Fetch arrivals (with cache)
    logger.debug('📡 Fetching bus arrivals from API...', { stopCode: stop.code });
    const arrivalsResult = await fetchArrivals(busApi, cache, logger, cacheTtl, stop);
    if (Either.isLeft(arrivalsResult)) {
      logger.error('❌ Failed to fetch bus arrivals', {
        stopCode: stop.code,
        error: arrivalsResult.left.message,
      });
      return Either.left(
        createApiNotAvailableError('EMT', arrivalsResult.left.message)
      );
    }

    let arrivals = arrivalsResult.right.arrivals;
    const incidents = arrivalsResult.right.incidents;

    logger.info('✅ Bus arrivals fetched', {
      arrivalsCount: arrivals.length,
      incidentsCount: incidents.length,
    });

    // 3. Filter by line if specified
    if (command.line) {
      const lineResult = createBusLine(command.line);
      if (Either.isRight(lineResult)) {
        arrivals = BusServices.filterByLine(arrivals, lineResult.right);
        logger.debug('Filtered by line', { line: command.line, count: arrivals.length });
      }
    }

    // 4. Filter by direction if specified
    if (command.direction) {
      arrivals = BusServices.filterByDirection(arrivals, command.direction);
      logger.debug('Filtered by direction', {
        direction: command.direction,
        count: arrivals.length,
      });
    }

    // 5. Get next N arrivals
    const count = command.count ?? 2;
    const nextArrivals = BusServices.calculateNextArrivals(arrivals, count);

    // 6. Map to result DTO
    const result: GetBusArrivalsResult = {
      stop: stop.name,
      stopCode: stop.code,
      arrivals: nextArrivals.map(mapArrivalToDto),
      incidents: incidents.length > 0 ? incidents.map(mapIncidentToDto) : undefined,
    };

    logger.info('Bus arrivals retrieved', {
      stop: stop.name,
      count: result.arrivals.length,
    });

    return Either.right(result);
  };

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const resolveStop = async (
  repository: IBusStopRepository,
  _logger: ILogger,
  query: string
): Promise<Either.Either<TransportError, BusStop>> => {
  const stops = await repository.findAll();
  return BusServices.resolveBusStop(stops, query);
};

const fetchArrivals = async (
  busApi: IBusApiPort,
  cache: ICacheRepository,
  logger: ILogger,
  cacheTtl: number,
  stop: BusStop
): Promise<Either.Either<Error, BusArrivalsResponse>> => {
  const cacheKeyResult = createCacheKey(['bus', 'arrivals', stop.code]);
  if (Either.isLeft(cacheKeyResult)) {
    return Either.left(cacheKeyResult.left);
  }
  const cacheKey = cacheKeyResult.right;

  // Check cache
  const cached = cache.get<BusArrivalsResponse>(cacheKey);
  if (Option.isSome(cached)) {
    logger.debug('Cache hit', { key: cacheKey.value });
    return Either.right(cached.value);
  }

  // Fetch from API
  logger.debug('Cache miss, fetching from API', { stopCode: stop.code });
  const apiResult = await busApi.fetchArrivals(stop);

  if (Either.isRight(apiResult)) {
    // Cache successful result
    cache.set(cacheKey, apiResult.right, cacheTtl);
  }

  return apiResult as Either.Either<Error, BusArrivalsResponse>;
};

const mapArrivalToDto = (arrival: BusArrival): ArrivalDto => ({
  line: busLineGetDisplayName(arrival.line),
  destination: directionToString(arrival.destination),
  estimatedTime: formatRelative(arrival.estimatedTime),
  distance: arrival.distance,
});

const mapIncidentToDto = (incident: BusIncident): IncidentDto => ({
  title: incident.title,
  description: incident.description,
  cause: incident.cause,
  effect: incident.effect,
});

// ============================================================================
// Legacy Class Wrapper (for backward compatibility)
// ============================================================================

export class GetBusArrivalsUseCase {
  readonly execute: (
    command: GetBusArrivalsCommand
  ) => Promise<Either.Either<TransportError, GetBusArrivalsResult>>;

  constructor(
    stopRepository: IBusStopRepository,
    busApi: IBusApiPort,
    cache: ICacheRepository,
    logger: ILogger,
    cacheTtl: number = 10
  ) {
    this.execute = getBusArrivals({
      stopRepository,
      busApi,
      cache,
      logger,
      cacheTtl,
    });
  }
}

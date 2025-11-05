// ============================================================================
// Types
// ============================================================================

import { join } from 'path';
import { existsSync } from 'fs';
import { Either } from '../../common/functional/index.js';
import { GtfsCsvParser } from './GtfsCsvParser.js';
import { InMemoryGtfsStore } from './InMemoryGtfsStore.js';
import { mapCsvToStop, mapCsvToRoute, RawStopCsv, RawRouteCsv } from './gtfs-mappers.js';
import { ILogger } from '../../common/logger/index.js';

export type GtfsFileLoaderDeps = {
  readonly logger: ILogger;
  readonly gtfsPath: string;
};

// ============================================================================
// Factory Function
// ============================================================================

export const createGtfsFileLoader = (deps: GtfsFileLoaderDeps) => {
  const { logger, gtfsPath } = deps;
  const parser = new GtfsCsvParser();

  return {
    loadAll: async (): Promise<Either.Either<Error, InMemoryGtfsStore>> =>
      loadAllImpl(logger, gtfsPath, parser),
  };
};

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const loadAllImpl = async (
  logger: ILogger,
  gtfsPath: string,
  parser: GtfsCsvParser
): Promise<Either.Either<Error, InMemoryGtfsStore>> => {
  logger.info('Loading GTFS data', { path: gtfsPath });

  const store = new InMemoryGtfsStore();

  // Load stops from all transport modes
  const stopsResult = await loadStops(logger, gtfsPath, parser, store);
  if (Either.isLeft(stopsResult)) {
    return stopsResult;
  }

  // Load routes
  const routesResult = await loadRoutes(logger, gtfsPath, parser, store);
  if (Either.isLeft(routesResult)) {
    return routesResult;
  }

  logger.info('GTFS data loaded', {
    stops: store.getStopCount(),
    routes: store.getRouteCount(),
  });

  return Either.right(store);
};

const loadStops = async (
  logger: ILogger,
  gtfsPath: string,
  parser: GtfsCsvParser,
  store: InMemoryGtfsStore
): Promise<Either.Either<Error, void>> => {
  const modes = ['metro', 'bus', 'train'];
  let totalLoaded = 0;

  for (const mode of modes) {
    // For bus, we need to load from subdirectories (emt, urban, interurban)
    const filePaths = mode === 'bus'
      ? [
          join(gtfsPath, 'bus', 'emt', 'stops.txt'),
          join(gtfsPath, 'bus', 'urban', 'stops.txt'),
          join(gtfsPath, 'bus', 'interurban', 'stops.txt'),
        ]
      : [join(gtfsPath, mode, 'stops.txt')];

    for (const filePath of filePaths) {
      if (!existsSync(filePath)) {
        logger.warn('GTFS stops file not found', { mode, filePath });
        continue;
      }

      logger.verbose('Loading stops', { mode, filePath });

      const csvResult = await parser.parseFile<RawStopCsv>(filePath);

      if (Either.isLeft(csvResult)) {
        return Either.left(
          new Error(`Failed to parse stops for ${mode}: ${csvResult.left.message}`)
        );
      }

      let loaded = 0;
      let errors = 0;

      for (const csv of csvResult.right) {
        const stopResult = mapCsvToStop(csv);

        if (Either.isRight(stopResult)) {
          store.addStop(stopResult.right);
          loaded++;
        } else {
          errors++;
          logger.debug('Failed to map stop', {
            mode,
            stopId: csv.stop_id,
            error: stopResult.left.message,
          });
        }
      }

      logger.verbose('Stops loaded', { mode, loaded, errors });
      totalLoaded += loaded;
    }
  }

  if (totalLoaded === 0) {
    return Either.left(new Error('No stops loaded from GTFS data'));
  }

  return Either.right(undefined);
};

const loadRoutes = async (
  logger: ILogger,
  gtfsPath: string,
  parser: GtfsCsvParser,
  store: InMemoryGtfsStore
): Promise<Either.Either<Error, void>> => {
  const modes = ['metro', 'bus', 'train'];
  let totalLoaded = 0;

  for (const mode of modes) {
    // For bus, we need to load from subdirectories (emt, urban, interurban)
    const filePaths = mode === 'bus'
      ? [
          join(gtfsPath, 'bus', 'emt', 'routes.txt'),
          join(gtfsPath, 'bus', 'urban', 'routes.txt'),
          join(gtfsPath, 'bus', 'interurban', 'routes.txt'),
        ]
      : [join(gtfsPath, mode, 'routes.txt')];

    for (const filePath of filePaths) {
      if (!existsSync(filePath)) {
        logger.warn('GTFS routes file not found', { mode, filePath });
        continue;
      }

      logger.verbose('Loading routes', { mode, filePath });

      const csvResult = await parser.parseFile<RawRouteCsv>(filePath);

      if (Either.isLeft(csvResult)) {
        logger.warn('Failed to parse routes', { mode, error: csvResult.left.message });
        continue; // Routes are optional
      }

      for (const csv of csvResult.right) {
        const routeResult = mapCsvToRoute(csv);
        if (Either.isRight(routeResult)) {
          store.addRoute(routeResult.right);
          totalLoaded++;
        }
      }

      logger.verbose('Routes loaded', { mode, count: csvResult.right.length });
    }
  }

  logger.debug('Total routes loaded', { count: totalLoaded });
  return Either.right(undefined);
};

// ============================================================================
// Legacy Class Wrapper
// ============================================================================

export class GtfsFileLoader {
  private readonly impl: ReturnType<typeof createGtfsFileLoader>;

  constructor(logger: ILogger, gtfsPath: string) {
    this.impl = createGtfsFileLoader({ logger, gtfsPath });
  }

  async loadAll(): Promise<Either.Either<Error, InMemoryGtfsStore>> {
    return this.impl.loadAll();
  }
}

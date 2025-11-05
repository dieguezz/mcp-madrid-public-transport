// ============================================================================
// Types
// ============================================================================

import Database from 'better-sqlite3';
import * as Either from 'fp-ts/lib/Either.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { LRUCache } from 'lru-cache';
import { ILogger } from '../../common/logger/ILogger.js';
import { IGtfsStaticRepository } from '../domain/IGtfsStaticRepository.js';
import { GtfsTripStop } from '../domain/GtfsTripStop.js';
import { GtfsTrip } from '../domain/GtfsTrip.js';

export type SqliteGtfsStaticRepositoryDeps = {
  readonly logger: ILogger;
  readonly gtfsDataPath: string;
  readonly dbPath?: string; // In-memory by default
};

export type SqliteGtfsStaticRepositoryState = {
  db: Database.Database;
  initialized: boolean;
  tripDestinationCache: LRUCache<string, string>;
  tripStopsCache: LRUCache<string, readonly GtfsTripStop[]>;
  arrivalTimeCache: LRUCache<string, string>;
  tripStationCache: LRUCache<string, boolean>;
};

// ============================================================================
// Factory Function
// ============================================================================

export const createSqliteGtfsStaticRepository = (
  deps: SqliteGtfsStaticRepositoryDeps
): IGtfsStaticRepository => {
  const { logger, gtfsDataPath, dbPath = ':memory:' } = deps;

  // Private state (closure)
  const state: SqliteGtfsStaticRepositoryState = {
    db: new Database(dbPath),
    initialized: false,
    tripDestinationCache: new LRUCache<string, string>({
      max: 1000,
      ttl: 1000 * 60 * 60,
    }),
    tripStopsCache: new LRUCache<string, readonly GtfsTripStop[]>({
      max: 500,
      ttl: 1000 * 60 * 60,
    }),
    arrivalTimeCache: new LRUCache<string, string>({
      max: 2000,
      ttl: 1000 * 60 * 30,
    }),
    tripStationCache: new LRUCache<string, boolean>({
      max: 2000,
      ttl: 1000 * 60 * 60,
    }),
  };

  // Set WAL mode
  state.db.pragma('journal_mode = WAL');

  return {
    initialize: async () => initializeImpl(logger, gtfsDataPath, state),
    getTripStops: async (tripId: string) => getTripStopsImpl(logger, state, tripId),
    getArrivalTime: async (tripId: string, stopId: string) =>
      getArrivalTimeImpl(logger, state, tripId, stopId),
    tripGoesToStation: async (tripId: string, stopId: string) =>
      tripGoesToStationImpl(logger, state, tripId, stopId),
    getTripDestination: async (tripId: string) => getTripDestinationImpl(logger, state, tripId),
    getFutureStops: async (tripId: string, fromStopSequence: number) =>
      getFutureStopsImpl(logger, state, tripId, fromStopSequence),
    getTripsByRoute: async (routeId: string) => getTripsByRouteImpl(logger, state, routeId),
    getAllTrips: async () => getAllTripsImpl(logger, state),
    getStopTimesByTrip: async (tripId: string) => getTripStopsImpl(logger, state, tripId),
    getAllStops: async () => getAllStopsImpl(logger, state),
    getAllRoutes: async () => getAllRoutesImpl(logger, state),
    getAllTransfers: async () => getAllTransfersImpl(logger, state),
  };
};

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const initializeImpl = async (
  logger: ILogger,
  gtfsDataPath: string,
  state: SqliteGtfsStaticRepositoryState
): Promise<Either.Either<Error, void>> => {
  if (state.initialized) {
    return Either.right(undefined);
  }

  try {
    logger.info('Initializing GTFS static database', { dbPath: ':memory:' });

    // Create tables (idempotent)
    createTables(state.db);

    // Check if database already has data (for persistent databases)
    const hasData = checkIfDataExists(state.db);

    if (hasData) {
      logger.info('GTFS static database already contains data, skipping CSV load');
    } else {
      // Load data from CSV files
      logger.info('Loading GTFS data from CSV files...');
      await loadStops(logger, gtfsDataPath, state.db);
      await loadRoutes(logger, gtfsDataPath, state.db);
      await loadTrips(logger, gtfsDataPath, state.db);
      await loadStopTimes(logger, gtfsDataPath, state.db);
      await loadTransfers(logger, gtfsDataPath, state.db);

      // Create indexes for performance
      createIndexes(state.db);
    }

    state.initialized = true;
    logger.info('GTFS static database ready');

    return Either.right(undefined);
  } catch (error) {
    logger.error('Failed to initialize GTFS static database', { error });
    return Either.left(error as Error);
  }
};

// Database table creation
const createTables = (db: Database.Database): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stops (
      stop_id TEXT PRIMARY KEY,
      stop_name TEXT NOT NULL,
      stop_lat REAL,
      stop_lon REAL
    );

    CREATE TABLE IF NOT EXISTS routes (
      route_id TEXT PRIMARY KEY,
      route_short_name TEXT NOT NULL,
      route_long_name TEXT,
      route_type INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trips (
      trip_id TEXT PRIMARY KEY,
      route_id TEXT NOT NULL,
      service_id TEXT,
      trip_headsign TEXT
    );

    CREATE TABLE IF NOT EXISTS stop_times (
      trip_id TEXT NOT NULL,
      stop_id TEXT NOT NULL,
      stop_sequence INTEGER NOT NULL,
      arrival_time TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      PRIMARY KEY (trip_id, stop_sequence)
    );

    CREATE TABLE IF NOT EXISTS transfers (
      from_stop_id TEXT NOT NULL,
      to_stop_id TEXT NOT NULL,
      transfer_type INTEGER NOT NULL,
      min_transfer_time INTEGER,
      PRIMARY KEY (from_stop_id, to_stop_id)
    );
  `);
};

const createIndexes = (db: Database.Database): void => {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_stop_times_trip ON stop_times(trip_id);
    CREATE INDEX IF NOT EXISTS idx_stop_times_stop ON stop_times(stop_id);
    CREATE INDEX IF NOT EXISTS idx_stop_times_trip_stop ON stop_times(trip_id, stop_id);
    CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_stop_id);
    CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_stop_id);
  `);
};

const checkIfDataExists = (db: Database.Database): boolean => {
  try {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM stops');
    const row = stmt.get() as { count: number };
    return row.count > 0;
  } catch {
    return false;
  }
};

// CSV loading functions
const loadStops = async (
  logger: ILogger,
  gtfsDataPath: string,
  db: Database.Database
): Promise<void> => {
  const stopsPath = join(gtfsDataPath, 'stops.txt');
  logger.info('Loading stops.txt', { path: stopsPath });

  const csv = readFileSync(stopsPath, 'utf-8');
  const lines = csv.split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());

  const stopIdIdx = headers.indexOf('stop_id');
  const stopNameIdx = headers.indexOf('stop_name');
  const stopLatIdx = headers.indexOf('stop_lat');
  const stopLonIdx = headers.indexOf('stop_lon');

  const insert = db.prepare(`
    INSERT OR IGNORE INTO stops (stop_id, stop_name, stop_lat, stop_lon)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = db.transaction((stops: string[][]) => {
    for (const stop of stops) {
      insert.run(stop);
    }
  });

  const stopsData = lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const cols = line.split(',');
      return [
        cols[stopIdIdx]?.trim() || '',
        cols[stopNameIdx]?.trim() || '',
        cols[stopLatIdx]?.trim() || '',
        cols[stopLonIdx]?.trim() || '',
      ];
    })
    .filter((stop) => stop[0]);

  insertMany(stopsData);
  logger.info('Loaded stops', { count: stopsData.length });
};

const loadRoutes = async (
  logger: ILogger,
  gtfsDataPath: string,
  db: Database.Database
): Promise<void> => {
  const routesPath = join(gtfsDataPath, 'routes.txt');
  logger.info('Loading routes.txt', { path: routesPath });

  const csv = readFileSync(routesPath, 'utf-8');
  const lines = csv.split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());

  const routeIdIdx = headers.indexOf('route_id');
  const routeShortNameIdx = headers.indexOf('route_short_name');
  const routeLongNameIdx = headers.indexOf('route_long_name');
  const routeTypeIdx = headers.indexOf('route_type');

  const insert = db.prepare(`
    INSERT OR IGNORE INTO routes (route_id, route_short_name, route_long_name, route_type)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = db.transaction((routes: string[][]) => {
    for (const route of routes) {
      insert.run(route);
    }
  });

  const routesData = lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const cols = line.split(',');
      return [
        cols[routeIdIdx]?.trim() || '',
        cols[routeShortNameIdx]?.trim() || '',
        cols[routeLongNameIdx]?.trim() || '',
        cols[routeTypeIdx]?.trim() || '3',
      ];
    })
    .filter((route) => route[0]);

  insertMany(routesData);
  logger.info('Loaded routes', { count: routesData.length });
};

const loadTrips = async (
  logger: ILogger,
  gtfsDataPath: string,
  db: Database.Database
): Promise<void> => {
  const tripsPath = join(gtfsDataPath, 'trips.txt');
  logger.info('Loading trips.txt', { path: tripsPath });

  const csv = readFileSync(tripsPath, 'utf-8');
  const lines = csv.split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());

  const tripIdIdx = headers.indexOf('trip_id');
  const routeIdIdx = headers.indexOf('route_id');
  const serviceIdIdx = headers.indexOf('service_id');
  const headsignIdx = headers.indexOf('trip_headsign');

  const insert = db.prepare(`
    INSERT OR IGNORE INTO trips (trip_id, route_id, service_id, trip_headsign)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = db.transaction((trips: string[][]) => {
    for (const trip of trips) {
      insert.run(trip);
    }
  });

  const tripsData = lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const cols = line.split(',');
      return [
        cols[tripIdIdx]?.trim() || '',
        cols[routeIdIdx]?.trim() || '',
        cols[serviceIdIdx]?.trim() || '',
        cols[headsignIdx]?.trim() || '',
      ];
    })
    .filter((trip) => trip[0]);

  insertMany(tripsData);
  logger.info('Loaded trips', { count: tripsData.length });
};

const loadStopTimes = async (
  logger: ILogger,
  gtfsDataPath: string,
  db: Database.Database
): Promise<void> => {
  const stopTimesPath = join(gtfsDataPath, 'stop_times.txt');
  logger.info('Loading stop_times.txt (this may take a while...)', {
    path: stopTimesPath,
  });

  const csv = readFileSync(stopTimesPath, 'utf-8');
  const lines = csv.split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());

  const tripIdIdx = headers.indexOf('trip_id');
  const stopIdIdx = headers.indexOf('stop_id');
  const stopSeqIdx = headers.indexOf('stop_sequence');
  const arrivalIdx = headers.indexOf('arrival_time');
  const departureIdx = headers.indexOf('departure_time');

  const insert = db.prepare(`
    INSERT OR IGNORE INTO stop_times (trip_id, stop_id, stop_sequence, arrival_time, departure_time)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((stopTimes: string[][]) => {
    for (const st of stopTimes) {
      insert.run(st);
    }
  });

  // Process in batches to avoid memory issues
  const batchSize = 10000;
  let batch: string[][] = [];
  let totalProcessed = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',');
    const tripId = cols[tripIdIdx]?.trim();
    if (!tripId) continue;

    batch.push([
      tripId,
      cols[stopIdIdx]?.trim() || '',
      cols[stopSeqIdx]?.trim() || '0',
      cols[arrivalIdx]?.trim() || '',
      cols[departureIdx]?.trim() || '',
    ]);

    if (batch.length >= batchSize) {
      insertMany(batch);
      totalProcessed += batch.length;
      logger.debug('Loaded stop_times batch', { processed: totalProcessed });
      batch = [];
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    insertMany(batch);
    totalProcessed += batch.length;
  }

  logger.info('Loaded stop_times', { count: totalProcessed });
};

const loadTransfers = async (
  logger: ILogger,
  gtfsDataPath: string,
  db: Database.Database
): Promise<void> => {
  const transfersPath = join(gtfsDataPath, 'transfers.txt');

  if (!existsSync(transfersPath)) {
    logger.info('No transfers.txt found, skipping');
    return;
  }

  logger.info('Loading transfers.txt', { path: transfersPath });

  const csv = readFileSync(transfersPath, 'utf-8');
  const lines = csv.split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());

  const fromStopIdIdx = headers.indexOf('from_stop_id');
  const toStopIdIdx = headers.indexOf('to_stop_id');
  const transferTypeIdx = headers.indexOf('transfer_type');
  const minTransferTimeIdx = headers.indexOf('min_transfer_time');

  const insert = db.prepare(`
    INSERT OR IGNORE INTO transfers (from_stop_id, to_stop_id, transfer_type, min_transfer_time)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = db.transaction((transfers: string[][]) => {
    for (const transfer of transfers) {
      insert.run(transfer);
    }
  });

  const transfersData = lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const cols = line.split(',');
      return [
        cols[fromStopIdIdx]?.trim() || '',
        cols[toStopIdIdx]?.trim() || '',
        cols[transferTypeIdx]?.trim() || '0',
        cols[minTransferTimeIdx]?.trim() || '',
      ];
    })
    .filter((transfer) => transfer[0] && transfer[1]);

  insertMany(transfersData);
  logger.info('Loaded transfers', { count: transfersData.length });
};

// Query functions
const getTripStopsImpl = async (
  logger: ILogger,
  state: SqliteGtfsStaticRepositoryState,
  tripId: string
): Promise<Either.Either<Error, readonly GtfsTripStop[]>> => {
  const cached = state.tripStopsCache.get(tripId);
  if (cached) {
    logger.debug('⚡ Trip stops cache HIT', { tripId });
    return Either.right(cached);
  }

  try {
    const stmt = state.db.prepare(`
      SELECT
        st.trip_id as tripId,
        st.stop_id as stopId,
        st.stop_sequence as stopSequence,
        st.arrival_time as arrivalTime,
        st.departure_time as departureTime,
        s.stop_name as stopName
      FROM stop_times st
      LEFT JOIN stops s ON st.stop_id = s.stop_id
      WHERE st.trip_id = ?
      ORDER BY st.stop_sequence
    `);

    const rows = stmt.all(tripId) as GtfsTripStop[];
    state.tripStopsCache.set(tripId, rows);

    return Either.right(rows);
  } catch (error) {
    logger.error('Failed to get trip stops', { tripId, error });
    return Either.left(error as Error);
  }
};

const getArrivalTimeImpl = async (
  logger: ILogger,
  state: SqliteGtfsStaticRepositoryState,
  tripId: string,
  stopId: string
): Promise<Either.Either<Error, string>> => {
  const cacheKey = `${tripId}:${stopId}`;
  const cached = state.arrivalTimeCache.get(cacheKey);
  if (cached) {
    logger.debug('⚡ Arrival time cache HIT', { tripId, stopId });
    return Either.right(cached);
  }

  try {
    const stmt = state.db.prepare(`
      SELECT arrival_time
      FROM stop_times
      WHERE trip_id = ? AND stop_id = ?
    `);

    const row = stmt.get(tripId, stopId) as { arrival_time: string } | undefined;

    if (!row) {
      return Either.left(new Error(`Stop ${stopId} not found in trip ${tripId}`));
    }

    state.arrivalTimeCache.set(cacheKey, row.arrival_time);
    return Either.right(row.arrival_time);
  } catch (error) {
    logger.error('Failed to get arrival time', { tripId, stopId, error });
    return Either.left(error as Error);
  }
};

const tripGoesToStationImpl = async (
  logger: ILogger,
  state: SqliteGtfsStaticRepositoryState,
  tripId: string,
  stopId: string
): Promise<boolean> => {
  const cacheKey = `${tripId}:${stopId}`;
  const cached = state.tripStationCache.get(cacheKey);
  if (cached !== undefined) {
    logger.debug('⚡ Trip-station cache HIT', { tripId, stopId });
    return cached;
  }

  try {
    const stmt = state.db.prepare(`
      SELECT COUNT(*) as count
      FROM stop_times
      WHERE trip_id = ? AND stop_id = ?
    `);

    const row = stmt.get(tripId, stopId) as { count: number };
    const result = row.count > 0;

    state.tripStationCache.set(cacheKey, result);
    return result;
  } catch (error) {
    logger.error('Failed to check if trip goes to station', { tripId, stopId, error });
    return false;
  }
};

const getTripDestinationImpl = async (
  logger: ILogger,
  state: SqliteGtfsStaticRepositoryState,
  tripId: string
): Promise<Either.Either<Error, string>> => {
  const cached = state.tripDestinationCache.get(tripId);
  if (cached) {
    logger.debug('⚡ Trip destination cache HIT', { tripId });
    return Either.right(cached);
  }

  try {
    const stmt = state.db.prepare(`
      SELECT s.stop_name
      FROM stop_times st
      JOIN stops s ON st.stop_id = s.stop_id
      WHERE st.trip_id = ?
      ORDER BY st.stop_sequence DESC
      LIMIT 1
    `);

    const row = stmt.get(tripId) as { stop_name: string } | undefined;

    if (!row) {
      return Either.left(new Error(`No stops found for trip ${tripId}`));
    }

    state.tripDestinationCache.set(tripId, row.stop_name);
    return Either.right(row.stop_name);
  } catch (error) {
    logger.error('Failed to get trip destination', { tripId, error });
    return Either.left(error as Error);
  }
};

const getFutureStopsImpl = async (
  logger: ILogger,
  state: SqliteGtfsStaticRepositoryState,
  tripId: string,
  fromStopSequence: number
): Promise<Either.Either<Error, readonly GtfsTripStop[]>> => {
  try {
    const stmt = state.db.prepare(`
      SELECT
        st.trip_id as tripId,
        st.stop_id as stopId,
        st.stop_sequence as stopSequence,
        st.arrival_time as arrivalTime,
        st.departure_time as departureTime,
        s.stop_name as stopName
      FROM stop_times st
      LEFT JOIN stops s ON st.stop_id = s.stop_id
      WHERE st.trip_id = ? AND st.stop_sequence > ?
      ORDER BY st.stop_sequence
    `);

    const rows = stmt.all(tripId, fromStopSequence) as GtfsTripStop[];
    return Either.right(rows);
  } catch (error) {
    logger.error('Failed to get future stops', { tripId, fromStopSequence, error });
    return Either.left(error as Error);
  }
};

const getTripsByRouteImpl = async (
  logger: ILogger,
  state: SqliteGtfsStaticRepositoryState,
  routeId: string
): Promise<Either.Either<Error, readonly GtfsTrip[]>> => {
  try {
    const stmt = state.db.prepare(`
      SELECT
        trip_id as tripId,
        route_id as routeId,
        service_id as serviceId,
        trip_headsign as tripHeadsign
      FROM trips
      WHERE route_id = ?
    `);

    const rows = stmt.all(routeId) as GtfsTrip[];
    logger.debug('Got trips by route', { routeId, count: rows.length });
    return Either.right(rows);
  } catch (error) {
    logger.error('Failed to get trips by route', { routeId, error });
    return Either.left(error as Error);
  }
};

const getAllTripsImpl = async (
  logger: ILogger,
  state: SqliteGtfsStaticRepositoryState
): Promise<Either.Either<Error, readonly GtfsTrip[]>> => {
  try {
    const stmt = state.db.prepare(`
      SELECT
        trip_id as tripId,
        route_id as routeId,
        service_id as serviceId,
        trip_headsign as tripHeadsign
      FROM trips
    `);

    const rows = stmt.all() as GtfsTrip[];
    logger.info('Got all trips', { count: rows.length });
    return Either.right(rows);
  } catch (error) {
    logger.error('Failed to get all trips', { error });
    return Either.left(error as Error);
  }
};

const getAllStopsImpl = async (
  logger: ILogger,
  state: SqliteGtfsStaticRepositoryState
): Promise<
  Either.Either<Error, readonly import('../domain/IGtfsStaticRepository.js').RawGtfsStop[]>
> => {
  try {
    const stmt = state.db.prepare(`
      SELECT
        stop_id as stopId,
        stop_name as stopName,
        stop_lat as stopLat,
        stop_lon as stopLon
      FROM stops
    `);

    const rows = stmt.all() as import('../domain/IGtfsStaticRepository.js').RawGtfsStop[];
    logger.info('Got all stops from static repo', { count: rows.length });
    return Either.right(rows);
  } catch (error) {
    logger.error('Failed to get all stops', { error });
    return Either.left(error as Error);
  }
};

const getAllRoutesImpl = async (
  logger: ILogger,
  state: SqliteGtfsStaticRepositoryState
): Promise<
  Either.Either<Error, readonly import('../domain/IGtfsStaticRepository.js').RawGtfsRoute[]>
> => {
  try {
    const stmt = state.db.prepare(`
      SELECT
        route_id as routeId,
        route_short_name as routeShortName,
        route_long_name as routeLongName,
        route_type as routeType
      FROM routes
    `);

    const rows = stmt.all() as import('../domain/IGtfsStaticRepository.js').RawGtfsRoute[];
    logger.info('Got all routes from static repo', { count: rows.length });
    return Either.right(rows);
  } catch (error) {
    logger.error('Failed to get all routes', { error });
    return Either.left(error as Error);
  }
};

const getAllTransfersImpl = async (
  logger: ILogger,
  state: SqliteGtfsStaticRepositoryState
): Promise<
  Either.Either<Error, readonly import('../domain/IGtfsStaticRepository.js').RawGtfsTransfer[]>
> => {
  try {
    const stmt = state.db.prepare(`
      SELECT
        from_stop_id as fromStopId,
        to_stop_id as toStopId,
        transfer_type as transferType,
        min_transfer_time as minTransferTime
      FROM transfers
    `);

    const rows = stmt.all() as import('../domain/IGtfsStaticRepository.js').RawGtfsTransfer[];
    logger.info('Got all transfers from static repo', { count: rows.length });
    return Either.right(rows);
  } catch (error) {
    logger.info('No transfers available or error querying transfers', { error });
    return Either.right([]);
  }
};

// ============================================================================
// Legacy Class Wrapper
// ============================================================================

/**
 * SQLite-based repository for GTFS static schedule data
 * Loads CSV files into SQLite for efficient querying
 */
export class SqliteGtfsStaticRepository implements IGtfsStaticRepository {
  private readonly impl: IGtfsStaticRepository;
  private db: Database.Database;

  constructor(logger: ILogger, gtfsDataPath: string, dbPath: string = ':memory:') {
    this.impl = createSqliteGtfsStaticRepository({ logger, gtfsDataPath, dbPath });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  async initialize(): Promise<Either.Either<Error, void>> {
    return this.impl.initialize();
  }

  async getTripStops(tripId: string): Promise<Either.Either<Error, readonly GtfsTripStop[]>> {
    return this.impl.getTripStops(tripId);
  }

  async getArrivalTime(tripId: string, stopId: string): Promise<Either.Either<Error, string>> {
    return this.impl.getArrivalTime(tripId, stopId);
  }

  async tripGoesToStation(tripId: string, stopId: string): Promise<boolean> {
    return this.impl.tripGoesToStation(tripId, stopId);
  }

  async getTripDestination(tripId: string): Promise<Either.Either<Error, string>> {
    return this.impl.getTripDestination(tripId);
  }

  async getFutureStops(
    tripId: string,
    fromStopSequence: number
  ): Promise<Either.Either<Error, readonly GtfsTripStop[]>> {
    return this.impl.getFutureStops(tripId, fromStopSequence);
  }

  async getTripsByRoute(routeId: string): Promise<Either.Either<Error, readonly GtfsTrip[]>> {
    return this.impl.getTripsByRoute(routeId);
  }

  async getAllTrips(): Promise<Either.Either<Error, readonly GtfsTrip[]>> {
    return this.impl.getAllTrips();
  }

  async getStopTimesByTrip(
    tripId: string
  ): Promise<Either.Either<Error, readonly GtfsTripStop[]>> {
    return this.impl.getStopTimesByTrip(tripId);
  }

  async getAllStops(): Promise<
    Either.Either<Error, readonly import('../domain/IGtfsStaticRepository.js').RawGtfsStop[]>
  > {
    return this.impl.getAllStops();
  }

  async getAllRoutes(): Promise<
    Either.Either<Error, readonly import('../domain/IGtfsStaticRepository.js').RawGtfsRoute[]>
  > {
    return this.impl.getAllRoutes();
  }

  async getAllTransfers(): Promise<
    Either.Either<Error, readonly import('../domain/IGtfsStaticRepository.js').RawGtfsTransfer[]>
  > {
    return this.impl.getAllTransfers();
  }

  close(): void {
    this.db.close();
  }
}

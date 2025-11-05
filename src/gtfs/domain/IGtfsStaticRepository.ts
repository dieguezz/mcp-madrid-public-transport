import * as Either from 'fp-ts/lib/Either.js';
import { GtfsTripStop } from './GtfsTripStop.js';
import { GtfsTrip } from './GtfsTrip.js';

/**
 * Raw stop data from GTFS stops.txt
 */
export interface RawGtfsStop {
  stopId: string;
  stopName: string;
  stopLat: number;
  stopLon: number;
}

/**
 * Raw route data from GTFS routes.txt
 */
export interface RawGtfsRoute {
  routeId: string;
  routeShortName: string;
  routeLongName: string;
  routeType: number;
}

/**
 * Raw transfer data from GTFS transfers.txt
 */
export interface RawGtfsTransfer {
  fromStopId: string;
  toStopId: string;
  transferType: number;
  minTransferTime: number | null;
}

/**
 * Repository interface for GTFS static schedule data
 */
export interface IGtfsStaticRepository {
  /**
   * Initialize the repository (load GTFS data from files)
   */
  initialize(): Promise<Either.Either<Error, void>>;

  /**
   * Get all stops (for building RAPTOR network)
   */
  getAllStops(): Promise<Either.Either<Error, readonly RawGtfsStop[]>>;

  /**
   * Get all routes (for building RAPTOR network)
   */
  getAllRoutes(): Promise<Either.Either<Error, readonly RawGtfsRoute[]>>;

  /**
   * Get all transfers (for building RAPTOR network)
   */
  getAllTransfers(): Promise<Either.Either<Error, readonly RawGtfsTransfer[]>>;

  /**
   * Get all trips for a specific route
   */
  getTripsByRoute(routeId: string): Promise<Either.Either<Error, readonly GtfsTrip[]>>;

  /**
   * Get all trips (for building RAPTOR network)
   */
  getAllTrips(): Promise<Either.Either<Error, readonly GtfsTrip[]>>;

  /**
   * Get stop times for a specific trip (alias for getTripStops for RAPTOR compatibility)
   */
  getStopTimesByTrip(tripId: string): Promise<Either.Either<Error, readonly GtfsTripStop[]>>;

  /**
   * Get all stops for a trip in order
   */
  getTripStops(tripId: string): Promise<Either.Either<Error, readonly GtfsTripStop[]>>;

  /**
   * Get arrival time at a specific stop for a trip
   */
  getArrivalTime(tripId: string, stopId: string): Promise<Either.Either<Error, string>>;

  /**
   * Check if a trip goes to a specific station
   */
  tripGoesToStation(tripId: string, stopId: string): Promise<boolean>;

  /**
   * Get the final destination (last stop) of a trip
   */
  getTripDestination(tripId: string): Promise<Either.Either<Error, string>>;

  /**
   * Get all future stops from a given stop sequence
   */
  getFutureStops(
    tripId: string,
    fromStopSequence: number
  ): Promise<Either.Either<Error, readonly GtfsTripStop[]>>;
}

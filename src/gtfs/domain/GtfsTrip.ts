/**
 * Represents a GTFS trip
 */
export interface GtfsTrip {
  tripId: string;
  routeId: string;
  serviceId: string;
  tripHeadsign?: string;
}

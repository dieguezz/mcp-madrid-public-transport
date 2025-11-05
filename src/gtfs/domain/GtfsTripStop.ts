/**
 * Represents a stop in a GTFS trip schedule
 */
export interface GtfsTripStop {
  tripId: string;
  stopId: string;
  stopSequence: number;
  arrivalTime: string; // HH:mm:ss format
  departureTime: string; // HH:mm:ss format
  stopName?: string; // Optional, loaded from stops.txt
}

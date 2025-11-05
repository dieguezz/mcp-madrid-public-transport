// Train infrastructure exports
export { GtfsTrainRepository } from './GtfsTrainRepository.js';
export { RenfeGtfsRealtimeAdapter } from './RenfeGtfsRealtimeAdapter.js';
export {
  getRenfeGtfsRealtime,
  filterMadridVehicles,
  getVehiclesAtStop,
  extractLineFromLabel,
} from './renfe-gtfs-realtime-client.js';
export type {
  GtfsRealtimeVehicle,
  GtfsRealtimeFeed,
} from './renfe-gtfs-realtime-client.js';

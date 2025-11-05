import { Option } from '../../common/functional/index.js';
import { GtfsStop } from './GtfsStop.js';
import { GtfsRoute } from './GtfsRoute.js';
import { TransportMode } from '../../transport/shared/domain/TransportMode.js';

export interface IGtfsDataStore {
  // Stops
  getStop(stopId: string): Option.Option<GtfsStop>;
  getStopByCode(stopCode: string): Option.Option<GtfsStop>;
  findStopsByName(query: string): readonly GtfsStop[];
  findStopsByMode(mode: TransportMode): readonly GtfsStop[];
  getAllStops(): readonly GtfsStop[];

  // Routes
  getRoute(routeId: string): Option.Option<GtfsRoute>;
  findRoutesByShortName(shortName: string): readonly GtfsRoute[];
  getAllRoutes(): readonly GtfsRoute[];

  // Stats
  getStopCount(): number;
  getRouteCount(): number;
}

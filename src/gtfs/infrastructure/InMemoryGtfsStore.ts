// ============================================================================
// Types
// ============================================================================

import { Option } from '../../common/functional/index.js';
import { IGtfsDataStore } from '../domain/IGtfsDataStore.js';
import { type GtfsStop, gtfsStopGetTransportMode } from '../domain/GtfsStop.js';
import { type GtfsRoute } from '../domain/GtfsRoute.js';
import { TransportMode } from '../../transport/shared/domain/TransportMode.js';

export type InMemoryGtfsStoreDeps = Record<string, never>; // No dependencies

export type InMemoryGtfsStoreState = {
  stops: Map<string, GtfsStop>;
  stopsByCode: Map<string, GtfsStop>;
  routes: Map<string, GtfsRoute>;
};

// ============================================================================
// Factory Function
// ============================================================================

export const createInMemoryGtfsStore = (_deps: InMemoryGtfsStoreDeps = {}): IGtfsDataStore & {
  addStop: (stop: GtfsStop) => void;
  addRoute: (route: GtfsRoute) => void;
} => {
  // Private state (closure)
  const state: InMemoryGtfsStoreState = {
    stops: new Map(),
    stopsByCode: new Map(),
    routes: new Map(),
  };

  return {
    getStop: (stopId: string) => getStopImpl(state, stopId),
    getStopByCode: (stopCode: string) => getStopByCodeImpl(state, stopCode),
    findStopsByName: (query: string) => findStopsByNameImpl(state, query),
    findStopsByMode: (mode: TransportMode) => findStopsByModeImpl(state, mode),
    getAllStops: () => getAllStopsImpl(state),
    getRoute: (routeId: string) => getRouteImpl(state, routeId),
    findRoutesByShortName: (shortName: string) => findRoutesByShortNameImpl(state, shortName),
    getAllRoutes: () => getAllRoutesImpl(state),
    getStopCount: () => getStopCountImpl(state),
    getRouteCount: () => getRouteCountImpl(state),

    // Internal-only mutation methods (for loading)
    addStop: (stop: GtfsStop) => addStopImpl(state, stop),
    addRoute: (route: GtfsRoute) => addRouteImpl(state, route),
  };
};

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const addStopImpl = (state: InMemoryGtfsStoreState, stop: GtfsStop): void => {
  state.stops.set(stop.stopId, stop);
  if (stop.stopCode) {
    state.stopsByCode.set(stop.stopCode, stop);
  }
};

const addRouteImpl = (state: InMemoryGtfsStoreState, route: GtfsRoute): void => {
  state.routes.set(route.routeId, route);
};

const getStopImpl = (state: InMemoryGtfsStoreState, stopId: string): Option.Option<GtfsStop> => {
  return Option.fromNullable(state.stops.get(stopId));
};

const getStopByCodeImpl = (
  state: InMemoryGtfsStoreState,
  stopCode: string
): Option.Option<GtfsStop> => {
  return Option.fromNullable(state.stopsByCode.get(stopCode));
};

const findStopsByNameImpl = (
  state: InMemoryGtfsStoreState,
  query: string
): readonly GtfsStop[] => {
  const normalized = normalize(query);
  return Array.from(state.stops.values()).filter((stop) =>
    normalize(stop.stopName).includes(normalized)
  );
};

const findStopsByModeImpl = (
  state: InMemoryGtfsStoreState,
  mode: TransportMode
): readonly GtfsStop[] => {
  return Array.from(state.stops.values()).filter((stop) => gtfsStopGetTransportMode(stop) === mode);
};

const getAllStopsImpl = (state: InMemoryGtfsStoreState): readonly GtfsStop[] => {
  return Array.from(state.stops.values());
};

const getRouteImpl = (
  state: InMemoryGtfsStoreState,
  routeId: string
): Option.Option<GtfsRoute> => {
  return Option.fromNullable(state.routes.get(routeId));
};

const findRoutesByShortNameImpl = (
  state: InMemoryGtfsStoreState,
  shortName: string
): readonly GtfsRoute[] => {
  const normalized = normalize(shortName);
  return Array.from(state.routes.values()).filter(
    (route) => normalize(route.routeShortName) === normalized
  );
};

const getAllRoutesImpl = (state: InMemoryGtfsStoreState): readonly GtfsRoute[] => {
  return Array.from(state.routes.values());
};

const getStopCountImpl = (state: InMemoryGtfsStoreState): number => {
  return state.stops.size;
};

const getRouteCountImpl = (state: InMemoryGtfsStoreState): number => {
  return state.routes.size;
};

const normalize = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

// ============================================================================
// Legacy Class Wrapper
// ============================================================================

export class InMemoryGtfsStore implements IGtfsDataStore {
  private readonly impl: ReturnType<typeof createInMemoryGtfsStore>;

  constructor() {
    this.impl = createInMemoryGtfsStore();
  }

  addStop(stop: GtfsStop): void {
    this.impl.addStop(stop);
  }

  addRoute(route: GtfsRoute): void {
    this.impl.addRoute(route);
  }

  getStop(stopId: string): Option.Option<GtfsStop> {
    return this.impl.getStop(stopId);
  }

  getStopByCode(stopCode: string): Option.Option<GtfsStop> {
    return this.impl.getStopByCode(stopCode);
  }

  findStopsByName(query: string): readonly GtfsStop[] {
    return this.impl.findStopsByName(query);
  }

  findStopsByMode(mode: TransportMode): readonly GtfsStop[] {
    return this.impl.findStopsByMode(mode);
  }

  getAllStops(): readonly GtfsStop[] {
    return this.impl.getAllStops();
  }

  getRoute(routeId: string): Option.Option<GtfsRoute> {
    return this.impl.getRoute(routeId);
  }

  findRoutesByShortName(shortName: string): readonly GtfsRoute[] {
    return this.impl.findRoutesByShortName(shortName);
  }

  getAllRoutes(): readonly GtfsRoute[] {
    return this.impl.getAllRoutes();
  }

  getStopCount(): number {
    return this.impl.getStopCount();
  }

  getRouteCount(): number {
    return this.impl.getRouteCount();
  }
}

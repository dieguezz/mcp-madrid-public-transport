// ============================================================================
// Types
// ============================================================================

import { Option, Either } from '../../../common/functional/index.js';
import { IBusStopRepository } from '../domain/IBusStopRepository.js';
import { BusStop, createBusStop } from '../domain/BusStop.js';
import { IGtfsDataStore } from '../../../gtfs/domain/IGtfsDataStore.js';
import { GtfsStop, gtfsStopGetTransportMode, gtfsStopMatchesName } from '../../../gtfs/domain/GtfsStop.js';
import { TransportMode } from '../../shared/domain/TransportMode.js';

export type GtfsBusRepositoryDeps = {
  readonly gtfsStore: IGtfsDataStore;
};

// ============================================================================
// Factory Function
// ============================================================================

export const createGtfsBusRepository = (deps: GtfsBusRepositoryDeps): IBusStopRepository => {
  const { gtfsStore } = deps;

  return {
    findByCode: async (code: string) => findByCodeImpl(gtfsStore, code),
    findByName: async (name: string) => findByNameImpl(gtfsStore, name),
    findAll: async () => findAllImpl(gtfsStore),
  };
};

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const findByCodeImpl = (
  gtfsStore: IGtfsDataStore,
  code: string
): Promise<Option.Option<BusStop>> => {
  const gtfsStop = gtfsStore.getStop(code);

  if (Option.isNone(gtfsStop)) {
    return Promise.resolve(Option.none);
  }

  const stop = gtfsStop.value;

  if (gtfsStopGetTransportMode(stop) !== TransportMode.BUS) {
    return Promise.resolve(Option.none);
  }

  return Promise.resolve(mapGtfsStopToBusStop(stop));
};

const findByNameImpl = (
  gtfsStore: IGtfsDataStore,
  name: string
): Promise<readonly BusStop[]> => {
  const gtfsStops = gtfsStore.findStopsByMode(TransportMode.BUS);
  const matchingStops = gtfsStops.filter((stop) => gtfsStopMatchesName(stop, name));

  const busStops = matchingStops
    .map(mapGtfsStopToBusStop)
    .filter(Option.isSome)
    .map((opt) => opt.value);

  return Promise.resolve(busStops);
};

const findAllImpl = (gtfsStore: IGtfsDataStore): Promise<readonly BusStop[]> => {
  const gtfsStops = gtfsStore.findStopsByMode(TransportMode.BUS);

  const busStops = gtfsStops
    .map(mapGtfsStopToBusStop)
    .filter(Option.isSome)
    .map((opt) => opt.value);

  return Promise.resolve(busStops);
};

const mapGtfsStopToBusStop = (gtfsStop: GtfsStop): Option.Option<BusStop> => {
  // Use stopCode if available (e.g., "3000"), otherwise use stopId (e.g., "par_6_3000")
  const code = gtfsStop.stopCode || gtfsStop.stopId;

  const busStopResult = createBusStop({
    code: code,
    name: gtfsStop.stopName,
    coordinates: gtfsStop.coordinates,
    lines: extractLinesFromStop(gtfsStop.stopId),
  });

  if (Either.isLeft(busStopResult)) {
    return Option.none;
  }

  return Option.some(busStopResult.right);
};

const extractLinesFromStop = (_stopId: string): string[] => {
  // TODO: Extract lines from GTFS routes/trips data
  // For now, return empty array (lines will be populated from API response)
  return [];
};

// ============================================================================
// Legacy Class Wrapper
// ============================================================================

export class GtfsBusRepository implements IBusStopRepository {
  private readonly impl: IBusStopRepository;

  constructor(gtfsStore: IGtfsDataStore) {
    this.impl = createGtfsBusRepository({ gtfsStore });
  }

  findByCode(code: string): Promise<Option.Option<BusStop>> {
    return this.impl.findByCode(code);
  }

  findByName(name: string): Promise<readonly BusStop[]> {
    return this.impl.findByName(name);
  }

  findAll(): Promise<readonly BusStop[]> {
    return this.impl.findAll();
  }
}

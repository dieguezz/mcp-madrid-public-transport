// ============================================================================
// FUNCTIONAL GTFS METRO REPOSITORY
// Pure functional implementation of Metro repository
// ============================================================================

import { Option, Either } from '../../../common/functional/index.js';
import { IMetroStopRepository } from '../domain/IMetroStopRepository.js';
import { createMetroStop, type MetroStop } from '../domain/MetroStop.js';
import { IGtfsDataStore } from '../../../gtfs/domain/IGtfsDataStore.js';
import { type GtfsStop, gtfsStopGetTransportMode, gtfsStopMatchesName, gtfsStopGetStopId, gtfsStopGetStopName, gtfsStopGetCoordinates } from '../../../gtfs/domain/GtfsStop.js';
import { TransportMode } from '../../shared/domain/TransportMode.js';
import { MetroStationsStore } from './metro-stations-loader.js';

// ============================================================================
// Types
// ============================================================================

export type GtfsMetroRepositoryDeps = {
  readonly gtfsStore: IGtfsDataStore;
  readonly metroStationsStore: MetroStationsStore;
};

// ============================================================================
// Repository Factory
// ============================================================================

export const createGtfsMetroRepository = (
  deps: GtfsMetroRepositoryDeps
): IMetroStopRepository => {
  const { gtfsStore, metroStationsStore } = deps;

  return {
    findByCode: async (code: string): Promise<Option.Option<MetroStop>> => {
      return findStopByCode(gtfsStore, metroStationsStore, code);
    },

    findByName: async (name: string): Promise<readonly MetroStop[]> => {
      return findStopsByName(gtfsStore, metroStationsStore, name);
    },

    findAll: async (): Promise<readonly MetroStop[]> => {
      return findAllStops(gtfsStore, metroStationsStore);
    },
  };
};

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const extractGtfsId = (stopId: string): string => {
  const parts = stopId.split('_');
  return parts.length > 2 ? parts[2] : stopId;
};

const extractLinesFromStop = (
  gtfsId: string,
  metroStationsStore: MetroStationsStore
): string[] => {
  const stations = metroStationsStore.findByGtfsId(gtfsId);
  const allLines = new Set<string>();

  for (const station of stations) {
    for (const line of station.lines) {
      allLines.add(line);
    }
  }

  return Array.from(allLines);
};

const mapGtfsToMetroStop = (
  gtfsStop: GtfsStop,
  metroStationsStore: MetroStationsStore
): Either.Either<Error, MetroStop> => {
  const gtfsId = extractGtfsId(gtfsStopGetStopId(gtfsStop));
  const apiCodes = metroStationsStore.getApiCodesForGtfsId(gtfsId);

  const metroStopResult = createMetroStop({
    code: gtfsStopGetStopId(gtfsStop),
    name: gtfsStopGetStopName(gtfsStop),
    coordinates: gtfsStopGetCoordinates(gtfsStop),
    lines: extractLinesFromStop(gtfsId, metroStationsStore),
    apiCodes,
  });

  if (Either.isLeft(metroStopResult)) {
    return Either.left(new Error(`Failed to create metro stop: ${metroStopResult.left.message}`));
  }

  return metroStopResult;
};

const findStopByCode = async (
  gtfsStore: IGtfsDataStore,
  metroStationsStore: MetroStationsStore,
  code: string
): Promise<Option.Option<MetroStop>> => {
  const gtfsStop = gtfsStore.getStop(code);

  if (Option.isNone(gtfsStop)) {
    return Option.none;
  }

  const stop = gtfsStop.value;

  if (gtfsStopGetTransportMode(stop) !== TransportMode.METRO) {
    return Option.none;
  }

  const metroStopResult = mapGtfsToMetroStop(stop, metroStationsStore);

  if (Either.isLeft(metroStopResult)) {
    return Option.none;
  }

  return Option.some(metroStopResult.right);
};

const findStopsByName = async (
  gtfsStore: IGtfsDataStore,
  metroStationsStore: MetroStationsStore,
  name: string
): Promise<readonly MetroStop[]> => {
  const gtfsStops = gtfsStore.findStopsByMode(TransportMode.METRO);
  const matchingStops = gtfsStops.filter((stop) => gtfsStopMatchesName(stop, name));

  const metroStops: MetroStop[] = [];

  for (const gtfsStop of matchingStops) {
    const metroStopResult = mapGtfsToMetroStop(gtfsStop, metroStationsStore);

    if (Either.isRight(metroStopResult)) {
      metroStops.push(metroStopResult.right);
    }
  }

  return metroStops;
};

const findAllStops = async (
  gtfsStore: IGtfsDataStore,
  metroStationsStore: MetroStationsStore
): Promise<readonly MetroStop[]> => {
  const gtfsStops = gtfsStore.findStopsByMode(TransportMode.METRO);

  const metroStops: MetroStop[] = [];

  for (const gtfsStop of gtfsStops) {
    const metroStopResult = mapGtfsToMetroStop(gtfsStop, metroStationsStore);

    if (Either.isRight(metroStopResult)) {
      metroStops.push(metroStopResult.right);
    }
  }

  return metroStops;
};

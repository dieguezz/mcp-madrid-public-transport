// ============================================================================
// Types
// ============================================================================

import { Option, Either } from '../../../common/functional/index.js';
import { ITrainStationRepository } from '../domain/ITrainStationRepository.js';
import { TrainStation, createTrainStation } from '../domain/TrainStation.js';
import { IGtfsDataStore } from '../../../gtfs/domain/IGtfsDataStore.js';
import { GtfsStop, gtfsStopGetTransportMode, gtfsStopMatchesName } from '../../../gtfs/domain/GtfsStop.js';
import { TransportMode } from '../../shared/domain/TransportMode.js';

export type GtfsTrainRepositoryDeps = {
  readonly gtfsStore: IGtfsDataStore;
};

// ============================================================================
// Factory Function
// ============================================================================

export const createGtfsTrainRepository = (
  deps: GtfsTrainRepositoryDeps
): ITrainStationRepository => {
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
): Promise<Option.Option<TrainStation>> => {
  const gtfsStop = gtfsStore.getStop(code);

  if (Option.isNone(gtfsStop)) {
    return Promise.resolve(Option.none);
  }

  const stop = gtfsStop.value;

  if (gtfsStopGetTransportMode(stop) !== TransportMode.TRAIN) {
    return Promise.resolve(Option.none);
  }

  return Promise.resolve(mapGtfsStopToTrainStation(stop));
};

const findByNameImpl = (
  gtfsStore: IGtfsDataStore,
  name: string
): Promise<readonly TrainStation[]> => {
  const gtfsStops = gtfsStore.findStopsByMode(TransportMode.TRAIN);
  const matchingStops = gtfsStops.filter((stop) => gtfsStopMatchesName(stop, name));

  const trainStations = matchingStops
    .map(mapGtfsStopToTrainStation)
    .filter(Option.isSome)
    .map((opt) => opt.value);

  return Promise.resolve(trainStations);
};

const findAllImpl = (gtfsStore: IGtfsDataStore): Promise<readonly TrainStation[]> => {
  const gtfsStops = gtfsStore.findStopsByMode(TransportMode.TRAIN);

  const trainStations = gtfsStops
    .map(mapGtfsStopToTrainStation)
    .filter(Option.isSome)
    .map((opt) => opt.value);

  return Promise.resolve(trainStations);
};

const mapGtfsStopToTrainStation = (gtfsStop: GtfsStop): Option.Option<TrainStation> => {
  // Extract numeric code from stopId (e.g., "par_5_11" -> "11")
  const code = extractNumericCode(gtfsStop.stopId);

  const trainStationResult = createTrainStation({
    code,
    name: gtfsStop.stopName,
    coordinates: gtfsStop.coordinates,
    lines: extractLinesFromStop(gtfsStop.stopId),
  });

  if (Either.isLeft(trainStationResult)) {
    return Option.none;
  }

  return Option.some(trainStationResult.right);
};

const extractNumericCode = (stopId: string): string => {
  // Extract code from patterns like "par_5_11" -> "11"
  const match = stopId.match(/_(\d+)$/);
  return match ? match[1] : stopId;
};

const extractLinesFromStop = (_stopId: string): string[] => {
  // Get routes that serve this station from GTFS data
  // TODO: Extract lines from GTFS routes/trips data
  return [];
};

// ============================================================================
// Legacy Class Wrapper
// ============================================================================

export class GtfsTrainRepository implements ITrainStationRepository {
  private readonly impl: ITrainStationRepository;

  constructor(gtfsStore: IGtfsDataStore) {
    this.impl = createGtfsTrainRepository({ gtfsStore });
  }

  findByCode(code: string): Promise<Option.Option<TrainStation>> {
    return this.impl.findByCode(code);
  }

  findByName(name: string): Promise<readonly TrainStation[]> {
    return this.impl.findByName(name);
  }

  findAll(): Promise<readonly TrainStation[]> {
    return this.impl.findAll();
  }
}

import { Either } from '../../../common/functional/index.js';
import { TrainStation, trainStationMatchesName, trainStationGetCode, trainStationGetName } from './TrainStation.js';
import { TrainArrival } from './TrainArrival.js';
import { TrainLine, trainLineEquals } from './TrainLine.js';
import { createStopNotFoundError } from '../../shared/domain/transport-errors.js';
import { directionToString } from '../../shared/domain/Direction.js';
import { getSeconds } from '../../shared/domain/TimeEstimate.js';

// Pure function: Resolve train station by code or name
export const resolveTrainStation = (
  stations: readonly TrainStation[],
  query: string
): Either.Either<ReturnType<typeof createStopNotFoundError>, TrainStation> => {
  // Try exact code match first
  const byCode = stations.find((s) => trainStationGetCode(s) === query);
  if (byCode) {
    return Either.right(byCode);
  }

  // Try name match
  const byName = stations.filter((s) => trainStationMatchesName(s, query));
  if (byName.length === 1) {
    return Either.right(byName[0]);
  }

  if (byName.length > 1) {
    // Multiple matches - return the first one
    return Either.right(byName[0]);
  }

  // No matches
  const suggestions = stations
    .filter((s) => trainStationGetName(s).toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3)
    .map((s) => trainStationGetName(s));

  return Either.left(
    createStopNotFoundError(
      query,
      suggestions.length > 0 ? suggestions : []
    )
  );
};

// Pure function: Filter arrivals by line
export const filterByLine = (
  arrivals: readonly TrainArrival[],
  line: TrainLine
): readonly TrainArrival[] => {
  return arrivals.filter((arrival) => trainLineEquals(arrival.line, line));
};

// Pure function: Filter arrivals by direction
export const filterByDirection = (
  arrivals: readonly TrainArrival[],
  direction: string
): readonly TrainArrival[] => {
  const normalized = direction.toLowerCase();
  return arrivals.filter((arrival) =>
    directionToString(arrival.destination).toLowerCase().includes(normalized)
  );
};

// Pure function: Sort arrivals by time and get next N
export const calculateNextArrivals = (
  arrivals: readonly TrainArrival[],
  count: number
): readonly TrainArrival[] => {
  const sorted = [...arrivals].sort((a, b) => {
    return getSeconds(a.estimatedTime) - getSeconds(b.estimatedTime);
  });

  return sorted.slice(0, count);
};

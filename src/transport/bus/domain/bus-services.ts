import { Either } from '../../../common/functional/index.js';
import { type BusStop, busStopMatchesName, busStopGetCode, busStopGetName } from './BusStop.js';
import { type BusArrival, busArrivalGetLine, busArrivalGetDestination, busArrivalGetEstimatedTime } from './BusArrival.js';
import { type BusLine, busLineEquals } from './BusLine.js';
import { createStopNotFoundError } from '../../shared/domain/transport-errors.js';
import { getSeconds } from '../../shared/domain/TimeEstimate.js';
import { directionToString } from '../../shared/domain/Direction.js';

// Pure function: Resolve bus stop by name or code
export const resolveBusStop = (
  stops: readonly BusStop[],
  query: string
): Either.Either<ReturnType<typeof createStopNotFoundError>, BusStop> => {
  // Try exact code match first
  const byCode = stops.find((s) => busStopGetCode(s) === query);
  if (byCode) {
    return Either.right(byCode);
  }

  // Try exact name match
  const byExactName = stops.find(
    (s) => busStopGetName(s).toLowerCase() === query.toLowerCase()
  );
  if (byExactName) {
    return Either.right(byExactName);
  }

  // Try partial name match
  const byPartialName = stops.find((s) => busStopMatchesName(s, query));
  if (byPartialName) {
    return Either.right(byPartialName);
  }

  return Either.left(createStopNotFoundError(query));
};

// Pure function: Filter arrivals by line
export const filterByLine = (
  arrivals: readonly BusArrival[],
  line: BusLine
): readonly BusArrival[] => {
  return arrivals.filter((a) => busLineEquals(busArrivalGetLine(a), line));
};

// Pure function: Filter arrivals by direction
export const filterByDirection = (
  arrivals: readonly BusArrival[],
  direction: string
): readonly BusArrival[] => {
  const normalized = direction.toLowerCase();
  return arrivals.filter((a) =>
    directionToString(busArrivalGetDestination(a)).toLowerCase().includes(normalized)
  );
};

// Pure function: Get next N arrivals sorted by time
export const calculateNextArrivals = (
  arrivals: readonly BusArrival[],
  count: number = 2
): readonly BusArrival[] => {
  return [...arrivals]
    .sort((a, b) => getSeconds(busArrivalGetEstimatedTime(a)) - getSeconds(busArrivalGetEstimatedTime(b)))
    .slice(0, count);
};

import { Either, pipe } from '../../../common/functional/index.js';
import { type MetroStop, metroStopMatchesName, metroStopGetCode, metroStopGetName } from './MetroStop.js';
import { type MetroArrival, metroArrivalIsForLine, metroArrivalIsTowardsDestination, metroArrivalGetEstimatedTime } from './MetroArrival.js';
import { type MetroLine } from './MetroLine.js';
import { createStopNotFoundError } from '../../shared/domain/transport-errors.js';
import { getSeconds, isPast } from '../../shared/domain/TimeEstimate.js';

// Pure function: Resolve a metro stop from a query (code or name)
export const resolveMetroStop = (
  stops: readonly MetroStop[],
  query: string
): Either.Either<ReturnType<typeof createStopNotFoundError>, MetroStop> => {
  // First try exact code match
  const byCode = stops.find((s) => metroStopGetCode(s) === query);
  if (byCode) {
    return Either.right(byCode);
  }

  // Try exact name match
  const exactName = stops.find(
    (s) => metroStopGetName(s).toLowerCase() === query.toLowerCase()
  );
  if (exactName) {
    return Either.right(exactName);
  }

  // Try partial name match
  const partialMatches = stops.filter((s) => metroStopMatchesName(s, query));

  if (partialMatches.length === 0) {
    const suggestions = findSimilarStops(stops, query);
    return Either.left(
      createStopNotFoundError(
        query,
        suggestions.map((s) => metroStopGetName(s))
      )
    );
  }

  // Return the first match (or we could ask user to be more specific)
  return Either.right(partialMatches[0]);
};

// Pure function: Filter arrivals by line
export const filterByLine = (
  arrivals: readonly MetroArrival[],
  line: MetroLine
): readonly MetroArrival[] => {
  return arrivals.filter((arrival) => metroArrivalIsForLine(arrival, line));
};

// Pure function: Filter arrivals by direction
export const filterByDirection = (
  arrivals: readonly MetroArrival[],
  direction: string
): readonly MetroArrival[] => {
  return arrivals.filter((arrival) => metroArrivalIsTowardsDestination(arrival, direction));
};

// Pure function: Sort arrivals by time
export const sortByTime = (
  arrivals: readonly MetroArrival[]
): readonly MetroArrival[] => {
  return [...arrivals].sort(
    (a, b) => getSeconds(metroArrivalGetEstimatedTime(a)) - getSeconds(metroArrivalGetEstimatedTime(b))
  );
};

// Pure function: Take first N arrivals
export const takeFirst = (count: number) => (
  arrivals: readonly MetroArrival[]
): readonly MetroArrival[] => {
  return arrivals.slice(0, count);
};

// Pure function: Calculate next arrivals (sort + filter expired + take N)
export const calculateNextArrivals = (
  arrivals: readonly MetroArrival[],
  count: number = 2
): readonly MetroArrival[] => {
  return pipe(
    arrivals,
    (arr) => arr.filter((a) => !isPast(metroArrivalGetEstimatedTime(a))),
    sortByTime,
    takeFirst(count)
  );
};

// Helper: Find similar stops using simple string distance
const findSimilarStops = (
  stops: readonly MetroStop[],
  query: string,
  maxSuggestions: number = 3
): readonly MetroStop[] => {
  const scored = stops.map((stop) => ({
    stop,
    score: calculateSimilarity(metroStopGetName(stop), query),
  }));

  return scored
    .filter((s) => s.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions)
    .map((s) => s.stop);
};

// Simple similarity score (Dice coefficient)
const calculateSimilarity = (str1: string, str2: string): number => {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const s1 = normalize(str1);
  const s2 = normalize(str2);

  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const bigrams1 = getBigrams(s1);
  const bigrams2 = getBigrams(s2);

  const intersection = bigrams1.filter((b) => bigrams2.includes(b)).length;
  return (2 * intersection) / (bigrams1.length + bigrams2.length);
};

const getBigrams = (str: string): string[] => {
  const bigrams: string[] = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.substring(i, i + 2));
  }
  return bigrams;
};

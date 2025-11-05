import { Either } from '../../../common/functional/index.js';
import { type TimeEstimate, formatRelative } from '../../shared/domain/TimeEstimate.js';
import { type Direction, directionPartialMatch, directionToString } from '../../shared/domain/Direction.js';
import { type MetroLine, metroLineEquals, metroLineGetDisplayName } from './MetroLine.js';

// ============================================================================
// Types
// ============================================================================

export type MetroArrival = {
  readonly line: MetroLine;
  readonly destination: Direction;
  readonly estimatedTime: TimeEstimate;
  readonly platform?: string;
};

export type MetroArrivalProps = {
  readonly line: MetroLine;
  readonly destination: Direction;
  readonly estimatedTime: TimeEstimate;
  readonly platform?: string;
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createMetroArrival = (props: MetroArrivalProps): Either.Either<Error, MetroArrival> => {
  return Either.right({
    line: props.line,
    destination: props.destination,
    estimatedTime: props.estimatedTime,
    platform: props.platform,
  });
};

// ============================================================================
// Pure Functions
// ============================================================================

export const metroArrivalIsForLine = (arrival: MetroArrival, line: MetroLine): boolean =>
  metroLineEquals(arrival.line, line);

export const metroArrivalIsTowardsDestination = (arrival: MetroArrival, destination: string): boolean =>
  directionPartialMatch(arrival.destination, destination);

export const metroArrivalFormatForDisplay = (arrival: MetroArrival): string => {
  const lineName = metroLineGetDisplayName(arrival.line);
  const time = formatRelative(arrival.estimatedTime);
  const platform = arrival.platform ? ` (Platform ${arrival.platform})` : '';

  return `${lineName} → ${directionToString(arrival.destination)}: ${time}${platform}`;
};

export const metroArrivalGetLine = (arrival: MetroArrival): MetroLine => arrival.line;

export const metroArrivalGetDestination = (arrival: MetroArrival): Direction => arrival.destination;

export const metroArrivalGetEstimatedTime = (arrival: MetroArrival): TimeEstimate => arrival.estimatedTime;

export const metroArrivalGetPlatform = (arrival: MetroArrival): string | undefined => arrival.platform;

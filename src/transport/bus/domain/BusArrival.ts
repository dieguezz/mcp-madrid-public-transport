import { Either } from '../../../common/functional/index.js';
import { BusLine } from './BusLine.js';
import { Direction } from '../../shared/domain/Direction.js';
import { TimeEstimate } from '../../shared/domain/TimeEstimate.js';

// ============================================================================
// Types
// ============================================================================

export type BusArrival = {
  readonly line: BusLine;
  readonly destination: Direction;
  readonly estimatedTime: TimeEstimate;
  readonly distance?: number; // Distance in meters
};

export type BusArrivalProps = {
  readonly line: BusLine;
  readonly destination: Direction;
  readonly estimatedTime: TimeEstimate;
  readonly distance?: number;
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createBusArrival = (props: BusArrivalProps): Either.Either<Error, BusArrival> => {
  return Either.right({
    line: props.line,
    destination: props.destination,
    estimatedTime: props.estimatedTime,
    distance: props.distance,
  });
};

// ============================================================================
// Pure Functions
// ============================================================================

export const busArrivalGetLine = (arrival: BusArrival): BusLine => arrival.line;

export const busArrivalGetDestination = (arrival: BusArrival): Direction => arrival.destination;

export const busArrivalGetEstimatedTime = (arrival: BusArrival): TimeEstimate => arrival.estimatedTime;

export const busArrivalGetDistance = (arrival: BusArrival): number | undefined => arrival.distance;

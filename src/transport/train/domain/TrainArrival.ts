import { Either } from '../../../common/functional/index.js';
import { TrainLine } from './TrainLine.js';
import { Direction } from '../../shared/domain/Direction.js';
import { TimeEstimate } from '../../shared/domain/TimeEstimate.js';

// ============================================================================
// Types
// ============================================================================

export type TrainArrival = {
  readonly line: TrainLine;
  readonly destination: Direction;
  readonly estimatedTime: TimeEstimate;
  readonly platform: string;
  readonly delay?: number; // Delay in seconds
};

export type TrainArrivalProps = {
  readonly line: TrainLine;
  readonly destination: Direction;
  readonly estimatedTime: TimeEstimate;
  readonly platform: string;
  readonly delay?: number;
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createTrainArrival = (props: TrainArrivalProps): Either.Either<Error, TrainArrival> => {
  if (!props.platform || !props.platform.trim()) {
    return Either.left(new Error('Train arrival platform cannot be empty'));
  }

  return Either.right({
    line: props.line,
    destination: props.destination,
    estimatedTime: props.estimatedTime,
    platform: props.platform.trim(),
    delay: props.delay,
  });
};

// ============================================================================
// Pure Functions
// ============================================================================

export const trainArrivalHasDelay = (arrival: TrainArrival): boolean =>
  arrival.delay !== undefined && arrival.delay > 0;

export const trainArrivalGetDelayMinutes = (arrival: TrainArrival): number =>
  arrival.delay ? Math.floor(arrival.delay / 60) : 0;

export const trainArrivalGetLine = (arrival: TrainArrival): TrainLine => arrival.line;

export const trainArrivalGetDestination = (arrival: TrainArrival): Direction => arrival.destination;

export const trainArrivalGetEstimatedTime = (arrival: TrainArrival): TimeEstimate => arrival.estimatedTime;

export const trainArrivalGetPlatform = (arrival: TrainArrival): string => arrival.platform;

export const trainArrivalGetDelay = (arrival: TrainArrival): number | undefined => arrival.delay;

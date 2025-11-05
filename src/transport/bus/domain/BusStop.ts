import { Coordinates } from '../../shared/domain/Coordinates.js';
import { Either } from '../../../common/functional/index.js';

// ============================================================================
// Types
// ============================================================================

export type BusStop = {
  readonly code: string;           // EMT stop ID (e.g., "72")
  readonly name: string;
  readonly coordinates: Coordinates;
  readonly lines: readonly string[];
};

export type BusStopProps = {
  readonly code: string;
  readonly name: string;
  readonly coordinates: Coordinates;
  readonly lines: string[];
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createBusStop = (props: BusStopProps): Either.Either<Error, BusStop> => {
  if (!props.code || props.code.trim().length === 0) {
    return Either.left(new Error('Bus stop code cannot be empty'));
  }

  if (!props.name || props.name.trim().length === 0) {
    return Either.left(new Error('Bus stop name cannot be empty'));
  }

  return Either.right({
    code: props.code.trim(),
    name: props.name.trim(),
    coordinates: props.coordinates,
    lines: props.lines,
  });
};

// ============================================================================
// Pure Functions
// ============================================================================

const normalize = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export const busStopHasLine = (stop: BusStop, line: string): boolean => {
  const normalized = line.trim();
  return stop.lines.some((l) => l.trim() === normalized);
};

export const busStopMatchesName = (stop: BusStop, query: string): boolean => {
  const normalizedQuery = normalize(query);
  return normalize(stop.name).includes(normalizedQuery);
};

export const busStopGetCode = (stop: BusStop): string => stop.code;

export const busStopGetName = (stop: BusStop): string => stop.name;

export const busStopGetCoordinates = (stop: BusStop): Coordinates => stop.coordinates;

export const busStopGetLines = (stop: BusStop): readonly string[] => stop.lines;

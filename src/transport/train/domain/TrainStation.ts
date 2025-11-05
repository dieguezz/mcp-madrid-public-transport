import { Coordinates } from '../../shared/domain/Coordinates.js';
import { Either } from '../../../common/functional/index.js';

// ============================================================================
// Types
// ============================================================================

export type TrainStation = {
  readonly code: string;           // Train station code (e.g., "10100" for Atocha)
  readonly name: string;
  readonly coordinates: Coordinates;
  readonly lines: readonly string[];
};

export type TrainStationProps = {
  readonly code: string;
  readonly name: string;
  readonly coordinates: Coordinates;
  readonly lines: string[];
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createTrainStation = (props: TrainStationProps): Either.Either<Error, TrainStation> => {
  if (!props.code || props.code.trim().length === 0) {
    return Either.left(new Error('Train station code cannot be empty'));
  }

  if (!props.name || props.name.trim().length === 0) {
    return Either.left(new Error('Train station name cannot be empty'));
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

export const trainStationHasLine = (station: TrainStation, line: string): boolean => {
  const normalized = line.trim().toUpperCase();
  return station.lines.some((l) => l.trim().toUpperCase() === normalized);
};

export const trainStationMatchesName = (station: TrainStation, query: string): boolean => {
  const normalizedQuery = normalize(query);
  return normalize(station.name).includes(normalizedQuery);
};

export const trainStationGetCode = (station: TrainStation): string => station.code;

export const trainStationGetName = (station: TrainStation): string => station.name;

export const trainStationGetCoordinates = (station: TrainStation): Coordinates => station.coordinates;

export const trainStationGetLines = (station: TrainStation): readonly string[] => station.lines;

import { Coordinates } from '../../shared/domain/Coordinates.js';
import { Either } from '../../../common/functional/index.js';

// ============================================================================
// Types
// ============================================================================

export type MetroStop = {
  readonly code: string;
  readonly name: string;
  readonly coordinates: Coordinates;
  readonly lines: readonly string[];
  readonly apiCodes: readonly string[];
};

export type MetroStopProps = {
  readonly code: string;
  readonly name: string;
  readonly coordinates: Coordinates;
  readonly lines: string[];
  readonly apiCodes?: string[]; // CODIGOEMPRESA codes for Metro API
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createMetroStop = (props: MetroStopProps): Either.Either<Error, MetroStop> => {
  if (!props.code || props.code.trim().length === 0) {
    return Either.left(new Error('Metro stop code cannot be empty'));
  }

  if (!props.name || props.name.trim().length === 0) {
    return Either.left(new Error('Metro stop name cannot be empty'));
  }

  return Either.right({
    code: props.code.trim(),
    name: props.name.trim(),
    coordinates: props.coordinates,
    lines: props.lines,
    apiCodes: props.apiCodes || [],
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

export const metroStopHasLine = (stop: MetroStop, line: string): boolean => {
  const normalized = line.replace(/^L/i, '').trim();
  return stop.lines.some((l) => l.replace(/^L/i, '').trim() === normalized);
};

export const metroStopMatchesName = (stop: MetroStop, query: string): boolean => {
  const normalizedQuery = normalize(query);
  return normalize(stop.name).includes(normalizedQuery);
};

export const metroStopGetCode = (stop: MetroStop): string => stop.code;

export const metroStopGetName = (stop: MetroStop): string => stop.name;

export const metroStopGetCoordinates = (stop: MetroStop): Coordinates => stop.coordinates;

export const metroStopGetLines = (stop: MetroStop): readonly string[] => stop.lines;

export const metroStopGetApiCodes = (stop: MetroStop): readonly string[] => stop.apiCodes;

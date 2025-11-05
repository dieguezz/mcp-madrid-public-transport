import { Either } from '../../../common/functional/index.js';

// ============================================================================
// Types
// ============================================================================

export type TrainLine = {
  readonly line: string;
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createTrainLine = (line: string): Either.Either<Error, TrainLine> => {
  if (!line || !line.trim()) {
    return Either.left(new Error('Train line value cannot be empty'));
  }

  return Either.right({ line: line.trim() });
};

// ============================================================================
// Pure Functions
// ============================================================================

const normalize = (value: string): string => {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

export const trainLineGetValue = (line: TrainLine): string => line.line;

export const trainLineGetDisplayName = (line: TrainLine): string => {
  // Format as C-1, C-2, etc.
  if (line.line.toUpperCase().startsWith('C')) {
    return line.line.toUpperCase();
  }
  return `C-${line.line}`;
};

export const trainLineEquals = (a: TrainLine, b: TrainLine): boolean =>
  normalize(a.line) === normalize(b.line);

export const trainLineMatches = (line: TrainLine, query: string): boolean => {
  const normalized = normalize(query);
  return (
    normalize(line.line) === normalized ||
    normalize(trainLineGetDisplayName(line)) === normalized
  );
};

export const trainLineToString = (line: TrainLine): string => line.line;

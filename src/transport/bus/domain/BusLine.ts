import { Either } from '../../../common/functional/index.js';

// ============================================================================
// Types
// ============================================================================

export type BusLine = {
  readonly value: string;
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createBusLine = (line: string): Either.Either<Error, BusLine> => {
  if (!line || !line.trim()) {
    return Either.left(new Error('Bus line value cannot be empty'));
  }

  return Either.right({ value: line.trim() });
};

// ============================================================================
// Pure Functions
// ============================================================================

export const busLineGetValue = (line: BusLine): string => line.value;

export const busLineGetDisplayName = (line: BusLine): string => line.value;

export const busLineEquals = (a: BusLine, b: BusLine): boolean =>
  a.value === b.value;

export const busLineToString = (line: BusLine): string => line.value;

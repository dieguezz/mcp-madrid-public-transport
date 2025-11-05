import { Either } from '../../../common/functional/index.js';

// ============================================================================
// Types
// ============================================================================

export type MetroLine = {
  readonly value: string;
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a MetroLine, normalizing the line number (removes "L" prefix, trims)
 */
export const createMetroLine = (value: string): Either.Either<Error, MetroLine> => {
  if (!value || !value.trim()) {
    return Either.left(new Error('Metro line value cannot be empty'));
  }

  // Normalize line number (remove "L" prefix, trim)
  const normalized = value.trim().replace(/^L/i, '');

  return Either.right({ value: normalized });
};

// ============================================================================
// Pure Functions
// ============================================================================

export const metroLineGetValue = (line: MetroLine): string => line.value;

export const metroLineGetDisplayName = (line: MetroLine): string => `L${line.value}`;

export const metroLineMatches = (line: MetroLine, other: MetroLine | string): boolean => {
  const otherValue = typeof other === 'string' ? other : other.value;
  const normalized = otherValue.trim().replace(/^L/i, '');
  return line.value === normalized;
};

export const metroLineToString = (line: MetroLine): string => line.value;

export const metroLineEquals = (a: MetroLine, b: MetroLine): boolean =>
  a.value === b.value;

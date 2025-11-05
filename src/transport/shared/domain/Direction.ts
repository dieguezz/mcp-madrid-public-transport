// ============================================================================
// Types
// ============================================================================

export type Direction = {
  readonly value: string;
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createDirection = (value: string): Direction => ({
  value: value.trim(),
});

// ============================================================================
// Pure Functions
// ============================================================================

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();

export const directionMatches = (dir: Direction, other: Direction | string): boolean => {
  const otherValue = typeof other === 'string' ? other : other.value;
  return normalize(dir.value) === normalize(otherValue);
};

export const directionPartialMatch = (dir: Direction, query: string): boolean => {
  const normalized = normalize(query);
  return normalize(dir.value).includes(normalized);
};

export const directionToString = (dir: Direction): string => dir.value;

export const directionEquals = (a: Direction, b: Direction): boolean =>
  directionMatches(a, b);

import { Either } from '../../common/functional/index.js';

// ============================================================================
// Types
// ============================================================================

export type CacheKey = {
  readonly value: string;
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createCacheKey = (parts: string[]): Either.Either<Error, CacheKey> => {
  const normalized = parts.map((p) => p.trim()).filter((p) => p.length > 0);

  if (normalized.length === 0) {
    return Either.left(new Error('CacheKey cannot be empty'));
  }

  return Either.right({
    value: normalized.join(':'),
  });
};

export const createCacheKeyFromString = (value: string): Either.Either<Error, CacheKey> => {
  if (!value || value.trim().length === 0) {
    return Either.left(new Error('CacheKey cannot be empty'));
  }

  return Either.right({
    value: value.trim(),
  });
};

// ============================================================================
// Pure Functions
// ============================================================================

export const cacheKeyGetValue = (key: CacheKey): string => key.value;

export const cacheKeyToString = (key: CacheKey): string => key.value;

export const cacheKeyEquals = (a: CacheKey, b: CacheKey): boolean =>
  a.value === b.value;

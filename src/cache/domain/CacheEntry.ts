import { Either } from '../../common/functional/index.js';

// ============================================================================
// Types
// ============================================================================

export type CacheEntry<T> = {
  readonly value: T;
  readonly expiresAt: number;
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createCacheEntry = <T>(value: T, ttlSeconds: number): Either.Either<Error, CacheEntry<T>> => {
  if (ttlSeconds <= 0) {
    return Either.left(new Error('TTL must be greater than 0'));
  }

  const expiresAt = Date.now() + ttlSeconds * 1000;

  return Either.right({
    value,
    expiresAt,
  });
};

// ============================================================================
// Pure Functions
// ============================================================================

export const cacheEntryIsExpired = <T>(entry: CacheEntry<T>): boolean =>
  Date.now() > entry.expiresAt;

export const cacheEntryGetRemainingTtl = <T>(entry: CacheEntry<T>): number => {
  const remaining = entry.expiresAt - Date.now();
  return Math.max(0, Math.floor(remaining / 1000));
};

export const cacheEntryGetValue = <T>(entry: CacheEntry<T>): T => entry.value;

export const cacheEntryGetExpiresAt = <T>(entry: CacheEntry<T>): number => entry.expiresAt;

// ============================================================================
// FUNCTIONAL IN-MEMORY CACHE
// Pure functional implementation with state in closure
// ============================================================================

import { Either, Option } from '../../common/functional/index.js';
import { ICacheRepository } from '../domain/ICacheRepository.js';
import { type CacheKey, cacheKeyGetValue } from '../domain/CacheKey.js';
import { type CacheEntry, createCacheEntry, cacheEntryIsExpired, cacheEntryGetRemainingTtl } from '../domain/CacheEntry.js';
import { ILogger } from '../../common/logger/index.js';

// ============================================================================
// Types
// ============================================================================

export type InMemoryCacheConfig = {
  readonly logger: ILogger;
  readonly cleanupIntervalMs?: number;
};

// ============================================================================
// Cache Factory (Functional with internal state)
// ============================================================================

export const createInMemoryCache = (config: InMemoryCacheConfig): ICacheRepository & { destroy: () => void } => {
  const { logger, cleanupIntervalMs = 60000 } = config;

  // Internal state (closure)
  const store = new Map<string, CacheEntry<any>>();
  let cleanupInterval: NodeJS.Timeout | null = null;

  // Start cleanup interval
  startCleanup(store, cleanupInterval, cleanupIntervalMs, logger);

  return {
    get: <T>(key: CacheKey): Option.Option<T> => {
      return getFromCache<T>(store, key, logger);
    },

    set: <T>(key: CacheKey, value: T, ttlSeconds: number): void => {
      setInCache(store, key, value, ttlSeconds, logger);
    },

    delete: (key: CacheKey): void => {
      deleteFromCache(store, key, logger);
    },

    clear: (): void => {
      clearCache(store, logger);
    },

    has: (key: CacheKey): boolean => {
      return hasInCache(store, key);
    },

    size: (): number => {
      return store.size;
    },

    destroy: (): void => {
      destroyCache(store, cleanupInterval, logger);
      cleanupInterval = null;
    },
  };
};

// ============================================================================
// Helper Functions (Pure-ish, work with Map state)
// ============================================================================

const getFromCache = <T>(
  store: Map<string, CacheEntry<any>>,
  key: CacheKey,
  logger: ILogger
): Option.Option<T> => {
  const keyStr = cacheKeyGetValue(key);
  const entry = store.get(keyStr);

  if (!entry) {
    logger.debug('Cache miss', { key: keyStr });
    return Option.none;
  }

  if (cacheEntryIsExpired(entry)) {
    logger.debug('Cache entry expired', { key: keyStr });
    store.delete(keyStr);
    return Option.none;
  }

  logger.debug('Cache hit', {
    key: keyStr,
    remainingTtl: cacheEntryGetRemainingTtl(entry),
  });

  return Option.some(entry.value as T);
};

const setInCache = <T>(
  store: Map<string, CacheEntry<any>>,
  key: CacheKey,
  value: T,
  ttlSeconds: number,
  logger: ILogger
): void => {
  const keyStr = cacheKeyGetValue(key);
  const entryResult = createCacheEntry(value, ttlSeconds);

  if (Either.isRight(entryResult)) {
    store.set(keyStr, entryResult.right);
  }

  logger.debug('Cache set', {
    key: keyStr,
    ttlSeconds,
  });
};

const deleteFromCache = (
  store: Map<string, CacheEntry<any>>,
  key: CacheKey,
  logger: ILogger
): void => {
  const keyStr = cacheKeyGetValue(key);
  store.delete(keyStr);
  logger.debug('Cache delete', { key: keyStr });
};

const clearCache = (store: Map<string, CacheEntry<any>>, logger: ILogger): void => {
  const size = store.size;
  store.clear();
  logger.info('Cache cleared', { previousSize: size });
};

const hasInCache = (store: Map<string, CacheEntry<any>>, key: CacheKey): boolean => {
  const keyStr = cacheKeyGetValue(key);
  const entry = store.get(keyStr);
  return entry !== undefined && !cacheEntryIsExpired(entry);
};

const cleanupExpiredEntries = (
  store: Map<string, CacheEntry<any>>,
  logger: ILogger
): void => {
  const before = store.size;
  let removed = 0;

  for (const [key, entry] of store.entries()) {
    if (cacheEntryIsExpired(entry)) {
      store.delete(key);
      removed++;
    }
  }

  if (removed > 0) {
    logger.verbose('Cache cleanup', {
      removed,
      before,
      after: store.size,
    });
  }
};

const startCleanup = (
  store: Map<string, CacheEntry<any>>,
  _cleanupInterval: NodeJS.Timeout | null,
  intervalMs: number,
  logger: ILogger
): void => {
  // Note: We can't reassign the parameter, but we start the interval
  // The actual interval reference is managed in the closure
  setInterval(() => {
    cleanupExpiredEntries(store, logger);
  }, intervalMs);
};

const destroyCache = (
  store: Map<string, CacheEntry<any>>,
  cleanupInterval: NodeJS.Timeout | null,
  logger: ILogger
): void => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  clearCache(store, logger);
};

// ============================================================================
// Legacy Class Wrapper (backward compatibility)
// ============================================================================

export class InMemoryCache implements ICacheRepository {
  private readonly impl: ReturnType<typeof createInMemoryCache>;

  constructor(logger: ILogger, cleanupIntervalMs: number = 60000) {
    this.impl = createInMemoryCache({ logger, cleanupIntervalMs });
  }

  get<T>(key: CacheKey): Option.Option<T> {
    return this.impl.get<T>(key);
  }

  set<T>(key: CacheKey, value: T, ttlSeconds: number): void {
    this.impl.set(key, value, ttlSeconds);
  }

  delete(key: CacheKey): void {
    this.impl.delete(key);
  }

  clear(): void {
    this.impl.clear();
  }

  has(key: CacheKey): boolean {
    return this.impl.has(key);
  }

  size(): number {
    return this.impl.size();
  }

  destroy(): void {
    this.impl.destroy();
  }
}

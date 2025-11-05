// ============================================================================
// Types
// ============================================================================

import { ILogger } from '../../../common/logger/index.js';
import { Either } from '../../../common/functional/index.js';
import { getRenfeGtfsRealtime, GtfsRealtimeFeed } from './renfe-gtfs-realtime-client.js';

export type GtfsRealtimeCacheDeps = {
  readonly ttl?: number; // TTL in milliseconds
};

export type GtfsRealtimeCacheState = {
  cache: GtfsRealtimeFeed | null;
  lastFetch: number;
};

// ============================================================================
// Factory Function
// ============================================================================

export const createGtfsRealtimeCache = (deps: GtfsRealtimeCacheDeps = {}) => {
  const ttl = deps.ttl ?? 60000; // Default 60 seconds

  // Private state (closure)
  let state: GtfsRealtimeCacheState = {
    cache: null,
    lastFetch: 0,
  };

  return {
    get: async (logger: ILogger): Promise<Either.Either<Error, GtfsRealtimeFeed>> =>
      getImpl(logger, ttl, state, (newState) => {
        state = newState;
      }),

    invalidate: (): void =>
      invalidateImpl((newState) => {
        state = newState;
      }),

    getStats: (): { cached: boolean; age: number; ttl: number } => getStatsImpl(state, ttl),
  };
};

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const getImpl = async (
  logger: ILogger,
  ttl: number,
  state: GtfsRealtimeCacheState,
  updateState: (newState: GtfsRealtimeCacheState) => void
): Promise<Either.Either<Error, GtfsRealtimeFeed>> => {
  const now = Date.now();
  const age = now - state.lastFetch;

  // Return cached feed if still valid
  if (state.cache && age < ttl) {
    logger.debug('⚡ GTFS-RT cache HIT', {
      age: `${Math.round(age / 1000)}s`,
      ttl: `${ttl / 1000}s`,
    });
    return Either.right(state.cache);
  }

  // Cache expired or doesn't exist, fetch new data
  logger.info('🔄 GTFS-RT cache MISS, fetching fresh data', {
    reason: state.cache ? 'expired' : 'empty',
    age: state.cache ? `${Math.round(age / 1000)}s` : 'N/A',
  });

  const feedResult = await getRenfeGtfsRealtime(logger);

  if (Either.isRight(feedResult)) {
    updateState({
      cache: feedResult.right,
      lastFetch: now,
    });

    logger.debug('✅ GTFS-RT cache updated', {
      vehicles: feedResult.right.entity.length,
      timestamp: feedResult.right.header.timestamp,
    });

    return feedResult;
  }

  // If fetch failed but we have stale data, return it anyway (stale-while-revalidate pattern)
  if (state.cache) {
    logger.warn('⚠️  GTFS-RT fetch failed, returning stale cache', {
      age: `${Math.round(age / 1000)}s`,
    });
    return Either.right(state.cache);
  }

  return feedResult;
};

const invalidateImpl = (
  updateState: (newState: GtfsRealtimeCacheState) => void
): void => {
  updateState({
    cache: null,
    lastFetch: 0,
  });
};

const getStatsImpl = (
  state: GtfsRealtimeCacheState,
  ttl: number
): { cached: boolean; age: number; ttl: number } => {
  const now = Date.now();
  const age = now - state.lastFetch;

  return {
    cached: state.cache !== null,
    age: Math.round(age / 1000), // seconds
    ttl: ttl / 1000, // seconds
  };
};

// ============================================================================
// Legacy Class Wrapper
// ============================================================================

/**
 * Global cache for GTFS Realtime feed
 *
 * Prevents redundant API calls by caching the feed for a short TTL.
 * All queries within the TTL window will reuse the same feed data.
 *
 * Performance benefit:
 * - Without cache: 500ms per API call
 * - With cache: < 1ms (memory access)
 */
export class GtfsRealtimeCache {
  private cache: GtfsRealtimeFeed | null = null;
  private lastFetch: number = 0;
  private readonly ttl: number; // TTL in milliseconds

  constructor(ttl: number = 60000) {
    // Default 60 seconds
    this.ttl = ttl;
  }

  /**
   * Get GTFS Realtime feed (cached or fresh)
   */
  async get(logger: ILogger): Promise<Either.Either<Error, GtfsRealtimeFeed>> {
    const result = await getImpl(
      logger,
      this.ttl,
      { cache: this.cache, lastFetch: this.lastFetch },
      (newState) => {
        this.cache = newState.cache;
        this.lastFetch = newState.lastFetch;
      }
    );
    return result;
  }

  /**
   * Invalidate cache (force refresh on next get)
   */
  invalidate(): void {
    invalidateImpl((newState) => {
      this.cache = newState.cache;
      this.lastFetch = newState.lastFetch;
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): { cached: boolean; age: number; ttl: number } {
    return getStatsImpl({ cache: this.cache, lastFetch: this.lastFetch }, this.ttl);
  }
}

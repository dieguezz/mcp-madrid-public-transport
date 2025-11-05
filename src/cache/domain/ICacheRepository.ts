import { Option } from '../../common/functional/index.js';
import { CacheKey } from './CacheKey.js';

export interface ICacheRepository {
  get<T>(key: CacheKey): Option.Option<T>;
  set<T>(key: CacheKey, value: T, ttlSeconds: number): void;
  delete(key: CacheKey): void;
  clear(): void;
  has(key: CacheKey): boolean;
  size(): number;
}

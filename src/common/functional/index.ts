// Barrel export for all functional programming utilities
export * as Either from './Either.js';
export * as Option from './Option.js';
export * as Task from './Task.js';
export * from './pipe.js';

// Common type utilities
export type Nullable<T> = T | null | undefined;
export type NonEmptyArray<T> = [T, ...T[]];

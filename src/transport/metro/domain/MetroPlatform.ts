import { Either } from '../../../common/functional/index.js';

// ============================================================================
// Types
// ============================================================================

export type MetroPlatform = {
  readonly value: string;
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createMetroPlatform = (value: string): Either.Either<Error, MetroPlatform> => {
  if (!value || !value.trim()) {
    return Either.left(new Error('Metro platform value cannot be empty'));
  }

  return Either.right({ value: value.trim() });
};

// ============================================================================
// Pure Functions
// ============================================================================

export const metroPlatformGetValue = (platform: MetroPlatform): string =>
  platform.value;

export const metroPlatformGetDisplayName = (platform: MetroPlatform): string =>
  `Platform ${platform.value}`;

export const metroPlatformToString = (platform: MetroPlatform): string =>
  platform.value;

export const metroPlatformEquals = (a: MetroPlatform, b: MetroPlatform): boolean =>
  a.value === b.value;

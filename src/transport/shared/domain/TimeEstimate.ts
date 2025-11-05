// ============================================================================
// Types
// ============================================================================

export type TimeEstimate = {
  readonly estimatedSeconds: number;
  readonly timestamp: Date;
};

// ============================================================================
// Factory Functions
// ============================================================================

export const fromSeconds = (seconds: number): TimeEstimate => ({
  estimatedSeconds: seconds,
  timestamp: new Date(),
});

export const fromMinutes = (minutes: number): TimeEstimate => ({
  estimatedSeconds: minutes * 60,
  timestamp: new Date(),
});

export const fromAbsoluteTime = (timestamp: Date): TimeEstimate => {
  const now = new Date();
  const seconds = Math.floor((timestamp.getTime() - now.getTime()) / 1000);
  return {
    estimatedSeconds: Math.max(0, seconds),
    timestamp: now,
  };
};

// ============================================================================
// Pure Functions
// ============================================================================

export const getMinutes = (estimate: TimeEstimate): number =>
  Math.floor(estimate.estimatedSeconds / 60);

export const getSeconds = (estimate: TimeEstimate): number =>
  estimate.estimatedSeconds;

export const getAbsoluteTime = (estimate: TimeEstimate): Date =>
  new Date(estimate.timestamp.getTime() + estimate.estimatedSeconds * 1000);

export const formatRelative = (estimate: TimeEstimate): string => {
  const minutes = getMinutes(estimate);

  if (estimate.estimatedSeconds < 60) {
    return 'en menos de 1 minuto';
  }

  if (minutes < 10) {
    return `en ${minutes} minuto${minutes === 1 ? '' : 's'}`;
  }

  const absoluteTime = getAbsoluteTime(estimate);
  const hours = absoluteTime.getHours().toString().padStart(2, '0');
  const mins = absoluteTime.getMinutes().toString().padStart(2, '0');
  return `a las ${hours}:${mins}`;
};

export const formatAbsolute = (estimate: TimeEstimate): string => {
  const time = getAbsoluteTime(estimate);
  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

export const isImminent = (estimate: TimeEstimate): boolean =>
  estimate.estimatedSeconds < 60;

export const isPast = (estimate: TimeEstimate): boolean =>
  estimate.estimatedSeconds < 0;

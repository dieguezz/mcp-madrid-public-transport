// ============================================================================
// Types - Tagged Union for Transport Errors
// ============================================================================

export type StopNotFoundError = {
  readonly type: 'StopNotFoundError';
  readonly query: string;
  readonly suggestions: readonly string[];
  readonly message: string;
};

export type LineNotFoundError = {
  readonly type: 'LineNotFoundError';
  readonly line: string;
  readonly message: string;
};

export type InvalidStopCodeError = {
  readonly type: 'InvalidStopCodeError';
  readonly code: string;
  readonly message: string;
};

export type NoArrivalsFoundError = {
  readonly type: 'NoArrivalsFoundError';
  readonly stopCode: string;
  readonly message: string;
};

export type ApiNotAvailableError = {
  readonly type: 'ApiNotAvailableError';
  readonly apiName: string;
  readonly reason?: string;
  readonly message: string;
};

export type TransportError =
  | StopNotFoundError
  | LineNotFoundError
  | InvalidStopCodeError
  | NoArrivalsFoundError
  | ApiNotAvailableError;

// ============================================================================
// Factory Functions
// ============================================================================

export const createStopNotFoundError = (
  query: string,
  suggestions: readonly string[] = []
): StopNotFoundError => ({
  type: 'StopNotFoundError',
  query,
  suggestions,
  message: `Stop not found: ${query}`,
});

export const createLineNotFoundError = (line: string): LineNotFoundError => ({
  type: 'LineNotFoundError',
  line,
  message: `Line not found: ${line}`,
});

export const createInvalidStopCodeError = (code: string): InvalidStopCodeError => ({
  type: 'InvalidStopCodeError',
  code,
  message: `Invalid stop code: ${code}`,
});

export const createNoArrivalsFoundError = (stopCode: string): NoArrivalsFoundError => ({
  type: 'NoArrivalsFoundError',
  stopCode,
  message: `No arrivals found for stop: ${stopCode}`,
});

export const createApiNotAvailableError = (
  apiName: string,
  reason?: string
): ApiNotAvailableError => ({
  type: 'ApiNotAvailableError',
  apiName,
  reason,
  message: `API not available: ${apiName}${reason ? ` - ${reason}` : ''}`,
});

// ============================================================================
// Type Guards
// ============================================================================

export const isTransportError = (error: unknown): error is TransportError =>
  typeof error === 'object' &&
  error !== null &&
  'type' in error &&
  (error as any).type in {
    StopNotFoundError: true,
    LineNotFoundError: true,
    InvalidStopCodeError: true,
    NoArrivalsFoundError: true,
    ApiNotAvailableError: true,
  };

export const isStopNotFoundError = (error: unknown): error is StopNotFoundError =>
  typeof error === 'object' &&
  error !== null &&
  'type' in error &&
  (error as any).type === 'StopNotFoundError';

export const isLineNotFoundError = (error: unknown): error is LineNotFoundError =>
  typeof error === 'object' &&
  error !== null &&
  'type' in error &&
  (error as any).type === 'LineNotFoundError';

export const isInvalidStopCodeError = (error: unknown): error is InvalidStopCodeError =>
  typeof error === 'object' &&
  error !== null &&
  'type' in error &&
  (error as any).type === 'InvalidStopCodeError';

export const isNoArrivalsFoundError = (error: unknown): error is NoArrivalsFoundError =>
  typeof error === 'object' &&
  error !== null &&
  'type' in error &&
  (error as any).type === 'NoArrivalsFoundError';

export const isApiNotAvailableError = (error: unknown): error is ApiNotAvailableError =>
  typeof error === 'object' &&
  error !== null &&
  'type' in error &&
  (error as any).type === 'ApiNotAvailableError';

// ============================================================================
// Helper Functions
// ============================================================================

export const formatTransportError = (error: TransportError): string => error.message;

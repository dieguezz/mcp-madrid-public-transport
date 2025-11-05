import { Either } from '../functional/index.js';
import { HttpErrorType, isNetworkError, isTimeoutError } from './http-errors.js';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  shouldRetry?: (error: HttpErrorType) => boolean;
}

export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  shouldRetry: (error) => isNetworkError(error) || isTimeoutError(error),
};

// Exponential backoff with jitter
const calculateDelay = (attempt: number, config: RetryConfig): number => {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * config.baseDelayMs;
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Higher-order function: adds retry logic to any async function
export const withRetry = <T>(
  fn: () => Promise<Either.Either<HttpErrorType, T>>,
  config: RetryConfig = defaultRetryConfig
) => {
  return async (): Promise<Either.Either<HttpErrorType, T>> => {
    let lastError: HttpErrorType | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      const result = await fn();

      if (Either.isRight(result)) {
        return result;
      }

      lastError = result.left;

      // Don't retry if this error type shouldn't be retried
      if (config.shouldRetry && !config.shouldRetry(lastError)) {
        return result;
      }

      // Don't sleep after the last attempt
      if (attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config);
        await sleep(delay);
      }
    }

    // All retries exhausted
    return Either.left(lastError!);
  };
};

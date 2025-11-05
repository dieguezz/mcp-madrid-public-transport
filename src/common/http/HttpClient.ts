// ============================================================================
// FUNCTIONAL HTTP CLIENT
// Pure functional implementation with side-effects isolated
// ============================================================================

import { Either } from '../functional/index.js';
import { HttpError, NetworkError, TimeoutError, HttpErrorType } from './http-errors.js';
import { withRetry, RetryConfig, defaultRetryConfig } from './retry-policy.js';
import { ILogger } from '../logger/index.js';

// ============================================================================
// Types
// ============================================================================

export interface HttpClientConfig {
  readonly timeoutMs?: number;
  readonly retryConfig?: RetryConfig;
  readonly headers?: Record<string, string>;
}

export interface HttpRequest {
  readonly url: string;
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
  readonly rawBody?: string; // For cases like ADIF where the body must be pre-stringified for signature
  readonly timeoutMs?: number;
}

export type HttpClientDeps = {
  readonly logger: ILogger;
  readonly config?: HttpClientConfig;
};

export type HttpClient = {
  readonly get: <T>(
    url: string,
    headers?: Record<string, string>
  ) => Promise<Either.Either<HttpErrorType, T>>;
  readonly post: <T>(
    url: string,
    body: unknown,
    headers?: Record<string, string>
  ) => Promise<Either.Either<HttpErrorType, T>>;
  readonly request: <T>(req: HttpRequest) => Promise<Either.Either<HttpErrorType, T>>;
};

// ============================================================================
// HTTP Client Factory (Functional)
// ============================================================================

export const createHttpClient = (deps: HttpClientDeps): HttpClient => {
  const { logger, config = {} } = deps;
  const defaultTimeoutMs = config.timeoutMs ?? 10000;
  const retryConfig = config.retryConfig ?? defaultRetryConfig;
  const defaultHeaders = config.headers ?? {};

  return {
    get: async <T>(
      url: string,
      headers?: Record<string, string>
    ): Promise<Either.Either<HttpErrorType, T>> => {
      return request<T>({ url, method: 'GET', headers }, logger, defaultTimeoutMs, retryConfig, defaultHeaders);
    },

    post: async <T>(
      url: string,
      body: unknown,
      headers?: Record<string, string>
    ): Promise<Either.Either<HttpErrorType, T>> => {
      return request<T>({ url, method: 'POST', body, headers }, logger, defaultTimeoutMs, retryConfig, defaultHeaders);
    },

    request: async <T>(req: HttpRequest): Promise<Either.Either<HttpErrorType, T>> => {
      return request<T>(req, logger, defaultTimeoutMs, retryConfig, defaultHeaders);
    },
  };
};

// ============================================================================
// Helper Functions (Pure-ish, I/O necessary)
// ============================================================================

const request = async <T>(
  req: HttpRequest,
  logger: ILogger,
  defaultTimeoutMs: number,
  retryConfig: RetryConfig,
  defaultHeaders: Record<string, string>
): Promise<Either.Either<HttpErrorType, T>> => {
  const requestWithRetry = withRetry(
    () => executeRequest<T>(req, logger, defaultTimeoutMs, defaultHeaders),
    retryConfig
  );

  return requestWithRetry();
};

const executeRequest = async <T>(
  req: HttpRequest,
  logger: ILogger,
  defaultTimeoutMs: number,
  defaultHeaders: Record<string, string>
): Promise<Either.Either<HttpErrorType, T>> => {
  const startTime = Date.now();
  const timeoutMs = req.timeoutMs ?? defaultTimeoutMs;

  logger.verbose('HTTP request', {
    method: req.method ?? 'GET',
    url: req.url,
    timeoutMs,
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      ...defaultHeaders,
      ...req.headers,
    };

    if (req.body || req.rawBody) {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(req.url, {
      method: req.method ?? 'GET',
      headers,
      body: req.rawBody ?? (req.body ? JSON.stringify(req.body) : undefined),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;
    logger.verbose('HTTP response', {
      url: req.url,
      status: response.status,
      durationMs: duration,
    });

    if (!response.ok) {
      const error = new HttpError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        req.url,
        await response.text().catch(() => undefined)
      );
      return Either.left(error);
    }

    const data = await response.json();
    return Either.right(data as T);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      logger.warn('HTTP request timeout', { url: req.url, timeoutMs });
      return Either.left(
        new TimeoutError(`Request timeout after ${timeoutMs}ms`, req.url, timeoutMs)
      );
    }

    logger.error('HTTP request failed', { url: req.url, error: error.message });
    return Either.left(new NetworkError(`Network error: ${error.message}`, req.url, error));
  }
};

// ============================================================================
// Legacy Class Wrapper (backward compatibility)
// ============================================================================

export class HttpClientClass {
  private readonly impl: HttpClient;

  constructor(logger: ILogger, config: HttpClientConfig = {}) {
    this.impl = createHttpClient({ logger, config });
  }

  async get<T>(url: string, headers?: Record<string, string>): Promise<Either.Either<HttpErrorType, T>> {
    return this.impl.get<T>(url, headers);
  }

  async post<T>(
    url: string,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<Either.Either<HttpErrorType, T>> {
    return this.impl.post<T>(url, body, headers);
  }

  async request<T>(req: HttpRequest): Promise<Either.Either<HttpErrorType, T>> {
    return this.impl.request<T>(req);
  }
}

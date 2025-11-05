export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly url: string,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly timeoutMs: number
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export type HttpErrorType = HttpError | NetworkError | TimeoutError;

export const isHttpError = (error: unknown): error is HttpError =>
  error instanceof HttpError;

export const isNetworkError = (error: unknown): error is NetworkError =>
  error instanceof NetworkError;

export const isTimeoutError = (error: unknown): error is TimeoutError =>
  error instanceof TimeoutError;

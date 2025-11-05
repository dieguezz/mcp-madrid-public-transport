// ============================================================================
// FUNCTIONAL COMBINED LOGGER
// Pure functional implementation with side-effects isolated
// ============================================================================

import { ILogger, LogLevel } from './ILogger.js';

// ============================================================================
// Logger Factory (Functional)
// ============================================================================

export const createCombinedLogger = (loggers: readonly ILogger[]): ILogger => ({
  error: (message: string, data?: unknown): void => {
    loggers.forEach((logger) => logger.error(message, data));
  },

  warn: (message: string, data?: unknown): void => {
    loggers.forEach((logger) => logger.warn(message, data));
  },

  info: (message: string, data?: unknown): void => {
    loggers.forEach((logger) => logger.info(message, data));
  },

  verbose: (message: string, data?: unknown): void => {
    loggers.forEach((logger) => logger.verbose(message, data));
  },

  debug: (message: string, data?: unknown): void => {
    loggers.forEach((logger) => logger.debug(message, data));
  },

  log: (level: LogLevel, message: string, data?: unknown): void => {
    loggers.forEach((logger) => logger.log(level, message, data));
  },
});

// ============================================================================
// Legacy Class Wrapper (backward compatibility)
// ============================================================================

export class CombinedLogger implements ILogger {
  private readonly impl: ILogger;

  constructor(loggers: ILogger[]) {
    this.impl = createCombinedLogger(loggers);
  }

  error(message: string, data?: unknown): void {
    this.impl.error(message, data);
  }

  warn(message: string, data?: unknown): void {
    this.impl.warn(message, data);
  }

  info(message: string, data?: unknown): void {
    this.impl.info(message, data);
  }

  verbose(message: string, data?: unknown): void {
    this.impl.verbose(message, data);
  }

  debug(message: string, data?: unknown): void {
    this.impl.debug(message, data);
  }

  log(level: LogLevel, message: string, data?: unknown): void {
    this.impl.log(level, message, data);
  }
}

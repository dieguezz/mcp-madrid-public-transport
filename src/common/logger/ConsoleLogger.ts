// ============================================================================
// FUNCTIONAL CONSOLE LOGGER
// Pure functional implementation with side-effects isolated
// ============================================================================

import { ILogger, LogEntry } from './ILogger.js';
import { LogLevel, logLevelToString, logLevelFromString } from './log-levels.js';

// ============================================================================
// Types
// ============================================================================

export type ConsoleLoggerConfig = {
  readonly enabled?: boolean;
  readonly currentLevel?: LogLevel;
};

// ============================================================================
// Logger Factory (Functional)
// ============================================================================

export const createConsoleLogger = (config: ConsoleLoggerConfig = {}): ILogger => {
  const enabled = config.enabled ?? true;
  const currentLevel = config.currentLevel ?? LogLevel.INFO;

  return {
    error: (message: string, data?: unknown): void => {
      logToConsole(LogLevel.ERROR, message, data, enabled, currentLevel);
    },

    warn: (message: string, data?: unknown): void => {
      logToConsole(LogLevel.WARN, message, data, enabled, currentLevel);
    },

    info: (message: string, data?: unknown): void => {
      logToConsole(LogLevel.INFO, message, data, enabled, currentLevel);
    },

    verbose: (message: string, data?: unknown): void => {
      logToConsole(LogLevel.VERBOSE, message, data, enabled, currentLevel);
    },

    debug: (message: string, data?: unknown): void => {
      logToConsole(LogLevel.DEBUG, message, data, enabled, currentLevel);
    },

    log: (level: LogLevel, message: string, data?: unknown): void => {
      logToConsole(level, message, data, enabled, currentLevel);
    },
  };
};

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const formatLogEntry = (level: LogLevel, message: string, data?: unknown): LogEntry => ({
  timestamp: new Date().toISOString(),
  level: logLevelToString(level),
  message,
  ...(data !== undefined && { data }),
});

const shouldLog = (level: LogLevel, enabled: boolean, currentLevel: LogLevel): boolean => {
  return enabled && level <= currentLevel;
};

const outputToConsole = (level: LogLevel, entry: LogEntry): void => {
  const formatted = JSON.stringify(entry);

  switch (level) {
    case LogLevel.ERROR:
      console.error(formatted);
      break;
    case LogLevel.WARN:
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
};

const logToConsole = (
  level: LogLevel,
  message: string,
  data: unknown | undefined,
  enabled: boolean,
  currentLevel: LogLevel
): void => {
  if (!shouldLog(level, enabled, currentLevel)) {
    return;
  }

  const entry = formatLogEntry(level, message, data);
  outputToConsole(level, entry);
};

// ============================================================================
// Legacy Class Wrapper (backward compatibility)
// ============================================================================

export class ConsoleLogger implements ILogger {
  private readonly impl: ILogger;

  constructor(enabled: boolean = true, currentLevel: LogLevel = LogLevel.INFO) {
    this.impl = createConsoleLogger({ enabled, currentLevel });
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

// ============================================================================
// Singleton (using closure for state)
// ============================================================================

let instance: ILogger | null = null;

export const getLogger = (): ILogger => {
  if (!instance) {
    const enabled = process.env.DEBUG === 'true';
    const levelStr = process.env.DEBUG_LEVEL || 'info';
    const level = logLevelFromString(levelStr);
    instance = createConsoleLogger({ enabled, currentLevel: level });
  }
  return instance;
};

export const setLogger = (logger: ILogger): void => {
  instance = logger;
};

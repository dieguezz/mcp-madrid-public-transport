// ============================================================================
// FUNCTIONAL FILE LOGGER
// Pure functional implementation with side-effects isolated
// ============================================================================

import * as fs from 'fs';
import { ILogger } from './ILogger.js';
import { LogLevel, logLevelToString } from './log-levels.js';

// ============================================================================
// Types
// ============================================================================

export type FileLoggerConfig = {
  readonly enabled: boolean;
  readonly level: LogLevel;
  readonly logFilePath?: string;
};

// ============================================================================
// Logger Factory (Functional)
// ============================================================================

export const createFileLogger = (config: FileLoggerConfig): ILogger => {
  const { enabled, level, logFilePath = './mcp-server.log' } = config;

  // Initialize log file (side-effect at creation time)
  if (enabled) {
    initializeLogFile(logFilePath);
  }

  return {
    error: (message: string, data?: unknown): void => {
      writeLog(LogLevel.ERROR, message, data, enabled, level, logFilePath);
    },

    warn: (message: string, data?: unknown): void => {
      writeLog(LogLevel.WARN, message, data, enabled, level, logFilePath);
    },

    info: (message: string, data?: unknown): void => {
      writeLog(LogLevel.INFO, message, data, enabled, level, logFilePath);
    },

    verbose: (message: string, data?: unknown): void => {
      writeLog(LogLevel.VERBOSE, message, data, enabled, level, logFilePath);
    },

    debug: (message: string, data?: unknown): void => {
      writeLog(LogLevel.DEBUG, message, data, enabled, level, logFilePath);
    },

    log: (logLevel: LogLevel, message: string, data?: unknown): void => {
      writeLog(logLevel, message, data, enabled, level, logFilePath);
    },
  };
};

// ============================================================================
// Helper Functions (Pure-ish, I/O necessary)
// ============================================================================

const initializeLogFile = (logFilePath: string): void => {
  fs.writeFileSync(logFilePath, `=== MCP Server Started at ${new Date().toISOString()} ===\n`);
};

const shouldLog = (logLevel: LogLevel, enabled: boolean, currentLevel: LogLevel): boolean => {
  if (!enabled) return false;
  return logLevel <= currentLevel;
};

const formatLogLine = (logLevel: LogLevel, message: string, data?: unknown): string => {
  const timestamp = new Date().toISOString();
  const baseEntry = {
    timestamp,
    level: logLevelToString(logLevel),
    message,
  };

  const logEntry = data ? { ...baseEntry, data } : baseEntry;

  return JSON.stringify(logEntry) + '\n';
};

const writeToFile = (logFilePath: string, logLine: string): void => {
  try {
    fs.appendFileSync(logFilePath, logLine);
  } catch (error) {
    // Fallback to console if file write fails
    console.error('Failed to write to log file:', error);
    console.log(logLine);
  }
};

const writeLog = (
  logLevel: LogLevel,
  message: string,
  data: unknown | undefined,
  enabled: boolean,
  currentLevel: LogLevel,
  logFilePath: string
): void => {
  if (!shouldLog(logLevel, enabled, currentLevel)) return;

  const logLine = formatLogLine(logLevel, message, data);
  writeToFile(logFilePath, logLine);
};

// ============================================================================
// Legacy Class Wrapper (backward compatibility)
// ============================================================================

export class FileLogger implements ILogger {
  private readonly impl: ILogger;

  constructor(enabled: boolean, level: LogLevel, logFilePath: string = './mcp-server.log') {
    this.impl = createFileLogger({ enabled, level, logFilePath });
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

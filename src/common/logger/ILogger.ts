import { LogLevel } from './log-levels.js';

export type { LogLevel };

export interface ILogger {
  error(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  verbose(message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
  log(level: LogLevel, message: string, data?: unknown): void;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: unknown;
}

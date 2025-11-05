export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  VERBOSE = 3,
  DEBUG = 4,
}

export const logLevelFromString = (level: string): LogLevel => {
  const normalized = level.toUpperCase();
  switch (normalized) {
    case 'ERROR':
      return LogLevel.ERROR;
    case 'WARN':
    case 'WARNING':
      return LogLevel.WARN;
    case 'INFO':
      return LogLevel.INFO;
    case 'VERBOSE':
      return LogLevel.VERBOSE;
    case 'DEBUG':
      return LogLevel.DEBUG;
    default:
      return LogLevel.INFO;
  }
};

export const logLevelToString = (level: LogLevel): string => {
  switch (level) {
    case LogLevel.ERROR:
      return 'ERROR';
    case LogLevel.WARN:
      return 'WARN';
    case LogLevel.INFO:
      return 'INFO';
    case LogLevel.VERBOSE:
      return 'VERBOSE';
    case LogLevel.DEBUG:
      return 'DEBUG';
  }
};

import { config } from 'dotenv';
import { logLevelFromString, LogLevel } from '../logger/log-levels.js';

// Load .env file with override flag to force loading even if env vars exist
config({ override: true });

export interface Environment {
  // Debug
  debug: boolean;
  debugLevel: LogLevel;

  // API Endpoints
  metroApiUrl: string;
  adifApiUrl: string;
  emtApiUrl: string;
  avanzaApiUrl: string;

  // EMT Credentials
  emtClientId?: string;
  emtPassKey?: string;

  // Cache TTL (in seconds)
  cacheTtlMetro: number;
  cacheTtlBus: number;
  cacheTtlTrain: number;
  cacheTtlGtfs: number;

  // GTFS data path
  gtfsDataPath: string;
}

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return defaultValue;
  }
  return value;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
};

export const environment: Environment = {
  // Debug
  debug: getEnvBoolean('DEBUG', false),
  debugLevel: logLevelFromString(getEnv('DEBUG_LEVEL', 'info')),

  // API Endpoints
  metroApiUrl: getEnv('METRO_API_URL', 'https://serviciosapp.metromadrid.es'),
  adifApiUrl: getEnv('ADIF_API_URL', 'https://circulacion.api.adif.es'),
  emtApiUrl: getEnv('EMT_API_URL', 'https://openapi.emtmadrid.es'),
  avanzaApiUrl: getEnv('AVANZA_API_URL', 'https://apisvt.avanzagrupo.com'),

  // EMT Credentials (optional for testing)
  emtClientId: process.env.EMT_CLIENT_ID,
  emtPassKey: process.env.EMT_PASS_KEY,

  // Cache TTL
  cacheTtlMetro: getEnvNumber('CACHE_TTL_METRO', 30),
  cacheTtlBus: getEnvNumber('CACHE_TTL_BUS', 10),
  cacheTtlTrain: getEnvNumber('CACHE_TTL_TRAIN', 10),
  cacheTtlGtfs: getEnvNumber('CACHE_TTL_GTFS', 86400),

  // GTFS data path
  gtfsDataPath: getEnv('GTFS_DATA_PATH', './transport-data'),
};

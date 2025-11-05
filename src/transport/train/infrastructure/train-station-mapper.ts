// ============================================================================
// Types
// ============================================================================

import { readFileSync } from 'fs';
import { ILogger } from '../../../common/logger/index.js';

export type TrainStationMapperDeps = {
  readonly csvPath: string;
};

export type TrainStationMapperState = {
  stationToGtfs: Map<string, string>; // CODIGOESTACION -> CODIGOEMPRESA
  gtfsToStation: Map<string, string>; // CODIGOEMPRESA -> CODIGOESTACION
  stationNames: Map<string, string>; // CODIGOESTACION -> DENOMINACION
};

// ============================================================================
// Factory Function
// ============================================================================

export const createTrainStationMapper = (deps: TrainStationMapperDeps) => {
  const { csvPath } = deps;

  // Private state (closure)
  const state: TrainStationMapperState = {
    stationToGtfs: new Map(),
    gtfsToStation: new Map(),
    stationNames: new Map(),
  };

  return {
    load: (logger: ILogger): void => loadImpl(csvPath, state, logger),
    toGtfsCode: (stationCode: string): string | undefined =>
      toGtfsCodeImpl(state, stationCode),
    fromGtfsCode: (gtfsCode: string): string | undefined =>
      fromGtfsCodeImpl(state, gtfsCode),
    getStationName: (stationCode: string): string | undefined =>
      getStationNameImpl(state, stationCode),
    findByName: (
      name: string
    ): Array<{ code: string; name: string; gtfsCode: string }> =>
      findByNameImpl(state, name),
    getAllMappings: (): Map<string, string> => getAllMappingsImpl(state),
    getStats: (): { totalStations: number; withGtfsCode: number; withNames: number } =>
      getStatsImpl(state),
  };
};

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const loadImpl = (
  csvPath: string,
  state: TrainStationMapperState,
  logger: ILogger
): void => {
  try {
    logger.info('Loading train station mappings', { path: csvPath });

    const csv = readFileSync(csvPath, 'utf-8');
    const lines = csv.split('\n');

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',');

      const codigoEstacion = cols[4]?.trim(); // Column 5
      const denominacion = cols[5]?.trim(); // Column 6
      const codigoEmpresa = cols[9]?.trim(); // Column 10

      if (codigoEstacion && codigoEmpresa) {
        state.stationToGtfs.set(codigoEstacion, codigoEmpresa);
        state.gtfsToStation.set(codigoEmpresa, codigoEstacion);

        if (denominacion) {
          state.stationNames.set(codigoEstacion, denominacion);
        }
      }
    }

    logger.info('Train station mappings loaded', {
      count: state.stationToGtfs.size,
    });
  } catch (error) {
    logger.error('Failed to load train station mappings', { error });
    throw error;
  }
};

const toGtfsCodeImpl = (
  state: TrainStationMapperState,
  stationCode: string
): string | undefined => {
  return state.stationToGtfs.get(stationCode);
};

const fromGtfsCodeImpl = (
  state: TrainStationMapperState,
  gtfsCode: string
): string | undefined => {
  return state.gtfsToStation.get(gtfsCode);
};

const getStationNameImpl = (
  state: TrainStationMapperState,
  stationCode: string
): string | undefined => {
  return state.stationNames.get(stationCode);
};

const findByNameImpl = (
  state: TrainStationMapperState,
  name: string
): Array<{ code: string; name: string; gtfsCode: string }> => {
  const nameLower = name.toLowerCase();
  const results: Array<{ code: string; name: string; gtfsCode: string }> = [];

  for (const [code, stationName] of state.stationNames.entries()) {
    if (stationName.toLowerCase().includes(nameLower)) {
      const gtfsCode = state.stationToGtfs.get(code);
      if (gtfsCode) {
        results.push({ code, name: stationName, gtfsCode });
      }
    }
  }

  return results;
};

const getAllMappingsImpl = (state: TrainStationMapperState): Map<string, string> => {
  return new Map(state.stationToGtfs);
};

const getStatsImpl = (state: TrainStationMapperState) => {
  return {
    totalStations: state.stationToGtfs.size,
    withGtfsCode: state.stationToGtfs.size,
    withNames: state.stationNames.size,
  };
};

// ============================================================================
// Legacy Class Wrapper
// ============================================================================

/**
 * Train Station Code Mapper
 *
 * Maps between CODIGOESTACION (user-facing codes) and CODIGOEMPRESA (GTFS-RT internal codes)
 *
 * From train_stations.csv:
 * - Column 5 (index 4): CODIGOESTACION (e.g., "11" for Atocha)
 * - Column 10 (index 9): CODIGOEMPRESA (e.g., "18000" for Atocha) <- Used in GTFS-RT feed
 */
export class TrainStationMapper {
  private stationToGtfs = new Map<string, string>(); // CODIGOESTACION -> CODIGOEMPRESA
  private gtfsToStation = new Map<string, string>(); // CODIGOEMPRESA -> CODIGOESTACION
  private stationNames = new Map<string, string>(); // CODIGOESTACION -> DENOMINACION

  constructor(private readonly csvPath: string) {}

  /**
   * Load station mappings from CSV file
   */
  load(logger: ILogger): void {
    loadImpl(
      this.csvPath,
      {
        stationToGtfs: this.stationToGtfs,
        gtfsToStation: this.gtfsToStation,
        stationNames: this.stationNames,
      },
      logger
    );
  }

  /**
   * Convert CODIGOESTACION to GTFS-RT CODIGOEMPRESA
   */
  toGtfsCode(stationCode: string): string | undefined {
    return toGtfsCodeImpl(
      {
        stationToGtfs: this.stationToGtfs,
        gtfsToStation: this.gtfsToStation,
        stationNames: this.stationNames,
      },
      stationCode
    );
  }

  /**
   * Convert GTFS-RT CODIGOEMPRESA to CODIGOESTACION
   */
  fromGtfsCode(gtfsCode: string): string | undefined {
    return fromGtfsCodeImpl(
      {
        stationToGtfs: this.stationToGtfs,
        gtfsToStation: this.gtfsToStation,
        stationNames: this.stationNames,
      },
      gtfsCode
    );
  }

  /**
   * Get station name by CODIGOESTACION
   */
  getStationName(stationCode: string): string | undefined {
    return getStationNameImpl(
      {
        stationToGtfs: this.stationToGtfs,
        gtfsToStation: this.gtfsToStation,
        stationNames: this.stationNames,
      },
      stationCode
    );
  }

  /**
   * Find station by name (case-insensitive partial match)
   */
  findByName(name: string): Array<{ code: string; name: string; gtfsCode: string }> {
    return findByNameImpl(
      {
        stationToGtfs: this.stationToGtfs,
        gtfsToStation: this.gtfsToStation,
        stationNames: this.stationNames,
      },
      name
    );
  }

  /**
   * Get all mappings
   */
  getAllMappings(): Map<string, string> {
    return getAllMappingsImpl({
      stationToGtfs: this.stationToGtfs,
      gtfsToStation: this.gtfsToStation,
      stationNames: this.stationNames,
    });
  }

  /**
   * Get statistics
   */
  getStats(): { totalStations: number; withGtfsCode: number; withNames: number } {
    return getStatsImpl({
      stationToGtfs: this.stationToGtfs,
      gtfsToStation: this.gtfsToStation,
      stationNames: this.stationNames,
    });
  }
}

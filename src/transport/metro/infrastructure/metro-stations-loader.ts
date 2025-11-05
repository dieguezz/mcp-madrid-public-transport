import { parse } from 'csv-parse/sync';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Either } from '../../../common/functional/index.js';

// Metro station data from CSV
export interface MetroStationData {
  gtfsStopId: string;        // CODIGOESTACION (e.g., "153")
  name: string;              // DENOMINACION (e.g., "ARROYOFRESNO")
  apiCode: string;           // CODIGOEMPRESA (e.g., "0722")
  lines: string[];           // LINEAS (e.g., ["7"])
  latitude: number;          // Y coordinate
  longitude: number;         // X coordinate
}

// In-memory store for metro stations
export class MetroStationsStore {
  private stationsByGtfsId: Map<string, MetroStationData[]> = new Map();
  private stationsByApiCode: Map<string, MetroStationData> = new Map();
  private stationsByName: Map<string, MetroStationData[]> = new Map();

  constructor(stations: MetroStationData[]) {
    for (const station of stations) {
      // Index by GTFS stop ID (one stop may have multiple entries for different lines)
      const gtfsStations = this.stationsByGtfsId.get(station.gtfsStopId) || [];
      gtfsStations.push(station);
      this.stationsByGtfsId.set(station.gtfsStopId, gtfsStations);

      // Index by API code (unique per platform/line)
      this.stationsByApiCode.set(station.apiCode, station);

      // Index by name (normalized)
      const normalizedName = station.name.toLowerCase().trim();
      const nameStations = this.stationsByName.get(normalizedName) || [];
      nameStations.push(station);
      this.stationsByName.set(normalizedName, nameStations);
    }
  }

  // Find station by GTFS stop ID
  findByGtfsId(gtfsId: string): MetroStationData[] {
    return this.stationsByGtfsId.get(gtfsId) || [];
  }

  // Find station by API code
  findByApiCode(apiCode: string): MetroStationData | undefined {
    return this.stationsByApiCode.get(apiCode);
  }

  // Find stations by name (case-insensitive)
  findByName(name: string): MetroStationData[] {
    const normalizedName = name.toLowerCase().trim();
    return this.stationsByName.get(normalizedName) || [];
  }

  // Get all unique API codes for a GTFS stop ID
  getApiCodesForGtfsId(gtfsId: string): string[] {
    const stations = this.findByGtfsId(gtfsId);
    return stations.map(s => s.apiCode);
  }
}

// Pure function: Parse CSV row to MetroStationData
const parseMetroStationRow = (row: any): Either.Either<Error, MetroStationData> => {
  try {
    const gtfsStopId = row.CODIGOESTACION?.trim();
    const name = row.DENOMINACION?.trim();
    const apiCode = row.CODIGOEMPRESA?.trim();
    const linesStr = row.LINEAS?.trim();
    const latitude = parseFloat(row.Y);
    const longitude = parseFloat(row.X);

    if (!gtfsStopId || !name || !apiCode) {
      return Either.left(new Error('Missing required fields'));
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return Either.left(new Error('Invalid coordinates'));
    }

    // Parse lines (comma-separated)
    const lines = linesStr ? linesStr.split(',').map((l: string) => l.trim()).filter(Boolean) : [];

    return Either.right({
      gtfsStopId,
      name,
      apiCode,
      lines,
      latitude,
      longitude,
    });
  } catch (error: any) {
    return Either.left(new Error(`Failed to parse metro station row: ${error.message}`));
  }
};

// Load metro stations CSV file
export const loadMetroStations = async (
  dataPath: string = './transport-data'
): Promise<Either.Either<Error, MetroStationsStore>> => {
  try {
    const csvPath = path.join(dataPath, 'metro', 'metro_stations.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');

    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const stations: MetroStationData[] = [];

    for (const row of rows) {
      const stationResult = parseMetroStationRow(row);
      if (Either.isRight(stationResult)) {
        stations.push(stationResult.right);
      }
    }

    if (stations.length === 0) {
      return Either.left(new Error('No valid metro stations found in CSV'));
    }

    return Either.right(new MetroStationsStore(stations));
  } catch (error: any) {
    return Either.left(new Error(`Failed to load metro stations: ${error.message}`));
  }
};

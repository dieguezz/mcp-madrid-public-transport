import { Coordinates, createCoordinates } from '../../transport/shared/domain/Coordinates.js';
import { TransportMode } from '../../transport/shared/domain/TransportMode.js';
import { Either } from '../../common/functional/index.js';

// ============================================================================
// Types
// ============================================================================

export type GtfsStop = {
  readonly stopId: string;
  readonly stopCode: string | undefined;
  readonly stopName: string;
  readonly stopDesc: string | undefined;
  readonly coordinates: Coordinates;
  readonly zoneId: string | undefined;
  readonly stopUrl: string | undefined;
  readonly locationType: number;
  readonly parentStation: string | undefined;
  readonly wheelchairBoarding: number | undefined;
  readonly platformCode: string | undefined;
};

export type GtfsStopProps = {
  readonly stopId: string;
  readonly stopCode?: string;
  readonly stopName: string;
  readonly stopDesc?: string;
  readonly stopLat: number;
  readonly stopLon: number;
  readonly zoneId?: string;
  readonly stopUrl?: string;
  readonly locationType?: number;
  readonly parentStation?: string;
  readonly wheelchairBoarding?: number;
  readonly platformCode?: string;
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createGtfsStop = (props: GtfsStopProps): Either.Either<Error, GtfsStop> => {
  if (!props.stopId || !props.stopId.trim()) {
    return Either.left(new Error('GTFS stop ID cannot be empty'));
  }

  if (!props.stopName || !props.stopName.trim()) {
    return Either.left(new Error('GTFS stop name cannot be empty'));
  }

  const coordsResult = createCoordinates(props.stopLat, props.stopLon);

  if (Either.isLeft(coordsResult)) {
    return coordsResult;
  }

  return Either.right({
    stopId: props.stopId.trim(),
    stopCode: props.stopCode?.trim(),
    stopName: props.stopName.trim(),
    stopDesc: props.stopDesc?.trim(),
    coordinates: coordsResult.right,
    zoneId: props.zoneId?.trim(),
    stopUrl: props.stopUrl?.trim(),
    locationType: props.locationType ?? 0,
    parentStation: props.parentStation?.trim(),
    wheelchairBoarding: props.wheelchairBoarding,
    platformCode: props.platformCode?.trim(),
  });
};

// ============================================================================
// Pure Functions
// ============================================================================

const normalize = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export const gtfsStopGetTransportMode = (stop: GtfsStop): TransportMode | undefined => {
  // GTFS uses stop_id patterns to identify transport types
  // par_4_* = Metro, par_6_* = Bus, par_5_* = Train
  if (stop.stopId.startsWith('par_4_')) return TransportMode.METRO;
  if (stop.stopId.startsWith('par_6_')) return TransportMode.BUS;
  if (stop.stopId.startsWith('par_5_')) return TransportMode.TRAIN;
  return undefined;
};

export const gtfsStopMatchesName = (stop: GtfsStop, query: string): boolean => {
  const normalizedQuery = normalize(query);
  return normalize(stop.stopName).includes(normalizedQuery);
};

export const gtfsStopGetStopId = (stop: GtfsStop): string => stop.stopId;

export const gtfsStopGetStopCode = (stop: GtfsStop): string | undefined => stop.stopCode;

export const gtfsStopGetStopName = (stop: GtfsStop): string => stop.stopName;

export const gtfsStopGetStopDesc = (stop: GtfsStop): string | undefined => stop.stopDesc;

export const gtfsStopGetCoordinates = (stop: GtfsStop): Coordinates => stop.coordinates;

export const gtfsStopGetZoneId = (stop: GtfsStop): string | undefined => stop.zoneId;

export const gtfsStopGetStopUrl = (stop: GtfsStop): string | undefined => stop.stopUrl;

export const gtfsStopGetLocationType = (stop: GtfsStop): number => stop.locationType;

export const gtfsStopGetParentStation = (stop: GtfsStop): string | undefined => stop.parentStation;

export const gtfsStopGetWheelchairBoarding = (stop: GtfsStop): number | undefined => stop.wheelchairBoarding;

export const gtfsStopGetPlatformCode = (stop: GtfsStop): string | undefined => stop.platformCode;

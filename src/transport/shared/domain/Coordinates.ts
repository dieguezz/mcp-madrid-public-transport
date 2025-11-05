import { Either } from '../../../common/functional/index.js';

// ============================================================================
// Types
// ============================================================================

export type Coordinates = {
  readonly latitude: number;
  readonly longitude: number;
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createCoordinates = (
  latitude: number,
  longitude: number
): Either.Either<Error, Coordinates> => {
  if (latitude < -90 || latitude > 90) {
    return Either.left(new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90.`));
  }

  if (longitude < -180 || longitude > 180) {
    return Either.left(new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180.`));
  }

  return Either.right({ latitude, longitude });
};

// ============================================================================
// Pure Functions
// ============================================================================

// Calculate distance to another coordinate in meters (Haversine formula)
export const distanceTo = (from: Coordinates, to: Coordinates): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (from.latitude * Math.PI) / 180;
  const φ2 = (to.latitude * Math.PI) / 180;
  const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
  const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const coordinatesToString = (coords: Coordinates): string =>
  `${coords.latitude},${coords.longitude}`;

export const coordinatesEquals = (a: Coordinates, b: Coordinates): boolean =>
  a.latitude === b.latitude && a.longitude === b.longitude;

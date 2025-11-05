import { Either } from '../../common/functional/index.js';

// ============================================================================
// Types
// ============================================================================

export type GtfsRoute = {
  readonly routeId: string;
  readonly agencyId: string | undefined;
  readonly routeShortName: string;
  readonly routeLongName: string;
  readonly routeDesc: string | undefined;
  readonly routeType: number;
  readonly routeUrl: string | undefined;
  readonly routeColor: string | undefined;
  readonly routeTextColor: string | undefined;
};

export type GtfsRouteProps = {
  readonly routeId: string;
  readonly agencyId?: string;
  readonly routeShortName: string;
  readonly routeLongName: string;
  readonly routeDesc?: string;
  readonly routeType: number;
  readonly routeUrl?: string;
  readonly routeColor?: string;
  readonly routeTextColor?: string;
};

// ============================================================================
// Factory Functions
// ============================================================================

export const createGtfsRoute = (props: GtfsRouteProps): Either.Either<Error, GtfsRoute> => {
  if (!props.routeId || !props.routeId.trim()) {
    return Either.left(new Error('GTFS route ID cannot be empty'));
  }

  if (!props.routeShortName || !props.routeShortName.trim()) {
    return Either.left(new Error('GTFS route short name cannot be empty'));
  }

  if (!props.routeLongName || !props.routeLongName.trim()) {
    return Either.left(new Error('GTFS route long name cannot be empty'));
  }

  if (typeof props.routeType !== 'number') {
    return Either.left(new Error('GTFS route type must be a number'));
  }

  return Either.right({
    routeId: props.routeId.trim(),
    agencyId: props.agencyId?.trim(),
    routeShortName: props.routeShortName.trim(),
    routeLongName: props.routeLongName.trim(),
    routeDesc: props.routeDesc?.trim(),
    routeType: props.routeType,
    routeUrl: props.routeUrl?.trim(),
    routeColor: props.routeColor?.trim(),
    routeTextColor: props.routeTextColor?.trim(),
  });
};

// ============================================================================
// Pure Functions
// ============================================================================

export const gtfsRouteGetDisplayName = (route: GtfsRoute): string =>
  route.routeShortName || route.routeLongName;

export const gtfsRouteGetRouteId = (route: GtfsRoute): string => route.routeId;

export const gtfsRouteGetAgencyId = (route: GtfsRoute): string | undefined => route.agencyId;

export const gtfsRouteGetRouteShortName = (route: GtfsRoute): string => route.routeShortName;

export const gtfsRouteGetRouteLongName = (route: GtfsRoute): string => route.routeLongName;

export const gtfsRouteGetRouteDesc = (route: GtfsRoute): string | undefined => route.routeDesc;

export const gtfsRouteGetRouteType = (route: GtfsRoute): number => route.routeType;

export const gtfsRouteGetRouteUrl = (route: GtfsRoute): string | undefined => route.routeUrl;

export const gtfsRouteGetRouteColor = (route: GtfsRoute): string | undefined => route.routeColor;

export const gtfsRouteGetRouteTextColor = (route: GtfsRoute): string | undefined => route.routeTextColor;

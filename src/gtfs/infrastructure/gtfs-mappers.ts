import { type GtfsStop, type GtfsStopProps, createGtfsStop } from '../domain/GtfsStop.js';
import { type GtfsRoute, type GtfsRouteProps, createGtfsRoute } from '../domain/GtfsRoute.js';
import { Either } from '../../common/functional/index.js';

// Raw CSV row types
export interface RawStopCsv {
  stop_id: string;
  stop_code?: string;
  stop_name: string;
  stop_desc?: string;
  stop_lat: string;
  stop_lon: string;
  zone_id?: string;
  stop_url?: string;
  location_type?: string;
  parent_station?: string;
  wheelchair_boarding?: string;
  platform_code?: string;
}

export interface RawRouteCsv {
  route_id: string;
  agency_id?: string;
  route_short_name: string;
  route_long_name: string;
  route_desc?: string;
  route_type: string;
  route_url?: string;
  route_color?: string;
  route_text_color?: string;
}

// Mappers
export const mapCsvToStop = (csv: RawStopCsv): Either.Either<Error, GtfsStop> => {
  const props: GtfsStopProps = {
    stopId: csv.stop_id,
    stopCode: csv.stop_code,
    stopName: csv.stop_name,
    stopDesc: csv.stop_desc,
    stopLat: parseFloat(csv.stop_lat),
    stopLon: parseFloat(csv.stop_lon),
    zoneId: csv.zone_id,
    stopUrl: csv.stop_url,
    locationType: csv.location_type ? parseInt(csv.location_type, 10) : undefined,
    parentStation: csv.parent_station,
    wheelchairBoarding: csv.wheelchair_boarding
      ? parseInt(csv.wheelchair_boarding, 10)
      : undefined,
    platformCode: csv.platform_code,
  };

  return createGtfsStop(props);
};

export const mapCsvToRoute = (csv: RawRouteCsv): Either.Either<Error, GtfsRoute> => {
  const props: GtfsRouteProps = {
    routeId: csv.route_id,
    agencyId: csv.agency_id,
    routeShortName: csv.route_short_name,
    routeLongName: csv.route_long_name,
    routeDesc: csv.route_desc,
    routeType: parseInt(csv.route_type, 10),
    routeUrl: csv.route_url,
    routeColor: csv.route_color,
    routeTextColor: csv.route_text_color,
  };

  return createGtfsRoute(props);
};

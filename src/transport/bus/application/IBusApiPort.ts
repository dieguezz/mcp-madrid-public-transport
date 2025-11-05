import { Either } from '../../../common/functional/index.js';
import { BusArrival } from '../domain/BusArrival.js';
import { BusIncident } from '../domain/BusIncident.js';
import { BusStop } from '../domain/BusStop.js';
import { HttpErrorType } from '../../../common/http/index.js';

export interface BusArrivalsResponse {
  arrivals: readonly BusArrival[];
  incidents: readonly BusIncident[];
}

export interface IBusApiPort {
  fetchArrivals(stop: BusStop): Promise<Either.Either<HttpErrorType, BusArrivalsResponse>>;
}

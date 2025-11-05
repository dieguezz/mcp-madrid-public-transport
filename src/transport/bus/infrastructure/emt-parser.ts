import { Either } from '../../../common/functional/index.js';
import { type BusArrival, createBusArrival } from '../domain/BusArrival.js';
import { type BusIncident, createBusIncident } from '../domain/BusIncident.js';
import { createBusLine } from '../domain/BusLine.js';
import { createDirection } from '../../shared/domain/Direction.js';
import { fromSeconds } from '../../shared/domain/TimeEstimate.js';
import { EmtArrivalsResponse, EmtArrival, EmtIncident } from './emt-api-types.js';

export interface ParsedEmtResponse {
  arrivals: readonly BusArrival[];
  incidents: readonly BusIncident[];
}

// Pure function: Parse EMT API response to domain objects
export const parseEmtResponse = (
  response: EmtArrivalsResponse
): Either.Either<Error, ParsedEmtResponse> => {
  try {
    if (!response.data || response.data.length === 0) {
      return Either.right({ arrivals: [], incidents: [] });
    }

    const stopData = response.data[0];

    // Parse arrivals
    const arrivals: BusArrival[] = [];
    if (stopData.Arrive && stopData.Arrive.length > 0) {
      for (const arrive of stopData.Arrive) {
        const arrivalResult = parseEmtArrival(arrive);
        if (Either.isRight(arrivalResult)) {
          arrivals.push(arrivalResult.right);
        }
      }
    }

    // Parse incidents
    const incidents: BusIncident[] = [];
    if (stopData.Incident?.ListaIncident?.data) {
      for (const incident of stopData.Incident.ListaIncident.data) {
        const incidentResult = parseEmtIncident(incident);
        if (Either.isRight(incidentResult)) {
          incidents.push(incidentResult.right);
        }
      }
    }

    return Either.right({ arrivals, incidents });
  } catch (error: any) {
    return Either.left(new Error(`Failed to parse EMT response: ${error.message}`));
  }
};

// Pure function: Parse single EMT arrival to BusArrival
const parseEmtArrival = (arrive: EmtArrival): Either.Either<Error, BusArrival> => {
  const lineResult = createBusLine(arrive.line);
  if (Either.isLeft(lineResult)) {
    return lineResult;
  }

  const arrival = createBusArrival({
    line: lineResult.right,
    destination: createDirection(arrive.destination),
    estimatedTime: fromSeconds(arrive.estimateArrive),
    distance: arrive.DistanceBus,
  });

  return arrival;
};

// Pure function: Parse single EMT incident to BusIncident
const parseEmtIncident = (incident: EmtIncident): Either.Either<Error, BusIncident> => {
  return createBusIncident({
    title: incident.title,
    description: incident.description,
    cause: incident.cause,
    effect: incident.effect,
  });
};

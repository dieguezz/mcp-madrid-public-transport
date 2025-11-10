import { Either } from '../../../common/functional/index.js';
import { type MetroArrival, createMetroArrival } from '../domain/MetroArrival.js';
import { createMetroLine } from '../domain/MetroLine.js';
import { createDirection } from '../../shared/domain/Direction.js';
import { fromMinutes } from '../../shared/domain/TimeEstimate.js';
import { MetroApiResponse, TeleindicadorResponse } from './metro-api-types.js';

// Pure function: Parse Metro API response to domain objects
export const parseMetroResponse = (
  response: MetroApiResponse
): Either.Either<Error, readonly MetroArrival[]> => {
  if (!response.Vtelindicadores || response.Vtelindicadores.length === 0) {
    return Either.right([]);
  }

  const arrivals: MetroArrival[] = [];
  const now = new Date();

  for (const tel of response.Vtelindicadores) {
    // Calculate time difference between prediction emission and now
    const emissionTime = new Date(tel.fechaHoraEmisionPrevision);
    const diffInMinutes = Math.floor((now.getTime() - emissionTime.getTime()) / (1000 * 60));

    // Parse "proximo" (next arrival)
    if (tel.proximo !== null && tel.proximo !== undefined) {
      const realMinutes = tel.proximo - diffInMinutes;
      if (realMinutes >= 0) {
        const arrivalResult = parseTeleindicador(tel, realMinutes);
        if (Either.isRight(arrivalResult)) {
          arrivals.push(arrivalResult.right);
        }
      }
    }

    // Parse "siguiente" (following arrival) if available
    if (tel.siguiente !== null && tel.siguiente !== undefined) {
      const realMinutes = tel.siguiente - diffInMinutes;
      if (realMinutes >= 0) {
        const arrivalResult = parseTeleindicador(tel, realMinutes);
        if (Either.isRight(arrivalResult)) {
          arrivals.push(arrivalResult.right);
        }
      }
    }
  }

  return Either.right(arrivals);
};

// Pure function: Parse single teleindicador to MetroArrival
const parseTeleindicador = (
  tel: TeleindicadorResponse,
  minutes: number
): Either.Either<Error, MetroArrival> => {
  const lineResult = createMetroLine(String(tel.linea));
  if (Either.isLeft(lineResult)) {
    return lineResult;
  }

  const line = lineResult.right;
  const destination = createDirection(tel.sentido);
  const estimatedTime = fromMinutes(minutes);

  const arrivalResult = createMetroArrival({
    line,
    destination,
    estimatedTime,
    platform: String(tel.anden),
  });

  return arrivalResult;
};

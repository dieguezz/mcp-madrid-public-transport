import { Either } from '../../../common/functional/index.js';
import { HttpClient, HttpErrorType } from '../../../common/http/index.js';
import { EmtArrivalsResponse } from './emt-api-types.js';

// Request body for EMT arrivals endpoint
interface EmtArrivalsRequest {
  cultureInfo: string;
  Text_StopRequired_YN: string;
  Text_EstimationsRequired_YN: string;
  Text_IncidencesRequired_YN: string;
  DateTime_Referenced_Incidencies_YYYYMMDD: string;
}

// Pure HTTP call to EMT API for arrivals
export const fetchEmtArrivals = async (
  httpClient: HttpClient,
  baseUrl: string,
  stopId: string,
  accessToken: string
): Promise<Either.Either<HttpErrorType, EmtArrivalsResponse>> => {
  const url = `${baseUrl}/v2/transport/busemtmad/stops/${stopId}/arrives/`;

  // Get current date in YYYYMMDD format
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

  const body: EmtArrivalsRequest = {
    cultureInfo: 'ES',
    Text_StopRequired_YN: 'Y',
    Text_EstimationsRequired_YN: 'Y',
    Text_IncidencesRequired_YN: 'Y',
    DateTime_Referenced_Incidencies_YYYYMMDD: dateStr,
  };

  return httpClient.post<EmtArrivalsResponse>(url, body, {
    'Content-Type': 'application/json',
    accessToken,
  });
};

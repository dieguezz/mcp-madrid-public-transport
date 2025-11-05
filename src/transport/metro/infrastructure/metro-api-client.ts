import { Either } from '../../../common/functional/index.js';
import { HttpClient, HttpErrorType } from '../../../common/http/index.js';
import { MetroApiResponse } from './metro-api-types.js';

// Pure HTTP call to Metro API
export const fetchMetroApiData = async (
  httpClient: HttpClient,
  baseUrl: string,
  stopCode: string
): Promise<Either.Either<HttpErrorType, MetroApiResponse>> => {
  const url = `${baseUrl}/servicios/rest/teleindicadores/${stopCode}`;

  return httpClient.get<MetroApiResponse>(url, {
    Accept: 'application/json',
  });
};

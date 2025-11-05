// ============================================================================
// Types
// ============================================================================

import { Either } from '../../../common/functional/index.js';
import { IMetroApiPort } from '../application/IMetroApiPort.js';
import { MetroArrival } from '../domain/MetroArrival.js';
import { MetroStop } from '../domain/MetroStop.js';
import { HttpClient, HttpErrorType } from '../../../common/http/index.js';
import { ILogger } from '../../../common/logger/index.js';
import { fetchMetroApiData } from './metro-api-client.js';
import { parseMetroResponse } from './metro-parser.js';

export type MetroApiAdapterDeps = {
  readonly httpClient: HttpClient;
  readonly logger: ILogger;
  readonly baseUrl: string;
};

// ============================================================================
// Factory Function
// ============================================================================

export const createMetroApiAdapter = (deps: MetroApiAdapterDeps): IMetroApiPort => {
  const { httpClient, logger, baseUrl } = deps;

  return {
    fetchArrivals: async (stop: MetroStop) =>
      fetchArrivalsImpl(httpClient, logger, baseUrl, stop),
  };
};

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const fetchArrivalsImpl = async (
  httpClient: HttpClient,
  logger: ILogger,
  baseUrl: string,
  stop: MetroStop
): Promise<Either.Either<HttpErrorType, readonly MetroArrival[]>> => {
  logger.info('🌐 MetroApiAdapter: Fetching arrivals', {
    stopCode: stop.code,
    stopName: stop.name,
    apiCodes: stop.apiCodes,
    apiCodesCount: stop.apiCodes.length,
  });

  // Validate API codes
  if (stop.apiCodes.length === 0) {
    logger.error('❌ No API codes available for stop', {
      stopCode: stop.code,
      stopName: stop.name,
    });
    return Either.left({
      message: `No API codes available for stop ${stop.code}`,
    } as any);
  }

  // Use first API code
  const apiCode = stop.apiCodes[0];

  logger.info('📞 Calling Metro API', {
    apiCode,
    baseUrl,
    fullUrl: `${baseUrl}/servicios/rest/teleindicadores/${apiCode}`,
  });

  // Fetch from API
  const apiResult = await fetchMetroApiData(httpClient, baseUrl, apiCode);

  if (Either.isLeft(apiResult)) {
    logger.error('❌ Metro API request FAILED', {
      stopCode: stop.code,
      apiCode,
      baseUrl,
      errorType: typeof apiResult.left,
      error: JSON.stringify(apiResult.left, null, 2),
    });
    return apiResult;
  }

  logger.info('✅ Metro API response received', {
    stopCode: stop.code,
    apiCode,
    teleindicadores: apiResult.right.Vtelindicadores?.length ?? 0,
    responseKeys: Object.keys(apiResult.right),
  });

  // Parse response
  const parseResult = parseMetroResponse(apiResult.right);

  if (Either.isLeft(parseResult)) {
    logger.error('Failed to parse Metro API response', {
      stopCode: stop.code,
      apiCode,
      error: parseResult.left.message,
    });
    return Either.left({
      message: parseResult.left.message,
    } as any);
  }

  logger.verbose('Metro arrivals parsed', {
    stopCode: stop.code,
    apiCode,
    count: parseResult.right.length,
  });

  return parseResult as Either.Either<HttpErrorType, readonly MetroArrival[]>;
};

// ============================================================================
// Legacy Class Wrapper
// ============================================================================

export class MetroApiAdapter implements IMetroApiPort {
  private readonly impl: IMetroApiPort;

  constructor(httpClient: HttpClient, logger: ILogger, baseUrl: string) {
    this.impl = createMetroApiAdapter({ httpClient, logger, baseUrl });
  }

  fetchArrivals(
    stop: MetroStop
  ): Promise<Either.Either<HttpErrorType, readonly MetroArrival[]>> {
    return this.impl.fetchArrivals(stop);
  }
}

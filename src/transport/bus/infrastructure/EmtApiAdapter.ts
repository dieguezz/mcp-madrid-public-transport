// ============================================================================
// Types
// ============================================================================

import { Either } from '../../../common/functional/index.js';
import { IBusApiPort, BusArrivalsResponse } from '../application/IBusApiPort.js';
import { BusStop } from '../domain/BusStop.js';
import { HttpClient, HttpErrorType } from '../../../common/http/index.js';
import { ILogger } from '../../../common/logger/index.js';
import { EmtAuth } from './emt-auth.js';
import { fetchEmtArrivals } from './emt-api-client.js';
import { parseEmtResponse } from './emt-parser.js';

export type EmtApiAdapterDeps = {
  readonly httpClient: HttpClient;
  readonly logger: ILogger;
  readonly baseUrl: string;
  readonly emtAuth: {
    getToken: () => Promise<Either.Either<any, string>>;
  };
};

// ============================================================================
// Factory Function
// ============================================================================

export const createEmtApiAdapter = (deps: EmtApiAdapterDeps): IBusApiPort => {
  const { httpClient, logger, baseUrl, emtAuth } = deps;

  return {
    fetchArrivals: async (stop: BusStop) =>
      fetchArrivalsImpl(httpClient, logger, baseUrl, emtAuth, stop),
  };
};

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const fetchArrivalsImpl = async (
  httpClient: HttpClient,
  logger: ILogger,
  baseUrl: string,
  emtAuth: { getToken: () => Promise<Either.Either<any, string>> },
  stop: BusStop
): Promise<Either.Either<HttpErrorType, BusArrivalsResponse>> => {
  logger.info('🌐 EmtApiAdapter: Fetching arrivals', {
    stopCode: stop.code,
    stopName: stop.name,
  });

  // Get access token
  const tokenResult = await emtAuth.getToken();
  if (Either.isLeft(tokenResult)) {
    logger.error('❌ Failed to get EMT access token', {
      error: tokenResult.left,
    });
    return tokenResult;
  }

  const accessToken = tokenResult.right;

  logger.info('📞 Calling EMT API', {
    stopCode: stop.code,
    baseUrl,
    fullUrl: `${baseUrl}/v2/transport/busemtmad/stops/${stop.code}/arrives/`,
  });

  // Fetch from API
  const apiResult = await fetchEmtArrivals(httpClient, baseUrl, stop.code, accessToken);

  if (Either.isLeft(apiResult)) {
    logger.error('❌ EMT API request FAILED', {
      stopCode: stop.code,
      baseUrl,
      errorType: typeof apiResult.left,
      error: JSON.stringify(apiResult.left, null, 2),
    });
    return apiResult;
  }

  logger.info('✅ EMT API response received', {
    stopCode: stop.code,
    dataLength: apiResult.right.data?.length ?? 0,
    responseKeys: Object.keys(apiResult.right),
  });

  // Parse response
  const parseResult = parseEmtResponse(apiResult.right);

  if (Either.isLeft(parseResult)) {
    logger.error('Failed to parse EMT API response', {
      stopCode: stop.code,
      error: parseResult.left.message,
    });
    return Either.left({
      message: parseResult.left.message,
    } as any);
  }

  const { arrivals, incidents } = parseResult.right;

  logger.verbose('EMT arrivals parsed', {
    stopCode: stop.code,
    arrivalsCount: arrivals.length,
    incidentsCount: incidents.length,
  });

  return Either.right({ arrivals, incidents });
};

// ============================================================================
// Legacy Class Wrapper
// ============================================================================

export class EmtApiAdapter implements IBusApiPort {
  private readonly impl: IBusApiPort;

  constructor(
    httpClient: HttpClient,
    logger: ILogger,
    baseUrl: string,
    emtAuth: EmtAuth
  ) {
    this.impl = createEmtApiAdapter({ httpClient, logger, baseUrl, emtAuth });
  }

  fetchArrivals(stop: BusStop): Promise<Either.Either<HttpErrorType, BusArrivalsResponse>> {
    return this.impl.fetchArrivals(stop);
  }
}

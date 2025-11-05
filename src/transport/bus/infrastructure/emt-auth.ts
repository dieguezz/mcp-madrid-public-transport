// ============================================================================
// Types
// ============================================================================

import { Either } from '../../../common/functional/index.js';
import { HttpClient, HttpErrorType } from '../../../common/http/index.js';
import { EmtLoginResponse } from './emt-api-types.js';
import { ILogger } from '../../../common/logger/index.js';

export type EmtAuthDeps = {
  readonly httpClient: HttpClient;
  readonly logger: ILogger;
  readonly baseUrl: string;
  readonly clientId: string;
  readonly passKey: string;
};

export type EmtAuthState = {
  token: string | null;
  tokenExpiry: number;
};

// ============================================================================
// Factory Function
// ============================================================================

export const createEmtAuth = (deps: EmtAuthDeps) => {
  const { httpClient, logger, baseUrl, clientId, passKey } = deps;

  // Private state (closure)
  let state: EmtAuthState = {
    token: null,
    tokenExpiry: 0,
  };

  return {
    getToken: async (): Promise<Either.Either<HttpErrorType, string>> =>
      getTokenImpl(httpClient, logger, baseUrl, clientId, passKey, state, (newState) => {
        state = newState;
      }),
  };
};

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const getTokenImpl = async (
  httpClient: HttpClient,
  logger: ILogger,
  baseUrl: string,
  clientId: string,
  passKey: string,
  state: EmtAuthState,
  updateState: (newState: EmtAuthState) => void
): Promise<Either.Either<HttpErrorType, string>> => {
  // Check if token is still valid (with 5 min buffer)
  const now = Date.now() / 1000;
  if (state.token && state.tokenExpiry > now + 300) {
    logger.debug('Using cached EMT token');
    return Either.right(state.token);
  }

  // Login to get new token
  logger.info('🔐 Logging in to EMT API...', {
    baseUrl,
    clientId: clientId.substring(0, 10) + '...',
    hasPassKey: !!passKey
  });
  const loginResult = await login(httpClient, baseUrl, clientId, passKey);

  if (Either.isLeft(loginResult)) {
    logger.error('❌ EMT login failed', { error: loginResult.left });
    return loginResult;
  }

  const loginData = loginResult.right;
  logger.debug('EMT login response received', { code: loginData.code, hasData: !!loginData.data });

  // Check if response has expected structure
  if (!loginData.data || !loginData.data[0] || !loginData.data[0].accessToken) {
    logger.error('❌ EMT login response invalid structure', { response: loginData });
    return Either.left({
      statusCode: 500,
      url: `${baseUrl}/v1/mobilitylabs/user/login/`,
      message: 'Invalid login response structure',
      name: 'HttpError'
    } as any);
  }

  const newToken = loginData.data[0].accessToken;
  const newExpiry = now + loginData.data[0].tokenSecExpiration;

  // Update state
  updateState({
    token: newToken,
    tokenExpiry: newExpiry,
  });

  logger.info('✅ EMT login successful', {
    token: newToken.substring(0, 20) + '...',
    expiresIn: loginData.data[0].tokenSecExpiration,
  });

  return Either.right(newToken);
};

const login = async (
  httpClient: HttpClient,
  baseUrl: string,
  clientId: string,
  passKey: string
): Promise<Either.Either<HttpErrorType, EmtLoginResponse>> => {
  const url = `${baseUrl}/v1/mobilitylabs/user/login/`;

  return httpClient.get<EmtLoginResponse>(url, {
    'X-ClientId': clientId,
    passKey: passKey,
  });
};

// ============================================================================
// Legacy Class Wrapper
// ============================================================================

export class EmtAuth {
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly logger: ILogger,
    private readonly baseUrl: string,
    private readonly clientId: string,
    private readonly passKey: string
  ) {}

  async getToken(): Promise<Either.Either<HttpErrorType, string>> {
    const result = await getTokenImpl(
      this.httpClient,
      this.logger,
      this.baseUrl,
      this.clientId,
      this.passKey,
      { token: this.token, tokenExpiry: this.tokenExpiry },
      (newState) => {
        this.token = newState.token;
        this.tokenExpiry = newState.tokenExpiry;
      }
    );
    return result;
  }
}

// ============================================================================
// GET BUS ARRIVALS MCP TOOL (Pure Functional)
// ============================================================================

import { z } from 'zod';
import { Either } from '../../common/functional/index.js';
import { ILogger } from '../../common/logger/index.js';
import { IGtfsDataStore } from '../../gtfs/domain/IGtfsDataStore.js';
import { ICacheRepository } from '../../cache/domain/ICacheRepository.js';
import { HttpClient } from '../../common/http/index.js';
import { createEmtAuth } from '../../transport/bus/infrastructure/emt-auth.js';
import { getBusArrivals } from '../../transport/bus/application/GetBusArrivalsUseCase.js';
import { createGtfsBusRepository } from '../../transport/bus/infrastructure/GtfsBusRepository.js';
import { createEmtApiAdapter } from '../../transport/bus/infrastructure/EmtApiAdapter.js';
import { TransportError, StopNotFoundError } from '../../transport/shared/domain/transport-errors.js';

// ============================================================================
// Types
// ============================================================================

export type GetBusArrivalsToolDeps = {
  readonly gtfsStore: IGtfsDataStore;
  readonly httpClient: HttpClient;
  readonly cache: ICacheRepository;
  readonly logger: ILogger;
  readonly emtApiBaseUrl: string;
  readonly emtClientId: string;
  readonly emtPassKey: string;
  readonly cacheTtl?: number;
};

// Zod schema for input validation
export const getBusArrivalsSchema = z.object({
  stop: z.string().describe('Stop name or number (e.g., "Plaza de Castilla", "3000")'),
  line: z.string().optional().describe('Optional line number (e.g., "27", "51")'),
  direction: z.string().optional().describe('Optional direction/destination'),
  count: z.number().optional().default(2).describe('Number of arrivals to return'),
});

export type GetBusArrivalsInput = z.infer<typeof getBusArrivalsSchema>;

type ValidationError = {
  readonly message: string;
};

type ValidatedInput = {
  readonly stop: string;
  readonly line?: string;
  readonly direction?: string;
  readonly count: number;
};

type ToolResponse = {
  readonly content: Array<{
    readonly type: string;
    readonly text: string;
  }>;
  readonly isError?: boolean;
};

// ============================================================================
// Tool Factory (Pure Function)
// ============================================================================

export const createGetBusArrivalsTool = (deps: GetBusArrivalsToolDeps) => ({
  name: 'get_bus_arrivals',
  description: 'Get arrival times for buses (EMT, urban, interurban) at a stop',
  inputSchema: {
    type: 'object',
    properties: {
      stop: {
        type: 'string',
        description: 'Stop name or number (e.g., "Plaza de Castilla", "3000")',
      },
      line: {
        type: 'string',
        description: 'Optional: Line number (e.g., "27", "51")',
      },
      direction: {
        type: 'string',
        description: 'Optional: Direction/destination',
      },
      count: {
        type: 'number',
        description: 'Number of arrivals to return (default: 2, max: 10)',
        default: 2,
      },
    },
    required: ['stop'],
  },
  handler: createGetBusArrivalsHandler(deps),
});

// ============================================================================
// Handler Factory
// ============================================================================

const createGetBusArrivalsHandler =
  (deps: GetBusArrivalsToolDeps) =>
  async (args: any): Promise<ToolResponse> => {
    const { gtfsStore, httpClient, cache, logger, emtApiBaseUrl, emtClientId, emtPassKey, cacheTtl } = deps;

    logger.info('🚌 MCP tool: get_bus_arrivals STARTED', { input: args });

    // Validate input
    const validationResult = validateInput(args);
    if (Either.isLeft(validationResult)) {
      logger.error('❌ Input validation FAILED', { error: validationResult.left.message });
      return formatErrorResponse(validationResult.left);
    }

    const input = validationResult.right;
    logger.debug('✅ Input validated', { input });

    // Create dependencies
    const stopRepository = createGtfsBusRepository({ gtfsStore });
    const emtAuth = createEmtAuth({ httpClient, logger, baseUrl: emtApiBaseUrl, clientId: emtClientId, passKey: emtPassKey });
    const busApi = createEmtApiAdapter({
      httpClient,
      logger,
      baseUrl: emtApiBaseUrl,
      emtAuth,
    });

    // Create and execute use case
    const execute = getBusArrivals({
      stopRepository,
      busApi,
      cache,
      logger,
      cacheTtl: cacheTtl ?? 10,
    });

    logger.debug('📋 Executing use case with command', {
      stop: input.stop,
      line: input.line,
      direction: input.direction,
      count: input.count,
    });

    const result = await execute({
      stop: input.stop,
      line: input.line,
      direction: input.direction,
      count: input.count,
    });

    // Format response
    if (Either.isLeft(result)) {
      const error = result.left;
      logger.error('❌ Bus arrivals request FAILED', {
        error: error.message,
        errorType: error.constructor.name,
        fullError: error,
      });
      return formatErrorResponse(error);
    }

    const data = result.right;
    logger.info('✅ Bus arrivals request SUCCESS', {
      stop: data.stop,
      stopCode: data.stopCode,
      arrivalsCount: data.arrivals.length,
      hasIncidents: data.incidents && data.incidents.length > 0,
    });

    return formatSuccessResponse(data);
  };

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const validateInput = (args: any): Either.Either<ValidationError, ValidatedInput> => {
  // Validate stop
  if (!args.stop || typeof args.stop !== 'string' || args.stop.trim().length === 0) {
    return Either.left({ message: 'Invalid stop parameter: must be a non-empty string' });
  }

  // Validate line (optional)
  if (args.line !== undefined && typeof args.line !== 'string') {
    return Either.left({ message: 'Invalid line parameter: must be a string' });
  }

  // Validate direction (optional)
  if (args.direction !== undefined && typeof args.direction !== 'string') {
    return Either.left({ message: 'Invalid direction parameter: must be a string' });
  }

  // Validate count
  const count = args.count ?? 2;
  if (typeof count !== 'number' || count < 1 || count > 10) {
    return Either.left({ message: 'Invalid count parameter: must be a number between 1 and 10' });
  }

  return Either.right({
    stop: args.stop.trim(),
    line: args.line,
    direction: args.direction,
    count,
  });
};

const formatSuccessResponse = (result: any): ToolResponse => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify(
        {
          success: true,
          stop: result.stop,
          stopCode: result.stopCode,
          arrivals: result.arrivals.map((a: any) => ({
            line: a.line,
            destination: a.destination,
            estimatedTime: a.estimatedTime,
            distance: a.distance,
          })),
          incidents: result.incidents,
        },
        null,
        2
      ),
    },
  ],
});

const formatErrorResponse = (
  error: TransportError | StopNotFoundError | ValidationError | Error
): ToolResponse => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify(
        {
          success: false,
          error: error.message,
          suggestions: 'suggestions' in error ? (error as any).suggestions : undefined,
        },
        null,
        2
      ),
    },
  ],
  isError: true,
});

// ============================================================================
// Legacy Class Wrapper (for backward compatibility)
// ============================================================================

export class GetBusArrivalsTool {
  private readonly handler: (args: any) => Promise<ToolResponse>;

  constructor(
    gtfsStore: IGtfsDataStore,
    httpClient: HttpClient,
    cache: ICacheRepository,
    logger: ILogger,
    emtApiBaseUrl: string,
    emtClientId: string,
    emtPassKey: string,
    cacheTtl?: number
  ) {
    const tool = createGetBusArrivalsTool({
      gtfsStore,
      httpClient,
      cache,
      logger,
      emtApiBaseUrl,
      emtClientId,
      emtPassKey,
      cacheTtl,
    });
    this.handler = tool.handler;
  }

  async execute(input: GetBusArrivalsInput): Promise<any> {
    const response = await this.handler(input);
    if (response.isError) {
      return JSON.parse(response.content[0].text);
    }
    return JSON.parse(response.content[0].text);
  }
}

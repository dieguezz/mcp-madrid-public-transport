// ============================================================================
// GET METRO ARRIVALS MCP TOOL (Pure Functional)
// ============================================================================

import { z } from 'zod';
import { Either } from '../../common/functional/index.js';
import { ILogger } from '../../common/logger/index.js';
import { IGtfsDataStore } from '../../gtfs/domain/IGtfsDataStore.js';
import { ICacheRepository } from '../../cache/domain/ICacheRepository.js';
import { HttpClient } from '../../common/http/index.js';
import { MetroStationsStore } from '../../transport/metro/infrastructure/metro-stations-loader.js';
import { getMetroArrivals } from '../../transport/metro/application/GetMetroArrivalsUseCase.js';
import { createGtfsMetroRepository } from '../../transport/metro/infrastructure/GtfsMetroRepository.functional.js';
import { createMetroApiAdapter } from '../../transport/metro/infrastructure/MetroApiAdapter.js';
import { TransportError, StopNotFoundError } from '../../transport/shared/domain/transport-errors.js';

// ============================================================================
// Types
// ============================================================================

export type GetMetroArrivalsToolDeps = {
  readonly gtfsStore: IGtfsDataStore;
  readonly metroStationsStore: MetroStationsStore;
  readonly httpClient: HttpClient;
  readonly cache: ICacheRepository;
  readonly logger: ILogger;
  readonly metroApiBaseUrl: string;
  readonly cacheTtl?: number;
};

// Zod schema for input validation
export const getMetroArrivalsSchema = z.object({
  station: z.string().describe('Station name or code (e.g., "Colombia", "par_4_211")'),
  line: z.string().optional().describe('Optional line number (e.g., "8", "L8")'),
  direction: z.string().optional().describe('Optional direction/destination'),
  count: z.number().optional().default(2).describe('Number of arrivals to return'),
});

export type GetMetroArrivalsInput = z.infer<typeof getMetroArrivalsSchema>;

type ValidationError = {
  readonly message: string;
};

type ValidatedInput = {
  readonly station: string;
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

export const createGetMetroArrivalsTool = (deps: GetMetroArrivalsToolDeps) => ({
  name: 'get_metro_arrivals',
  description: 'Get arrival times for Madrid Metro trains at a specific station',
  inputSchema: {
    type: 'object',
    properties: {
      station: {
        type: 'string',
        description: 'Station name or code (e.g., "Colombia", "par_4_211")',
      },
      line: {
        type: 'string',
        description: 'Optional: Line number (e.g., "8", "L8")',
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
    required: ['station'],
  },
  handler: createGetMetroArrivalsHandler(deps),
});

// ============================================================================
// Handler Factory
// ============================================================================

const createGetMetroArrivalsHandler =
  (deps: GetMetroArrivalsToolDeps) =>
  async (args: any): Promise<ToolResponse> => {
    const { gtfsStore, metroStationsStore, httpClient, cache, logger, metroApiBaseUrl, cacheTtl } =
      deps;

    logger.info('🚇 MCP tool: get_metro_arrivals STARTED', { input: args });

    // Validate input
    const validationResult = validateInput(args);
    if (Either.isLeft(validationResult)) {
      logger.error('❌ Input validation FAILED', { error: validationResult.left.message });
      return formatErrorResponse(validationResult.left);
    }

    const input = validationResult.right;
    logger.debug('✅ Input validated', { input });

    // Create dependencies
    const stopRepository = createGtfsMetroRepository({ gtfsStore, metroStationsStore });
    const metroApi = createMetroApiAdapter({
      httpClient,
      logger,
      baseUrl: metroApiBaseUrl,
    });

    // Create and execute use case
    const execute = getMetroArrivals({
      stopRepository,
      metroApi,
      cache,
      logger,
      cacheTtl: cacheTtl ?? 30,
    });

    logger.debug('📋 Executing use case with command', {
      station: input.station,
      line: input.line,
      direction: input.direction,
      count: input.count,
    });

    const result = await execute({
      station: input.station,
      line: input.line,
      direction: input.direction,
      count: input.count,
    });

    // Format response
    if (Either.isLeft(result)) {
      const error = result.left;
      logger.error('❌ Metro arrivals request FAILED', {
        error: error.message,
        errorType: error.constructor.name,
        fullError: error,
      });
      return formatErrorResponse(error);
    }

    const data = result.right;
    logger.info('✅ Metro arrivals request SUCCESS', {
      station: data.station,
      stationCode: data.stationCode,
      arrivalsCount: data.arrivals.length,
    });

    return formatSuccessResponse(data);
  };

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const validateInput = (args: any): Either.Either<ValidationError, ValidatedInput> => {
  // Validate station
  if (!args.station || typeof args.station !== 'string' || args.station.trim().length === 0) {
    return Either.left({ message: 'Invalid station parameter: must be a non-empty string' });
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
    station: args.station.trim(),
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
          station: result.station,
          stationCode: result.stationCode,
          arrivals: result.arrivals.map((a: any) => ({
            line: a.line,
            destination: a.destination,
            estimatedTime: a.estimatedTime,
            platform: a.platform,
          })),
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

export class GetMetroArrivalsTool {
  private readonly handler: (args: any) => Promise<ToolResponse>;

  constructor(
    gtfsStore: IGtfsDataStore,
    metroStationsStore: MetroStationsStore,
    httpClient: HttpClient,
    cache: ICacheRepository,
    logger: ILogger,
    metroApiBaseUrl: string,
    cacheTtl?: number
  ) {
    const tool = createGetMetroArrivalsTool({
      gtfsStore,
      metroStationsStore,
      httpClient,
      cache,
      logger,
      metroApiBaseUrl,
      cacheTtl,
    });
    this.handler = tool.handler;
  }

  async execute(input: GetMetroArrivalsInput): Promise<any> {
    const response = await this.handler(input);
    if (response.isError) {
      return JSON.parse(response.content[0].text);
    }
    return JSON.parse(response.content[0].text);
  }
}

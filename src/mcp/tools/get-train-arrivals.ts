// ============================================================================
// GET TRAIN ARRIVALS MCP TOOL (Pure Functional)
// ============================================================================

import { z } from 'zod';
import { Either } from '../../common/functional/index.js';
import { ILogger } from '../../common/logger/index.js';
import { IGtfsDataStore } from '../../gtfs/domain/IGtfsDataStore.js';
import { ICacheRepository } from '../../cache/domain/ICacheRepository.js';
import { IGtfsStaticRepository } from '../../gtfs/domain/IGtfsStaticRepository.js';
import { getTrainArrivals } from '../../transport/train/application/GetTrainArrivalsUseCase.js';
import { createGtfsTrainRepository } from '../../transport/train/infrastructure/GtfsTrainRepository.js';
import { createRenfeGtfsRealtimeAdapter } from '../../transport/train/infrastructure/RenfeGtfsRealtimeAdapter.js';
import { TransportError, StopNotFoundError } from '../../transport/shared/domain/transport-errors.js';

// ============================================================================
// Types
// ============================================================================

export type GetTrainArrivalsToolDeps = {
  readonly gtfsStore: IGtfsDataStore;
  readonly cache: ICacheRepository;
  readonly logger: ILogger;
  readonly stationMapper: {
    load: (logger: ILogger) => void;
    toGtfsCode: (stationCode: string) => string | undefined;
    fromGtfsCode: (gtfsCode: string) => string | undefined;
    getStationName: (stationCode: string) => string | undefined;
    findByName: (name: string) => Array<{ code: string; name: string }>;
    getAllMappings: () => Map<string, string>;
    getStats: () => { totalStations: number; withGtfsCode: number; withNames: number };
  };
  readonly gtfsStatic?: IGtfsStaticRepository;
  readonly gtfsRtCache?: {
    get: (logger: ILogger) => Promise<Either.Either<Error, any>>;
    invalidate: () => void;
    getStats: () => { cached: boolean; age: number; ttl: number };
  };
  readonly cacheTtl?: number;
};

// Zod schema for input validation
export const getTrainArrivalsSchema = z.object({
  station: z.string().describe('Station name or code (e.g., "Atocha", "10100")'),
  line: z.string().optional().describe('Optional line (e.g., "C-2")'),
  direction: z.string().optional().describe('Optional destination'),
  count: z.number().optional().default(2).describe('Number of arrivals to return'),
});

export type GetTrainArrivalsInput = z.infer<typeof getTrainArrivalsSchema>;

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

export const createGetTrainArrivalsTool = (deps: GetTrainArrivalsToolDeps) => ({
  name: 'get_train_arrivals',
  description: 'Get arrival times for Cercanías trains at a station',
  inputSchema: {
    type: 'object',
    properties: {
      station: {
        type: 'string',
        description: 'Station name or code (e.g., "Atocha", "10100")',
      },
      line: {
        type: 'string',
        description: 'Optional: Line (e.g., "C-2")',
      },
      direction: {
        type: 'string',
        description: 'Optional: Destination',
      },
      count: {
        type: 'number',
        description: 'Number of arrivals to return (default: 2, max: 10)',
        default: 2,
      },
    },
    required: ['station'],
  },
  handler: createGetTrainArrivalsHandler(deps),
});

// ============================================================================
// Handler Factory
// ============================================================================

const createGetTrainArrivalsHandler =
  (deps: GetTrainArrivalsToolDeps) =>
  async (args: any): Promise<ToolResponse> => {
    const { gtfsStore, cache, logger, stationMapper, gtfsStatic, gtfsRtCache, cacheTtl } = deps;

    logger.info('🚆 MCP tool: get_train_arrivals STARTED', { input: args });

    // Validate input
    const validationResult = validateInput(args);
    if (Either.isLeft(validationResult)) {
      logger.error('❌ Input validation FAILED', { error: validationResult.left.message });
      return formatErrorResponse(validationResult.left);
    }

    const input = validationResult.right;
    logger.debug('✅ Input validated', { input });

    // Create dependencies
    const stationRepository = createGtfsTrainRepository({ gtfsStore });
    const trainApi = createRenfeGtfsRealtimeAdapter({
      logger,
      stationMapper,
      gtfsStatic,
      gtfsRtCache,
    });

    // Create and execute use case
    const execute = getTrainArrivals({
      stationRepository,
      trainApi,
      cache,
      logger,
      cacheTtl: cacheTtl ?? 10,
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
      logger.error('❌ Train arrivals request FAILED', {
        error: error.message,
        errorType: error.constructor.name,
        fullError: error,
      });
      return formatErrorResponse(error);
    }

    const data = result.right;
    logger.info('✅ Train arrivals request SUCCESS', {
      station: data.station,
      stationCode: data.stationCode,
      arrivalsCount: data.arrivals.length,
    });

    // Check if placeholder is being used (no arrivals)
    if (data.arrivals.length === 0) {
      logger.warn('⚠️ No train arrivals available');
      return formatPlaceholderResponse(data);
    }

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
            delay: a.delay,
          })),
        },
        null,
        2
      ),
    },
  ],
});

const formatPlaceholderResponse = (result: any): ToolResponse => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify(
        {
          success: false,
          message:
            '🚧 No train arrivals available at the moment. Real-time data is fetched from RENFE GTFS-RT feed.',
          station: result.station,
          stationCode: result.stationCode,
        },
        null,
        2
      ),
    },
  ],
  isError: false,
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

export class GetTrainArrivalsTool {
  private readonly handler: (args: any) => Promise<ToolResponse>;

  constructor(
    gtfsStore: IGtfsDataStore,
    cache: ICacheRepository,
    logger: ILogger,
    stationMapper: any,
    gtfsStatic?: IGtfsStaticRepository,
    gtfsRtCache?: any,
    cacheTtl?: number
  ) {
    const tool = createGetTrainArrivalsTool({
      gtfsStore,
      cache,
      logger,
      stationMapper,
      gtfsStatic,
      gtfsRtCache,
      cacheTtl,
    });
    this.handler = tool.handler;
  }

  async execute(input: GetTrainArrivalsInput): Promise<any> {
    const response = await this.handler(input);
    if (response.isError) {
      return JSON.parse(response.content[0].text);
    }
    return JSON.parse(response.content[0].text);
  }
}

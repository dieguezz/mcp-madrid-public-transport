#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Configuration
import { environment } from './common/config/environment.js';

// Loggers (FP)
import { createConsoleLogger, createFileLogger, createCombinedLogger } from './common/logger/index.js';
import { logLevelFromString } from './common/logger/log-levels.js';

// HTTP & Cache (FP)
import { createHttpClient } from './common/http/HttpClient.js';
import { createInMemoryCache } from './cache/infrastructure/InMemoryCache.js';

// GTFS (FP)
import { createGtfsFileLoader } from './gtfs/infrastructure/GtfsFileLoader.js';
import { createSqliteGtfsStaticRepository } from './gtfs/infrastructure/SqliteGtfsStaticRepository.js';

// Metro (FP)
import { createGetMetroArrivalsTool } from './mcp/tools/get-metro-arrivals.js';
import { loadMetroStations } from './transport/metro/infrastructure/metro-stations-loader.js';

// Bus (FP)
import { createGetBusArrivalsTool } from './mcp/tools/get-bus-arrivals.js';

// Train (FP)
import { createGetTrainArrivalsTool } from './mcp/tools/get-train-arrivals.js';
import { createGtfsRealtimeCache } from './transport/train/infrastructure/GtfsRealtimeCache.js';
import { createTrainStationMapper } from './transport/train/infrastructure/train-station-mapper.js';

async function main() {
  // ============================================================================
  // Initialize Loggers (Functional)
  // ============================================================================

  const debugLevel = logLevelFromString(String(environment.debugLevel));

  const consoleLogger = createConsoleLogger(
    debugLevel !== null
      ? { enabled: environment.debug, currentLevel: debugLevel }
      : { enabled: false }
  );

  const fileLogger = createFileLogger({
    enabled: environment.debug,
    level: debugLevel,
    logFilePath: './mcp-debug.log',
  });

  const logger = createCombinedLogger([consoleLogger, fileLogger]);

  logger.info('🚀 Starting Madrid Transport MCP Server', {
    debug: environment.debug,
    debugLevel: environment.debugLevel,
    logFile: './mcp-debug.log',
  });

  // ============================================================================
  // Load GTFS Data (Functional)
  // ============================================================================

  logger.info('Loading GTFS data', { path: environment.gtfsDataPath });
  const gtfsLoader = createGtfsFileLoader({ logger, gtfsPath: environment.gtfsDataPath });
  const gtfsResult = await gtfsLoader.loadAll();

  if (gtfsResult._tag === 'Left') {
    logger.error('Failed to load GTFS data', { error: gtfsResult.left });
    process.exit(1);
  }

  const gtfsStore = gtfsResult.right;
  logger.info('GTFS data loaded successfully', {
    stops: gtfsStore.getStopCount(),
    routes: gtfsStore.getRouteCount(),
  });

  // ============================================================================
  // Load Metro Stations Mapping (Functional)
  // ============================================================================

  logger.info('Loading Metro stations mapping');
  const metroStationsResult = await loadMetroStations(environment.gtfsDataPath);

  if (metroStationsResult._tag === 'Left') {
    logger.error('Failed to load Metro stations', { error: metroStationsResult.left });
    process.exit(1);
  }

  const metroStationsStore = metroStationsResult.right;
  logger.info('Metro stations loaded successfully');

  // ============================================================================
  // Initialize Infrastructure (Functional)
  // ============================================================================

  const httpClient = createHttpClient({ logger, config: { timeoutMs: 30000 } });
  const cache = createInMemoryCache({ logger, cleanupIntervalMs: 60000 });

  // ============================================================================
  // Initialize Metro Components (Functional)
  // ============================================================================

  const metroTool = createGetMetroArrivalsTool({
    gtfsStore,
    metroStationsStore,
    httpClient,
    cache,
    logger,
    metroApiBaseUrl: environment.metroApiUrl,
    cacheTtl: environment.cacheTtlMetro,
  });

  // ============================================================================
  // Initialize Bus Components (Functional)
  // ============================================================================

  const busTool = createGetBusArrivalsTool({
    gtfsStore,
    httpClient,
    cache,
    logger,
    emtApiBaseUrl: environment.emtApiUrl,
    emtClientId: environment.emtClientId || '',
    emtPassKey: environment.emtPassKey || '',
    cacheTtl: environment.cacheTtlBus,
  });

  // ============================================================================
  // Initialize Train Components (Functional)
  // Using official Renfe GTFS Realtime feed (open data portal)
  // https://data.renfe.com/dataset/ubicacion-vehiculos
  // ============================================================================

  // Load GTFS static data for train schedules
  logger.info('Loading GTFS static data for trains');
  const gtfsStaticPath = `${environment.gtfsDataPath}/train/gtfs-static`;
  const gtfsDbPath = './gtfs-static.db'; // Persistent database file
  const gtfsStatic = createSqliteGtfsStaticRepository({
    logger,
    gtfsDataPath: gtfsStaticPath,
    dbPath: gtfsDbPath,
  });

  const gtfsStaticInitResult = await gtfsStatic.initialize();

  if (gtfsStaticInitResult._tag === 'Left') {
    logger.warn('Failed to load GTFS static data, trains will have limited info', {
      error: gtfsStaticInitResult.left.message,
    });
  } else {
    logger.info('GTFS static data loaded successfully');
  }

  // Load train station code mappings
  const stationMapper = createTrainStationMapper({
    csvPath: `${environment.gtfsDataPath}/train/train_stations.csv`,
  });

  await stationMapper.load(logger);
  const mapperStats = stationMapper.getStats();
  logger.info('Train station mappings loaded', mapperStats);

  // Create GTFS Realtime cache (60 second TTL)
  const gtfsRtCache = createGtfsRealtimeCache({ ttl: 60000 }); // 60 seconds
  logger.info('GTFS-RT cache initialized', { ttl: '60s' });

  const trainTool = createGetTrainArrivalsTool({
    gtfsStore,
    cache,
    logger,
    stationMapper,
    gtfsStatic,
    gtfsRtCache,
    cacheTtl: environment.cacheTtlTrain,
  });

  // ============================================================================
  // Create MCP Server
  // ============================================================================

  const server = new Server(
    {
      name: 'madrid-transport',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // ============================================================================
  // Register Tools
  // ============================================================================

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [metroTool, busTool, trainTool].map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // ============================================================================
  // Handle Tool Calls
  // ============================================================================

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    logger.info('Tool called', { name, args });

    try {
      let toolToExecute;

      switch (name) {
        case 'get_metro_arrivals':
          toolToExecute = metroTool;
          break;
        case 'get_bus_arrivals':
          toolToExecute = busTool;
          break;
        case 'get_train_arrivals':
          toolToExecute = trainTool;
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return await toolToExecute.handler(args);
    } catch (error: any) {
      logger.error('Tool execution failed', { name, error: error.message });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: true,
              message: error.message,
            }),
          },
        ],
        isError: true,
      };
    }
  });

  // ============================================================================
  // Start Server
  // ============================================================================

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('MCP Server started successfully');
}

// ============================================================================
// Run Server
// ============================================================================

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

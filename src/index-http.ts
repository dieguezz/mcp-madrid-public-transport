#!/usr/bin/env node
import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
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
    logFilePath: './mcp-http-debug.log',
  });

  const logger = createCombinedLogger([consoleLogger, fileLogger]);

  logger.info('🚀 Starting Madrid Transport MCP HTTP Server', {
    debug: environment.debug,
    debugLevel: environment.debugLevel,
    logFile: './mcp-http-debug.log',
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
  // Create MCP Server (Factory function to create new instances per session)
  // ============================================================================

  const createMcpServer = () => {
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

    // Register Tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [metroTool, busTool, trainTool].map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle Tool Calls
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

    return server;
  };

  // ============================================================================
  // Create Express App
  // ============================================================================

  const app = express();
  app.use(express.json());

  // Store transports by session ID
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'madrid-transport-mcp',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // MCP endpoint - POST for JSON-RPC requests
  app.post('/mcp', async (req: Request, res: Response) => {
    logger.debug('Received MCP POST request', { body: req.body });

    try {
      // Check for existing session ID
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        logger.debug('Reusing existing transport', { sessionId });
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request
        logger.info('Creating new MCP session');
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: sessionId => {
            logger.info('Session initialized', { sessionId });
            transports[sessionId] = transport;
          },
        });

        // Connect the transport to a new MCP server instance
        const server = createMcpServer();
        await server.connect(transport);

        // Handle the request
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        // Invalid request
        logger.warn('Invalid MCP request - no session ID or not initialization', {
          sessionId,
          hasBody: !!req.body,
        });
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided or missing initialization',
          },
          id: null,
        });
        return;
      }

      // Handle the request with existing transport
      await transport.handleRequest(req, res, req.body);
    } catch (error: any) {
      logger.error('Error handling MCP request', { error: error.message, stack: error.stack });
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // MCP endpoint - GET for SSE streams (for notifications)
  app.get('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId || !transports[sessionId]) {
      logger.warn('Invalid SSE request - missing or invalid session ID', { sessionId });
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    logger.info('Establishing SSE stream', { sessionId });
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  });

  // ============================================================================
  // Start HTTP Server
  // ============================================================================

  const PORT = process.env.MCP_HTTP_PORT ? parseInt(process.env.MCP_HTTP_PORT) : 3000;
  const HOST = process.env.MCP_HTTP_HOST || '0.0.0.0';

  app.listen(PORT, HOST, () => {
    logger.info(`✅ MCP HTTP Server listening`, {
      host: HOST,
      port: PORT,
      url: `http://${HOST}:${PORT}`,
      endpoints: {
        health: `http://${HOST}:${PORT}/health`,
        mcp: `http://${HOST}:${PORT}/mcp`,
      },
    });
    console.log(`\n🚇 Madrid Transport MCP Server (HTTP)`);
    console.log(`📡 Listening on: http://${HOST}:${PORT}`);
    console.log(`💚 Health check: http://${HOST}:${PORT}/health`);
    console.log(`🔌 MCP endpoint: http://${HOST}:${PORT}/mcp`);
    console.log(`\nReady to accept MCP connections!\n`);
  });

  // ============================================================================
  // Handle Server Shutdown
  // ============================================================================

  process.on('SIGINT', async () => {
    logger.info('Shutting down MCP HTTP server...');

    // Close all active transports
    for (const sessionId in transports) {
      try {
        logger.info('Closing transport', { sessionId });
        await transports[sessionId].close();
        delete transports[sessionId];
      } catch (error: any) {
        logger.error('Error closing transport', { sessionId, error: error.message });
      }
    }

    logger.info('Server shutdown complete');
    process.exit(0);
  });
}

// ============================================================================
// Run Server
// ============================================================================

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Madrid Transport MCP Server** - A Model Context Protocol (MCP) server that provides real-time public transportation information for Madrid, Spain. This server enables AI assistants to query arrival times for Metro, buses (EMT, urban, interurban), and Cercanías trains.

### What is MCP?

MCP (Model Context Protocol) is a protocol that allows AI models to interact with external tools and data sources. This server implements MCP to expose Madrid's public transportation APIs to AI assistants like Claude.

## Technology Stack

- **Language**: TypeScript (Node.js)
- **Protocol**: Model Context Protocol (MCP)
- **APIs**: Metro Madrid, EMT OpenAPI, CRTM SOAP, ADIF "El Cano"
- **Data Format**: GTFS + real-time APIs
- **Programming Paradigm**: Functional Programming
- **Principles**: SOLID, DRY, KISS

## Project Structure (DDD + Functional Programming + SOLID)

**Organización por Dominio primero (ontología), luego por capas técnicas**

```
mcp-madrid-public-transport/
├── src/
│   ├── index.ts                              # Application entry point
│   │
│   ├── transport/                            # 🚇🚌🚆 TRANSPORT DOMAIN (Bounded Context)
│   │   │
│   │   ├── metro/                            # Metro subdomain
│   │   │   ├── domain/
│   │   │   │   ├── MetroStop.ts             # Metro stop entity
│   │   │   │   ├── MetroLine.ts             # Metro line entity
│   │   │   │   ├── MetroArrival.ts          # Metro arrival value object
│   │   │   │   ├── MetroPlatform.ts         # Platform value object
│   │   │   │   ├── IMetroStopRepository.ts  # Repository interface
│   │   │   │   └── metro-services.ts        # Domain services (pure functions)
│   │   │   │       ├── resolveMetroStop
│   │   │   │       ├── filterByLine
│   │   │   │       └── calculateNextArrivals
│   │   │   │
│   │   │   ├── application/
│   │   │   │   ├── GetMetroArrivalsUseCase.ts
│   │   │   │   ├── GetMetroArrivalsCommand.ts
│   │   │   │   ├── GetMetroArrivalsResult.ts
│   │   │   │   └── IMetroApiPort.ts         # Port for infrastructure
│   │   │   │
│   │   │   └── infrastructure/
│   │   │       ├── MetroApiAdapter.ts       # Implements IMetroApiPort
│   │   │       ├── GtfsMetroRepository.ts   # Implements IMetroStopRepository
│   │   │       ├── metro-api-client.ts      # HTTP calls
│   │   │       ├── metro-parser.ts          # Parse API responses
│   │   │       └── metro-mapper.ts          # API → Domain mapping
│   │   │
│   │   ├── bus/                              # Bus subdomain
│   │   │   ├── domain/
│   │   │   │   ├── BusStop.ts               # Bus stop entity
│   │   │   │   ├── BusLine.ts               # Bus line entity
│   │   │   │   ├── BusArrival.ts            # Bus arrival value object
│   │   │   │   ├── BusIncident.ts           # Incident value object
│   │   │   │   ├── IBusStopRepository.ts
│   │   │   │   └── bus-services.ts
│   │   │   │       ├── resolveBusStop
│   │   │   │       ├── filterByDirection
│   │   │   │       └── extractIncidents
│   │   │   │
│   │   │   ├── application/
│   │   │   │   ├── GetBusArrivalsUseCase.ts
│   │   │   │   ├── GetBusArrivalsCommand.ts
│   │   │   │   ├── GetBusArrivalsResult.ts
│   │   │   │   └── IEmtApiPort.ts
│   │   │   │
│   │   │   └── infrastructure/
│   │   │       ├── EmtApiAdapter.ts
│   │   │       ├── GtfsBusRepository.ts
│   │   │       ├── emt-auth.ts              # OAuth token management
│   │   │       ├── emt-api-client.ts
│   │   │       ├── emt-parser.ts
│   │   │       └── emt-mapper.ts
│   │   │
│   │   ├── train/                            # Train/Cercanías subdomain
│   │   │   ├── domain/
│   │   │   │   ├── TrainStation.ts          # Train station entity
│   │   │   │   ├── TrainLine.ts             # Cercanías line entity
│   │   │   │   ├── TrainArrival.ts          # Train arrival value object
│   │   │   │   ├── TrainPlatform.ts         # Platform value object
│   │   │   │   ├── TrainDelay.ts            # Delay value object
│   │   │   │   ├── ITrainStationRepository.ts
│   │   │   │   └── train-services.ts
│   │   │   │       ├── resolveTrainStation
│   │   │   │       ├── calculateEstimatedArrival
│   │   │   │       └── sortByDepartureTime
│   │   │   │
│   │   │   ├── application/
│   │   │   │   ├── GetTrainArrivalsUseCase.ts
│   │   │   │   ├── GetTrainArrivalsCommand.ts
│   │   │   │   ├── GetTrainArrivalsResult.ts
│   │   │   │   └── IAdifApiPort.ts
│   │   │   │
│   │   │   └── infrastructure/
│   │   │       ├── AdifApiAdapter.ts
│   │   │       ├── GtfsTrainRepository.ts
│   │   │       ├── adif-signature.ts        # HMAC-SHA256 generation
│   │   │       ├── adif-api-client.ts
│   │   │       ├── adif-parser.ts
│   │   │       └── adif-mapper.ts
│   │   │
│   │   └── shared/                           # Shared between transport types
│   │       ├── domain/
│   │       │   ├── Coordinates.ts           # Shared value object
│   │       │   ├── Direction.ts             # Shared value object
│   │       │   ├── TimeEstimate.ts          # Shared value object
│   │       │   ├── TransportMode.ts         # Enum: Metro, Bus, Train
│   │       │   └── transport-errors.ts      # StopNotFound, LineNotFound, etc
│   │       │
│   │       └── services/
│   │           ├── time-calculator.ts       # Pure time calculations
│   │           ├── distance-calculator.ts   # Pure distance calculations
│   │           └── fuzzy-matcher.ts         # Levenshtein distance, etc
│   │
│   ├── mcp/                                  # 🔌 MCP BOUNDED CONTEXT
│   │   ├── tools/                            # MCP tool definitions
│   │   │   ├── get-metro-arrivals.ts
│   │   │   ├── get-bus-arrivals.ts
│   │   │   └── get-train-arrivals.ts
│   │   │
│   │   ├── formatters/
│   │   │   ├── time-formatter.ts            # "3 minutos", "a las 10:15"
│   │   │   ├── arrival-formatter.ts         # Format arrivals for MCP
│   │   │   └── error-formatter.ts           # Format errors for MCP
│   │   │
│   │   └── validators/
│   │       └── input-validator.ts           # Validate MCP inputs
│   │
│   ├── gtfs/                                 # 📊 GTFS BOUNDED CONTEXT
│   │   ├── domain/
│   │   │   ├── GtfsStop.ts                  # GTFS stop entity
│   │   │   ├── GtfsRoute.ts                 # GTFS route entity
│   │   │   ├── GtfsTrip.ts                  # GTFS trip entity
│   │   │   └── IGtfsDataStore.ts            # Interface for GTFS storage
│   │   │
│   │   ├── application/
│   │   │   ├── LoadGtfsDataUseCase.ts       # Load all GTFS files
│   │   │   └── QueryGtfsDataUseCase.ts      # Query GTFS data
│   │   │
│   │   └── infrastructure/
│   │       ├── GtfsFileLoader.ts            # Load from filesystem
│   │       ├── GtfsCsvParser.ts             # Parse CSV files
│   │       ├── InMemoryGtfsStore.ts         # In-memory storage
│   │       └── gtfs-mappers.ts              # CSV → Domain entities
│   │
│   ├── cache/                                # 💾 CACHE BOUNDED CONTEXT
│   │   ├── domain/
│   │   │   ├── CacheEntry.ts                # Cache entry value object
│   │   │   ├── CacheKey.ts                  # Cache key value object
│   │   │   └── ICacheRepository.ts          # Cache interface
│   │   │
│   │   └── infrastructure/
│   │       └── InMemoryCache.ts             # In-memory implementation
│   │
│   └── common/                               # 🔧 COMMON (Technical concerns)
│       ├── http/
│       │   ├── HttpClient.ts                # HTTP client wrapper
│       │   ├── retry-policy.ts              # Retry logic (HOF)
│       │   └── http-errors.ts               # HTTP error types
│       │
│       │── functional/
│       │   ├── Either.ts                    # Either monad
│       │   ├── Option.ts                    # Option monad
│       │   ├── Result.ts                    # Result type
│       │   ├── pipe.ts                      # Pipe function
│       │   └── compose.ts                   # Compose function
│       │
│       ├── logger/
│       │   ├── ILogger.ts                   # Logger interface
│       │   ├── ConsoleLogger.ts             # Console implementation
│       │   └── log-levels.ts                # Log level enum
│       │
│       ├── validators/
│       │   ├── string-validators.ts         # Pure string validators
│       │   ├── number-validators.ts         # Pure number validators
│       │   └── validators.ts                # Generic validators
│       │
│       └── config/
│           ├── environment.ts               # Environment variables
│           ├── di-container.ts              # Dependency injection
│           └── app-config.ts                # App configuration
│
├── transport-data/                           # Static GTFS data
│   ├── metro/
│   ├── bus/
│   └── train/
│
├── tests/                                    # Tests (mirror src structure)
│   ├── transport/
│   │   ├── metro/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── infrastructure/
│   │   ├── bus/
│   │   └── train/
│   ├── mcp/
│   ├── gtfs/
│   └── fixtures/
│
├── package.json
├── tsconfig.json
└── README.md
```

## MCP Tools to Implement

The server exposes these MCP tools for AI assistants:

### 1. `get_metro_arrivals`
**Description**: Get arrival times for Madrid Metro trains at a specific station

**Parameters**:
```typescript
{
  station: string;          // Station name or code (e.g., "Colombia", "par_4_211")
  line?: string;           // Optional: Line number (e.g., "8", "L8")
  direction?: string;      // Optional: Direction/destination (e.g., "Nuevos Ministerios")
  count?: number;          // Optional: Number of arrivals (default: 2)
}
```

**Returns**:
```typescript
{
  station: string;
  line: string;
  arrivals: Array<{
    line: string;
    destination: string;
    estimatedTime: string;    // ISO timestamp or relative ("3 minutos")
    platform?: string;
  }>;
}
```

### 2. `get_bus_arrivals`
**Description**: Get arrival times for buses (EMT, urban, interurban) at a stop

**Parameters**:
```typescript
{
  stop: string;            // Stop name or number (e.g., "Plaza de Castilla", "3000")
  line?: string;          // Optional: Line number (e.g., "27", "51")
  direction?: string;     // Optional: Direction/destination
  count?: number;         // Optional: Number of arrivals (default: 2)
}
```

**Returns**:
```typescript
{
  stop: string;
  stopNumber?: string;
  arrivals: Array<{
    line: string;
    destination: string;
    estimatedTime: string;
    distance?: number;      // Distance in meters (if available)
  }>;
  incidents?: Array<{
    title: string;
    description: string;
  }>;
}
```

### 3. `get_train_arrivals`
**Description**: Get arrival times for Cercanías trains at a station

**Parameters**:
```typescript
{
  station: string;         // Station name or code (e.g., "Atocha", "10100")
  line?: string;          // Optional: Line (e.g., "C-2")
  direction?: string;     // Optional: Destination
  count?: number;         // Optional: Number of arrivals (default: 2)
}
```

**Returns**:
```typescript
{
  station: string;
  arrivals: Array<{
    line: string;
    destination: string;
    estimatedTime: string;
    platform: string;
    delay?: number;         // Delay in seconds
  }>;
}
```

### 4. `search_stops` (Optional - Future)
**Description**: Search for stops by name or location

**Parameters**:
```typescript
{
  query?: string;          // Search by name
  latitude?: number;       // Search by location
  longitude?: number;
  radius?: number;         // Radius in meters (default: 500)
  type?: "metro" | "bus" | "train";
}
```

## Development Commands

### Setup
```bash
npm install
npm run build
```

### Development
```bash
npm run dev          # Run in development mode with auto-reload
npm run build        # Compile TypeScript
npm start            # Start MCP server
```

### Testing
```bash
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:api     # Test API connections
```

### Debugging
```bash
DEBUG=true npm start              # Enable debug logging
DEBUG_LEVEL=verbose npm start     # Verbose debug output
```

## Environment Variables

Required environment variables (create `.env` file):

```bash
# Debug
DEBUG=false                       # Enable debug logging
DEBUG_LEVEL=info                  # Log level: error, warn, info, verbose, debug

# EMT API (register at https://openapi.emtmadrid.es/)
EMT_CLIENT_ID=your_client_id
EMT_PASS_KEY=your_pass_key

# Optional: Override default endpoints
METRO_API_URL=https://serviciosapp.metromadrid.es
ADIF_API_URL=https://circulacion.api.adif.es
EMT_API_URL=https://openapi.emtmadrid.es
AVANZA_API_URL=https://apisvt.avanzagrupo.com

# Cache settings
CACHE_TTL_METRO=30               # Seconds (default: 30)
CACHE_TTL_BUS=10                 # Seconds (default: 10)
CACHE_TTL_TRAIN=10               # Seconds (default: 10)
CACHE_TTL_GTFS=86400             # Seconds (default: 24h)

# GTFS data path
GTFS_DATA_PATH=./transport-data
```

## Implementation Tasks

### MVP (Phase 1) - Core Functionality ⭐ INCLUDES TRAINS

#### Required for MVP
- [ ] **Functional Programming Foundation**
  - [ ] Setup fp-ts or similar library for functional utilities
  - [ ] Implement Either monad for error handling
  - [ ] Implement Option monad for nullable values
  - [ ] Create Result type (Ok/Err pattern)
  - [ ] Define pure utility functions (compose, pipe, map, etc.)

- [ ] **MCP Server Setup**
  - [ ] Initialize MCP server with TypeScript
  - [ ] Define tool schemas for `get_metro_arrivals`, `get_bus_arrivals`, `get_train_arrivals`
  - [ ] Implement functional error handling (no exceptions, use Either/Result)
  - [ ] Add pure logging functions (side-effects isolated)

- [ ] **Core Domain Types (SOLID - Single Responsibility)**
  - [ ] Define domain types: `Stop`, `Line`, `Arrival`, `Station`
  - [ ] Define API types: `MetroApiResponse`, `EmtApiResponse`, `AdifApiResponse`
  - [ ] Define MCP types: Tool parameters and responses
  - [ ] Define Error types: `ApiError`, `ValidationError`, `NotFoundError`

- [ ] **Metro Implementation (Functional)**
  - [ ] Pure Metro API client function (`fetchMetroArrivals`)
  - [ ] Pure Metro response parser (`parseMetroResponse`)
  - [ ] Pure Metro time formatter (`formatMetroTime`)
  - [ ] GTFS loader for Metro stops (functional parsing)
  - [ ] Pure stop resolver function (`resolveMetroStop`)
  - [ ] Pure line/direction filter (`filterByDirection`)
  - [ ] Cache wrapper (HOF - Higher Order Function)

- [ ] **EMT Bus Implementation (Functional)**
  - [ ] Pure EMT OAuth flow functions (composable)
  - [ ] Pure EMT API client (`fetchEmtArrivals`)
  - [ ] Pure EMT response parser (`parseEmtResponse`)
  - [ ] Token refresh logic (pure, returns new token)
  - [ ] GTFS loader for EMT stops (functional)
  - [ ] Pure stop resolver (by number and name)
  - [ ] Pure incidents extractor
  - [ ] Cache wrapper (reusable HOF)

- [ ] **Train/Cercanías Implementation (Functional)** ⭐ MVP REQUIREMENT
  - [ ] Pure ADIF authentication function (`generateAdifSignature`)
  - [ ] Pure ADIF API client (`fetchAdifArrivals`)
  - [ ] Pure ADIF response parser (`parseAdifResponse`)
  - [ ] GTFS loader for train stations (functional)
  - [ ] Pure station code mapper (`mapStationCode`)
  - [ ] Pure delay calculator (`calculateEstimatedTime`)
  - [ ] Cache wrapper (same HOF as others - DRY)
  - [ ] Fallback to CRTM SOAP (Phase 2 if time allows)

- [ ] **GTFS Data Loading (Functional Pipeline)**
  - [ ] Pure CSV parser (no side effects)
  - [ ] Pure GTFS transformer (CSV → Domain types)
  - [ ] Pure index builder (functional data structures)
  - [ ] Pure fuzzy matcher for stop names (Levenshtein distance)
  - [ ] Compose loading pipeline (pipe/compose functions)

- [ ] **Infrastructure Layer (Side-effects isolated)**
  - [ ] HTTP client wrapper (with retry as HOF)
  - [ ] Cache interface + in-memory implementation
  - [ ] File system reader (for GTFS files)
  - [ ] Logger (side-effect boundary, pure log formatters)

- [ ] **Testing & Documentation**
  - [ ] Unit tests for all pure functions
  - [ ] Property-based tests (fast-check library)
  - [ ] Integration tests for API clients
  - [ ] README with functional programming notes
  - [ ] Example queries documentation

#### Optional for MVP (Nice to Have)
- [ ] Interurban buses (CRTM SOAP - complex, defer to Phase 2)
- [ ] Avanza buses (simple REST, but not critical)
- [ ] Stop search by location (geographic functions)
- [ ] Multi-stop queries (parallel API calls with Promise.all)
- [ ] Historical data / schedule fallback (GTFS timetables)

### Phase 2 - Enhanced Functionality

- [ ] **Advanced Features**
  - [ ] CRTM SOAP client for interurban buses
  - [ ] ADIF "El Cano" authentication and API client
  - [ ] Fallback to GTFS schedules when APIs fail
  - [ ] Multi-language support (EN/ES)
  - [ ] Stop suggestions when ambiguous

- [ ] **Performance**
  - [ ] Redis cache (optional, instead of in-memory)
  - [ ] Background GTFS updates
  - [ ] API response batching
  - [ ] Rate limiting protection

- [ ] **Location-based Features**
  - [ ] `search_stops` tool implementation
  - [ ] Nearest stop finder
  - [ ] Walking distance calculations
  - [ ] Multi-modal route suggestions

### Phase 3 - Production Ready

- [ ] **Reliability**
  - [ ] Comprehensive error handling
  - [ ] API circuit breakers
  - [ ] Retry logic with exponential backoff
  - [ ] Health check endpoint
  - [ ] Monitoring and metrics

- [ ] **Advanced Caching**
  - [ ] Smart cache invalidation
  - [ ] Stale-while-revalidate pattern
  - [ ] Persistent cache for GTFS data

- [ ] **Data Updates**
  - [ ] Automatic GTFS data refresh
  - [ ] API endpoint monitoring
  - [ ] Fallback data sources

## API Implementation Guide

### Metro API (Simplest)
```typescript
// No authentication required
const response = await fetch(
  `https://serviciosapp.metromadrid.es/servicios/rest/teleindicadores/${codigoEmpresa}`,
  { headers: { 'Accept': 'application/json' } }
);
```

**Complexity**: ⭐ Low
**Priority**: MVP (Phase 1)

### EMT API (Medium)
```typescript
// 1. Login to get token
const loginResponse = await fetch(
  'https://openapi.emtmadrid.es/v1/mobilitylabs/user/login/',
  {
    headers: {
      'X-ClientId': process.env.EMT_CLIENT_ID,
      'passKey': process.env.EMT_PASS_KEY
    }
  }
);

// 2. Use token for arrivals
const arrivalsResponse = await fetch(
  `https://openapi.emtmadrid.es/v2/transport/busemtmad/stops/${stopId}/arrives/`,
  {
    method: 'POST',
    headers: {
      'accessToken': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ /* ... */ })
  }
);
```

**Complexity**: ⭐⭐ Medium
**Priority**: MVP (Phase 1)
**Note**: Token expires after 1 hour, implement refresh logic

### ADIF "El Cano" (Complex - defer to Phase 2)
Requires HMAC-SHA256 signature. See `transport-data/train/ENDPOINTS.md` for full details.

**Complexity**: ⭐⭐⭐⭐ Very High
**Priority**: Phase 2 (not MVP)
**Note**: Consider using existing Kotlin code as reference or calling it as subprocess

### CRTM SOAP (Complex - defer to Phase 2)
Requires SOAP client + AES encryption. See `transport-data/bus/ENDPOINTS.md`.

**Complexity**: ⭐⭐⭐ High
**Priority**: Phase 2 (not MVP)

### Avanza API (Simple - optional)
```typescript
const response = await fetch(
  `https://apisvt.avanzagrupo.com/lineas/getTraficosParada?empresa=25&parada=${stopId}`
);
```

**Complexity**: ⭐ Low
**Priority**: Phase 2 (optional)

## Programming Principles & Patterns

### Functional Programming (FP)

**Core Concepts:**

1. **Pure Functions**: No side effects, same input = same output
   ```typescript
   // ✅ Pure function
   const formatTime = (seconds: number): string => {
     const minutes = Math.floor(seconds / 60);
     return minutes < 10 ? `en ${minutes} minutos` : `a las ${getAbsoluteTime(seconds)}`;
   };

   // ❌ Impure function (side effect)
   const formatTime = (seconds: number): string => {
     console.log('Formatting time'); // Side effect!
     return `${seconds}s`;
   };
   ```

2. **Immutability**: Never mutate data, create new values
   ```typescript
   // ✅ Immutable
   const addArrival = (arrivals: Arrival[], newArrival: Arrival): Arrival[] =>
     [...arrivals, newArrival];

   // ❌ Mutable
   const addArrival = (arrivals: Arrival[], newArrival: Arrival): Arrival[] => {
     arrivals.push(newArrival); // Mutation!
     return arrivals;
   };
   ```

3. **Function Composition**: Build complex logic from simple functions
   ```typescript
   import { pipe } from 'fp-ts/function';

   const getMetroArrivals = pipe(
     fetchMetroData,           // Step 1: Fetch
     parseMetroResponse,       // Step 2: Parse
     filterByDirection,        // Step 3: Filter
     formatArrivals           // Step 4: Format
   );
   ```

4. **Higher-Order Functions (HOF)**: Functions that take/return functions
   ```typescript
   // Generic cache wrapper (DRY!)
   const withCache = <T>(
     key: string,
     ttl: number,
     fn: () => Promise<T>
   ): (() => Promise<T>) => {
     return async () => {
       const cached = cache.get(key);
       if (cached) return cached;

       const result = await fn();
       cache.set(key, result, ttl);
       return result;
     };
   };

   // Reuse for all APIs
   const cachedMetro = withCache('metro:123', 30, () => fetchMetroData('123'));
   const cachedEmt = withCache('emt:456', 10, () => fetchEmtData('456'));
   ```

5. **Error Handling with Either/Result**: No exceptions
   ```typescript
   import { Either, left, right } from 'fp-ts/Either';

   type ApiError = { type: 'API_ERROR'; message: string };
   type NotFoundError = { type: 'NOT_FOUND'; resource: string };
   type AppError = ApiError | NotFoundError;

   const fetchMetro = async (code: string): Promise<Either<AppError, MetroData>> => {
     try {
       const response = await fetch(`/api/metro/${code}`);
       if (response.status === 404) {
         return left({ type: 'NOT_FOUND', resource: code });
       }
       const data = await response.json();
       return right(data);
     } catch (e) {
       return left({ type: 'API_ERROR', message: e.message });
     }
   };
   ```

6. **Option/Maybe**: Handle nullable values
   ```typescript
   import { Option, some, none, fold } from 'fp-ts/Option';

   const findStop = (name: string): Option<Stop> => {
     const stop = stops.find(s => s.name === name);
     return stop ? some(stop) : none;
   };

   // Use with fold
   const result = pipe(
     findStop('Colombia'),
     fold(
       () => 'Stop not found',
       (stop) => `Found: ${stop.name}`
     )
   );
   ```

### SOLID Principles

**S - Single Responsibility Principle (SRP)**
Each function/module does ONE thing:

```typescript
// ✅ Good: Each function has one responsibility
const parseMetroResponse = (raw: RawMetroData): MetroData => { /* ... */ };
const formatMetroTime = (data: MetroData): FormattedTime => { /* ... */ };
const filterByLine = (data: MetroData[], line: string): MetroData[] => { /* ... */ };

// ❌ Bad: Function does too many things
const getMetroArrivals = (code: string, line: string) => {
  const raw = fetch(/* ... */);  // Fetching
  const parsed = parse(raw);     // Parsing
  const filtered = filter(parsed, line); // Filtering
  const formatted = format(filtered);    // Formatting
  cache.set(code, formatted);    // Caching
  return formatted;
};
```

**O - Open/Closed Principle (OCP)**
Open for extension, closed for modification:

```typescript
// Generic API client interface
type ApiClient<TRequest, TResponse> = {
  fetch: (req: TRequest) => Promise<Either<ApiError, TResponse>>;
  parse: (raw: TResponse) => Arrival[];
};

// Extend for each transport type (no modification needed)
const metroClient: ApiClient<MetroRequest, MetroResponse> = {
  fetch: fetchMetroApi,
  parse: parseMetroResponse
};

const emtClient: ApiClient<EmtRequest, EmtResponse> = {
  fetch: fetchEmtApi,
  parse: parseEmtResponse
};
```

**L - Liskov Substitution Principle (LSP)**
Subtypes must be substitutable:

```typescript
// Base interface for all resolvers
interface StopResolver {
  resolve: (query: string) => Option<Stop>;
}

// Implementations are interchangeable
const metroResolver: StopResolver = {
  resolve: (query) => findMetroStop(query)
};

const emtResolver: StopResolver = {
  resolve: (query) => findEmtStop(query)
};

// Can use any resolver without knowing the concrete type
const useResolver = (resolver: StopResolver, query: string) =>
  resolver.resolve(query);
```

**I - Interface Segregation Principle (ISP)**
Many specific interfaces > one general interface:

```typescript
// ✅ Good: Specific interfaces
interface StopFinder {
  findByName: (name: string) => Option<Stop>;
}

interface StopGeocoder {
  findByLocation: (lat: number, lon: number) => Option<Stop[]>;
}

// ❌ Bad: Fat interface
interface StopService {
  findByName: (name: string) => Option<Stop>;
  findByLocation: (lat: number, lon: number) => Option<Stop[]>;
  findByCode: (code: string) => Option<Stop>;
  // ... many more methods
}
```

**D - Dependency Inversion Principle (DIP)**
Depend on abstractions, not concretions:

```typescript
// ✅ Good: Depend on interface
type Cache = {
  get: <T>(key: string) => Option<T>;
  set: <T>(key: string, value: T, ttl: number) => void;
};

const getArrivals = (cache: Cache, stopCode: string) => {
  return pipe(
    cache.get(`arrivals:${stopCode}`),
    fold(
      () => fetchAndCache(cache, stopCode),
      (cached) => Promise.resolve(cached)
    )
  );
};

// ❌ Bad: Depend on concrete implementation
const getArrivals = (stopCode: string) => {
  const cached = memoryCache.get(`arrivals:${stopCode}`); // Tight coupling!
  // ...
};
```

### DRY (Don't Repeat Yourself)

**Example: Reusable API caller**
```typescript
// Generic API caller with error handling and caching
const callApi = <TReq, TRes, TData>(
  fetch: (req: TReq) => Promise<TRes>,
  parse: (res: TRes) => Either<AppError, TData>,
  cache?: { key: string; ttl: number }
) => async (req: TReq): Promise<Either<AppError, TData>> => {
  // Check cache if provided
  if (cache) {
    const cached = cacheStore.get<TData>(cache.key);
    if (cached) return right(cached);
  }

  // Fetch from API
  try {
    const response = await fetch(req);
    const parsed = parse(response);

    // Cache if successful and cache config provided
    if (cache && isRight(parsed)) {
      cacheStore.set(cache.key, parsed.right, cache.ttl);
    }

    return parsed;
  } catch (error) {
    return left({ type: 'API_ERROR', message: error.message });
  }
};

// Reuse for all APIs
const getMetro = callApi(fetchMetro, parseMetro, { key: 'metro', ttl: 30 });
const getEmt = callApi(fetchEmt, parseEmt, { key: 'emt', ttl: 10 });
const getAdif = callApi(fetchAdif, parseAdif, { key: 'adif', ttl: 10 });
```

### KISS (Keep It Simple, Stupid)

**Principles:**
1. Use descriptive names
2. Functions should be < 20 lines
3. Avoid clever tricks
4. Prefer readability over performance (optimize later if needed)

```typescript
// ✅ Simple and clear
const isMetroStop = (code: string): boolean =>
  code.startsWith('par_4_');

// ❌ Too clever
const isMetroStop = (code: string): boolean =>
  /^par_4_\d+$/.test(code) && code.length > 6 && !code.includes('_5_');
```

### Key Libraries for FP in TypeScript

**Required:**
- `fp-ts`: Full functional programming library (Either, Option, Task, etc.)
- `io-ts`: Runtime type validation (functional)

**Optional but helpful:**
- `fast-check`: Property-based testing
- `ramda`: Additional FP utilities
- `monocle-ts`: Lenses and optics for immutable updates

### Domain-Driven Design (DDD)

**DDD Layers:**

1. **Domain Layer** (🏛️ Core business logic)
   - Contains business rules, independent of technical concerns
   - No dependencies on infrastructure or frameworks
   - Pure functions only

2. **Application Layer** (🎯 Use cases / orchestration)
   - Coordinates domain objects to fulfill use cases
   - Thin layer, delegates to domain layer
   - Defines ports (interfaces) for infrastructure

3. **Infrastructure Layer** (🔧 Technical implementation)
   - Implements ports defined in application layer
   - Handles external systems (APIs, databases, cache)
   - All I/O operations here

4. **Presentation Layer** (🖥️ User interface / MCP tools)
   - Adapts domain for external consumption
   - Formats responses, validates inputs
   - MCP tool definitions

**DDD Patterns:**

**Entities** - Objects with identity
```typescript
// domain/entities/Stop.ts
export class Stop {
  private constructor(
    readonly code: StopCode,      // Value object
    readonly name: string,
    readonly coordinates: Coordinates,
    readonly mode: TransportMode
  ) {}

  static create(props: {
    code: string;
    name: string;
    lat: number;
    lon: number;
    mode: TransportMode;
  }): Either<DomainError, Stop> {
    const stopCode = StopCode.create(props.code);
    if (isLeft(stopCode)) return stopCode;

    const coordinates = Coordinates.create(props.lat, props.lon);
    if (isLeft(coordinates)) return coordinates;

    return right(new Stop(
      stopCode.right,
      props.name,
      coordinates.right,
      props.mode
    ));
  }

  matchesName(query: string): boolean {
    return this.name.toLowerCase().includes(query.toLowerCase());
  }
}
```

**Value Objects** - Immutable, no identity
```typescript
// domain/value-objects/StopCode.ts
export class StopCode {
  private constructor(private readonly value: string) {}

  static create(value: string): Either<DomainError, StopCode> {
    if (!value || value.trim().length === 0) {
      return left(new InvalidStopCodeError('Stop code cannot be empty'));
    }
    return right(new StopCode(value.trim()));
  }

  getValue(): string {
    return this.value;
  }

  equals(other: StopCode): boolean {
    return this.value === other.value;
  }

  isMetro(): boolean {
    return this.value.startsWith('par_4_');
  }

  isTrain(): boolean {
    return this.value.startsWith('par_5_');
  }
}
```

**Domain Services** - Operations that don't belong to entities
```typescript
// domain/services/stop-resolver-service.ts
import { pipe } from 'fp-ts/function';
import { Either } from 'fp-ts/Either';
import { Option } from 'fp-ts/Option';

export const resolveStop = (
  stops: readonly Stop[],
  query: string
): Either<StopNotFoundError, Stop> => pipe(
  findExactMatch(stops, query),
  fold(
    () => findFuzzyMatch(stops, query),
    (stop) => some(stop)
  ),
  fold(
    () => left(new StopNotFoundError(query)),
    (stop) => right(stop)
  )
);

const findExactMatch = (
  stops: readonly Stop[],
  query: string
): Option<Stop> =>
  option.fromNullable(
    stops.find(s => s.name.toLowerCase() === query.toLowerCase())
  );

const findFuzzyMatch = (
  stops: readonly Stop[],
  query: string,
  threshold: number = 0.8
): Option<Stop> => {
  const matches = stops
    .map(stop => ({
      stop,
      score: calculateSimilarity(stop.name, query)
    }))
    .filter(m => m.score >= threshold)
    .sort((a, b) => b.score - a.score);

  return matches.length > 0
    ? some(matches[0].stop)
    : none;
};
```

**Repositories** - Abstractions for data access
```typescript
// domain/repositories/IStopRepository.ts
export interface IStopRepository {
  findByCode(code: StopCode): Promise<Option<Stop>>;
  findByName(name: string): Promise<readonly Stop[]>;
  findByMode(mode: TransportMode): Promise<readonly Stop[]>;
  findAll(): Promise<readonly Stop[]>;
}

// infrastructure/repositories/GtfsStopRepository.ts
export class GtfsStopRepository implements IStopRepository {
  constructor(private readonly gtfsStore: GtfsStore) {}

  async findByCode(code: StopCode): Promise<Option<Stop>> {
    const rawStop = this.gtfsStore.getStop(code.getValue());
    if (!rawStop) return none;

    const stop = Stop.create({
      code: rawStop.stop_id,
      name: rawStop.stop_name,
      lat: rawStop.stop_lat,
      lon: rawStop.stop_lon,
      mode: parseMode(rawStop.stop_id)
    });

    return fold(
      () => none,
      (s) => some(s)
    )(stop);
  }

  // ... other methods
}
```

**Use Cases** - Application-specific business rules
```typescript
// application/use-cases/get-metro-arrivals/GetMetroArrivalsUseCase.ts
export class GetMetroArrivalsUseCase {
  constructor(
    private readonly stopRepository: IStopRepository,
    private readonly metroApi: IMetroApiPort,
    private readonly cache: ICachePort
  ) {}

  async execute(
    command: GetMetroArrivalsCommand
  ): Promise<Either<DomainError, GetMetroArrivalsResult>> {
    return pipe(
      // 1. Resolve stop
      await this.resolveStop(command.station),

      // 2. Fetch arrivals
      bindAsync(stop => this.fetchArrivals(stop)),

      // 3. Filter by criteria
      map(arrivals => this.filterArrivals(arrivals, command)),

      // 4. Sort and limit
      map(arrivals => this.sortAndLimit(arrivals, command.count)),

      // 5. Map to result DTO
      map(arrivals => ArrivalMapper.toResult(arrivals))
    );
  }

  private async resolveStop(
    query: string
  ): Promise<Either<StopNotFoundError, Stop>> {
    const stops = await this.stopRepository.findByMode(TransportMode.Metro);
    return resolveStop(stops, query);
  }

  private async fetchArrivals(
    stop: Stop
  ): Promise<Either<ApiError, readonly Arrival[]>> {
    const cacheKey = `metro:${stop.code.getValue()}`;

    return pipe(
      this.cache.get<Arrival[]>(cacheKey),
      fold(
        () => this.fetchAndCache(stop, cacheKey),
        (cached) => Promise.resolve(right(cached))
      )
    );
  }

  private filterArrivals(
    arrivals: readonly Arrival[],
    command: GetMetroArrivalsCommand
  ): readonly Arrival[] {
    let filtered = arrivals;

    if (command.line) {
      filtered = arrivals.filter(a => a.line.equals(command.line));
    }

    if (command.direction) {
      filtered = directionFilterService.filter(filtered, command.direction);
    }

    return filtered;
  }

  private sortAndLimit(
    arrivals: readonly Arrival[],
    count: number = 2
  ): readonly Arrival[] {
    return pipe(
      arrivals,
      arrivalSorterService.sortByTime,
      (sorted) => sorted.slice(0, count)
    );
  }
}
```

**Ports & Adapters (Hexagonal Architecture)**
```typescript
// application/ports/IMetroApiPort.ts (Port - interface)
export interface IMetroApiPort {
  fetchArrivals(stopCode: StopCode): Promise<Either<ApiError, readonly Arrival[]>>;
}

// infrastructure/api-adapters/metro/MetroApiAdapter.ts (Adapter - implementation)
export class MetroApiAdapter implements IMetroApiPort {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly parser: MetroResponseParser
  ) {}

  async fetchArrivals(
    stopCode: StopCode
  ): Promise<Either<ApiError, readonly Arrival[]>> {
    const url = `https://serviciosapp.metromadrid.es/servicios/rest/teleindicadores/${stopCode.getValue()}`;

    return pipe(
      await this.httpClient.get(url),
      chain(response => this.parser.parse(response)),
      map(parsed => parsed.arrivals)
    );
  }
}
```

**Dependency Injection Container**
```typescript
// config/di-container.ts
import { Container } from 'inversify';

export const container = new Container();

// Infrastructure
container.bind<IStopRepository>('IStopRepository').to(GtfsStopRepository);
container.bind<IMetroApiPort>('IMetroApiPort').to(MetroApiAdapter);
container.bind<ICachePort>('ICachePort').to(CacheAdapter);

// Use Cases
container.bind<GetMetroArrivalsUseCase>('GetMetroArrivalsUseCase').to(GetMetroArrivalsUseCase);
container.bind<GetBusArrivalsUseCase>('GetBusArrivalsUseCase').to(GetBusArrivalsUseCase);
container.bind<GetTrainArrivalsUseCase>('GetTrainArrivalsUseCase').to(GetTrainArrivalsUseCase);

// MCP Tools
container.bind<GetMetroArrivalsTool>('GetMetroArrivalsTool').to(GetMetroArrivalsTool);
```

**Naming Conventions (DDD):**

- **Entities**: `Stop`, `Line`, `Station` (nouns, PascalCase)
- **Value Objects**: `StopCode`, `LineNumber`, `Direction` (nouns, PascalCase)
- **Services**: `stop-resolver-service.ts`, `line-matching-service.ts` (kebab-case)
- **Use Cases**: `GetMetroArrivalsUseCase` (Verb + Noun + UseCase)
- **Commands**: `GetMetroArrivalsCommand` (input DTO for use case)
- **Results**: `GetMetroArrivalsResult` (output DTO from use case)
- **Repositories**: `IStopRepository`, `GtfsStopRepository` (interface with I prefix)
- **Ports**: `IMetroApiPort`, `ICachePort` (interface with I prefix, Port suffix)
- **Adapters**: `MetroApiAdapter`, `CacheAdapter` (Adapter suffix)
- **Errors**: `StopNotFoundError`, `ApiError` (Error suffix)

**DDD Benefits for This Project:**

1. **Clear boundaries**: Domain logic is isolated and testable
2. **Flexibility**: Easy to swap implementations (ADIF ↔ CRTM fallback)
3. **Maintainability**: Each layer has single responsibility
4. **Testability**: Pure domain functions, mocked infrastructure
5. **Understandability**: Ubiquitous language (Stop, Line, Arrival, etc.)

### Testing Strategy for FP

**Pure functions = Easy to test:**
```typescript
// No mocking needed!
describe('formatMetroTime', () => {
  it('formats times under 10 minutes as relative', () => {
    expect(formatMetroTime(180)).toBe('en 3 minutos');
  });

  it('formats times over 10 minutes as absolute', () => {
    expect(formatMetroTime(720)).toBe('a las 10:12');
  });
});
```

**Property-based testing:**
```typescript
import * as fc from 'fast-check';

describe('parseMetroResponse', () => {
  it('always returns valid Arrival objects', () => {
    fc.assert(
      fc.property(
        fc.record({ /* metro response shape */ }),
        (response) => {
          const result = parseMetroResponse(response);
          return isRight(result) || isLeft(result);
        }
      )
    );
  });
});
```

## Debug System

Implement a comprehensive debug system with levels:

```typescript
// utils/logger.ts
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  VERBOSE = 3,
  DEBUG = 4
}

class Logger {
  log(level: LogLevel, message: string, data?: any) {
    if (!DEBUG || level > currentLevel) return;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      data
    }));
  }
}

// Usage
logger.debug('Resolving stop name', { query: 'Colombia', matches: [...] });
logger.info('API call', { url, duration: 234 });
logger.error('API failed', { error, retryCount: 3 });
```

### Debug Flag Usage

```bash
# No debug output
npm start

# Basic debug
DEBUG=true npm start

# Verbose debug (all API calls, cache hits/misses)
DEBUG=true DEBUG_LEVEL=verbose npm start

# Full debug (include API responses)
DEBUG=true DEBUG_LEVEL=debug npm start
```

### What to Log

**DEBUG level**:
- Raw API requests and responses
- GTFS data parsing details
- Cache operations (get/set/hit/miss)

**VERBOSE level**:
- Stop resolution process
- Line/direction matching
- API call durations
- Cache statistics

**INFO level**:
- MCP tool invocations
- Successful API calls
- Major operations (GTFS load, etc.)

**WARN level**:
- API timeouts (with fallback)
- Missing optional data
- Deprecated endpoint usage

**ERROR level**:
- API failures
- Invalid user input
- System errors

## Error Handling Strategy

### User-Facing Errors (via MCP)
```typescript
{
  error: true,
  message: "No se encontró la estación 'Colombiaa'. ¿Quisiste decir 'Colombia'?",
  suggestions: ["Colombia", "Colombia (L8)", "Colombia (L9)"]
}
```

### Internal Errors (logged)
```typescript
logger.error('Metro API failed', {
  url: 'https://...',
  statusCode: 500,
  error: err.message,
  retryCount: 3
});
```

### Fallback Strategy
1. Try primary API (e.g., ADIF for trains)
2. If fails, try fallback API (e.g., CRTM SOAP)
3. If both fail, return GTFS scheduled times (if available)
4. If no data, return helpful error with suggestions

## Important Notes

### GTFS Data
- Located in `transport-data/` directory
- Already downloaded and extracted
- Load on server start into memory or SQLite
- Use fuzzy matching for stop names (users make typos)

### API Credentials
- **Metro**: No credentials needed
- **EMT**: Register at https://openapi.emtmadrid.es/ for your own credentials
- **ADIF**: Hardcoded in code (from Android app reverse engineering)
- **CRTM**: Hardcoded private key in code

### Caching Strategy
- **Metro**: 30 seconds (real-time data)
- **EMT Bus**: 10 seconds (real-time data)
- **Trains**: 10 seconds (real-time data)
- **GTFS**: 24 hours (static data)
- **EMT Token**: 50 minutes (expires at 60 minutes)

### Time Formats
- **Metro API**: Returns seconds → convert to minutes
- **EMT API**: Returns seconds → convert to minutes
- **ADIF API**: Returns milliseconds epoch + delay in seconds
- **Avanza API**: Returns absolute time (HH:mm:ss)

Always return to user in natural language:
- "en 3 minutos" (< 10 min)
- "a las 10:15" (> 10 min)
- "en menos de 1 minuto" (< 60 seconds)

### MCP Response Format

Always structure responses for easy parsing by AI:

```typescript
// Good - structured data
{
  success: true,
  station: "Colombia",
  line: "8",
  arrivals: [
    { destination: "Nuevos Ministerios", time: "3 minutos", platform: "1" },
    { destination: "Nuevos Ministerios", time: "10 minutos", platform: "1" }
  ]
}

// Bad - unstructured text
{
  success: true,
  message: "Los próximos trenes llegan en 3 y 10 minutos"
}
```

The AI assistant will format the final response to the user in natural language.

## Testing Strategy

### Unit Tests
- Stop name resolver
- Line resolver
- Time formatters
- GTFS parsers

### Integration Tests
- Metro API (live)
- EMT API (live, requires credentials)
- Cache behavior
- Error handling

### Mock Data for Testing
Create mock responses in `tests/fixtures/`:
- `metro-response.json`
- `emt-response.json`
- `gtfs-stops.txt`

### Manual Testing Queries
```
✓ "Colombia dirección Nuevos Ministerios"
✓ "parada 3000"
✓ "bus 27 en Plaza de Castilla"
✓ "próximo tren de Atocha"
✓ "Colombiaa" (typo - should suggest Colombia)
```

## Performance Targets

- Stop name resolution: < 50ms
- API call (cached): < 5ms
- API call (uncached): < 2s
- GTFS load on startup: < 5s
- Memory usage: < 200MB

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] GraphQL API alongside MCP
- [ ] Multi-city support (Barcelona, Valencia)
- [ ] Route planning (A to B with transfers)
- [ ] Accessibility information
- [ ] Service alerts and incidents
- [ ] Historical data analysis
- [ ] Predictive arrival times (ML)

## References

- **MCP Specification**: https://modelcontextprotocol.io/
- **GTFS Specification**: https://gtfs.org/
- **Transport Data & APIs**: See `transport-data/` directory
  - `transport-data/README.md` - Overview
  - `transport-data/metro/ENDPOINTS.md` - Metro API docs
  - `transport-data/bus/ENDPOINTS.md` - Bus APIs docs
  - `transport-data/train/ENDPOINTS.md` - Train API docs

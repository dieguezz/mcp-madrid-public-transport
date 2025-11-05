# Madrid Transport MCP Server 🚇🚌🚆

A Model Context Protocol (MCP) server providing **real-time** public transportation information for Madrid, Spain.

Built with TypeScript, following Clean Architecture principles (DDD + Hexagonal Architecture) and functional programming patterns.

## ✨ Features

- **🚇 Metro Madrid** - Real-time arrivals via official Metro API
- **🚌 EMT Buses** - Real-time arrivals via EMT OpenAPI
- **🚆 Cercanías Trains** - Real-time positions via Renfe GTFS Realtime feed
- **📊 GTFS Integration** - Static schedule data from CRTM
- **⚡ Optimized Performance** - SQLite caching, sub-second response times
- **🔍 Smart Station Resolution** - Fuzzy matching for station names

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** or yarn

### Installation

```bash
git clone <repository-url>
cd mcp-madrid-public-transport
npm install
```

**Note**: GTFS data files are stored compressed (`.txt.zip`) in the repository to reduce size. The `npm install` script automatically decompresses them via the `postinstall` hook. If you need to manually decompress:

```bash
npm run setup:data
```

### Configuration

Create a `.env` file in the project root:

```bash
# Required for EMT buses only
EMT_CLIENT_ID=your_client_id_here
EMT_PASS_KEY=your_pass_key_here

# Optional: Debug logging
DEBUG=false
DEBUG_LEVEL=info  # error | warn | info | verbose | debug

# Optional: Data paths
GTFS_DATA_PATH=./transport-data
```

**How to get EMT credentials** (FREE):

1. Visit https://openapi.emtmadrid.es/
2. Click "Register" and create an account
3. Log in and go to "My Account" > "My Applications"
4. Create a new application
5. Copy your `Client ID` and `Pass Key` to the `.env` file

**Note**: Metro and train data are publicly available and don't require credentials.

### Build & Run

```bash
# Build TypeScript
npm run build

# Start MCP server
npm start

# Development mode with auto-reload
npm run dev
```

## 🔧 Client Configuration

This MCP server can be used with any MCP-compatible client. Below are instructions for the most common clients.

### Claude Desktop

Add the server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

#### Configuration

**Quick setup**: Copy and edit the example configuration file:

```bash
# macOS
cp claude_desktop_config.example.json ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Windows (PowerShell)
Copy-Item claude_desktop_config.example.json $env:APPDATA\Claude\claude_desktop_config.json

# Then edit the file to add your EMT credentials and update the path
```

**Manual configuration**:

```json
{
  "mcpServers": {
    "madrid-transport": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-madrid-public-transport/dist/index.js"
      ],
      "env": {
        "EMT_CLIENT_ID": "your_emt_client_id_here",
        "EMT_PASS_KEY": "your_emt_pass_key_here"
      }
    }
  }
}
```

**Important**:
- Replace `/absolute/path/to/mcp-madrid-public-transport` with the actual path where you cloned this repository
- Add your EMT credentials (get them free at https://openapi.emtmadrid.es/)
- Make sure you've run `npm install` and `npm run build` first

#### Docker Option (Alternative)

If you prefer to use Docker, first build the image:

```bash
docker build -t mcp-madrid-transport .
```

Then configure Claude Desktop:

```json
{
  "mcpServers": {
    "madrid-transport": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e", "EMT_CLIENT_ID=your_emt_client_id_here",
        "-e", "EMT_PASS_KEY=your_emt_pass_key_here",
        "mcp-madrid-transport"
      ]
    }
  }
}
```

**After configuration:**

1. Restart Claude Desktop
2. Look for the 🔨 hammer icon in the bottom right
3. Click to see available tools: `get_metro_arrivals`, `get_bus_arrivals`, `get_train_arrivals`
4. Start asking questions about Madrid public transport!

### Example Queries

Once configured, you can ask Claude:

- "¿Cuánto tarda el metro en llegar a Colombia?"
- "¿Qué autobuses pasan por la parada 3000?"
- "¿Cuándo sale el próximo tren de Atocha hacia Fuenlabrada?"
- "Show me the next 5 metro arrivals at Sol station"
- "Are there any buses arriving at Plaza de Castilla in the next 10 minutes?"

### Other MCP Clients

For other MCP clients (like `mcp-client-cli`, custom implementations, etc.), use the stdio transport:

```bash
node dist/index.js
```

The server communicates via stdin/stdout using JSON-RPC 2.0 protocol.

## 📡 MCP Tools

### `get_metro_arrivals`

Get real-time Metro arrivals at a station.

**Parameters:**
```typescript
{
  station: string;      // Station name or code (e.g., "Colombia", "par_4_211")
  line?: string;       // Optional: Line number (e.g., "8", "L8")
  direction?: string;  // Optional: Direction/destination
  count?: number;      // Number of arrivals (default: 2, max: 10)
}
```

**Example:**
```json
{
  "station": "Colombia",
  "line": "8",
  "count": 3
}
```

**Response:**
```json
{
  "success": true,
  "station": "COLOMBIA",
  "stationCode": "par_4_156",
  "arrivals": [
    {
      "line": "8",
      "destination": "Nuevos Ministerios",
      "estimatedTime": "2 minutos",
      "platform": "1"
    }
  ]
}
```

### `get_bus_arrivals`

Get real-time bus arrivals at a stop.

**Parameters:**
```typescript
{
  stop: string;        // Stop name or number (e.g., "Plaza de Castilla", "3000")
  line?: string;      // Optional: Line number (e.g., "27")
  direction?: string; // Optional: Direction/destination
  count?: number;     // Number of arrivals (default: 2)
}
```

**Example:**
```json
{
  "stop": "3000",
  "line": "27",
  "count": 2
}
```

**Response:**
```json
{
  "success": true,
  "stop": "Plaza de Castilla",
  "arrivals": [
    {
      "line": "27",
      "destination": "Embajadores",
      "estimatedTime": "5 minutos",
      "distance": 1200
    }
  ]
}
```

### `get_train_arrivals`

Get real-time Cercanías train positions and arrivals.

**Parameters:**
```typescript
{
  station: string;     // Station name or code (e.g., "Atocha", "10100")
  line?: string;      // Optional: Line (e.g., "C-2")
  direction?: string; // Optional: Destination
  count?: number;     // Number of arrivals (default: 2)
}
```

**Example:**
```json
{
  "station": "Atocha",
  "line": "C-5",
  "count": 3
}
```

**Response:**
```json
{
  "success": true,
  "station": "Atocha",
  "arrivals": [
    {
      "line": "C-5",
      "destination": "Fuenlabrada",
      "platform": "4",
      "departureTime": "14:35",
      "status": "on_time"
    }
  ]
}
```

## 🗂️ Data Sources

### Metro de Madrid
- **API**: Official Metro de Madrid teleindicadores API
- **Endpoint**: `https://serviciosapp.metromadrid.es`
- **Authentication**: None required ✅
- **Data**: Real-time arrivals, platforms, destinations
- **Update frequency**: ~30 seconds

### EMT (Empresa Municipal de Transportes)
- **API**: EMT OpenAPI v2
- **Endpoint**: `https://openapi.emtmadrid.es`
- **Authentication**: OAuth (Client ID + Pass Key) 🔑
- **Data**: Real-time arrivals, distances, incidents
- **Update frequency**: ~10 seconds
- **Coverage**: Urban buses in Madrid city

### Renfe Cercanías
- **API**: Renfe GTFS Realtime (Official Open Data)
- **Endpoint**: `https://gtfsrt.renfe.com/vehicle_positions.json`
- **Authentication**: ✅ None required (public API)
- **Data**: Real-time vehicle positions, trip information, current stop
- **Update frequency**: ~30 seconds
- **License**: CC-BY-4.0 (open data)
- **Source**: https://data.renfe.com/dataset/ubicacion-vehiculos
- **Coverage**: All Spain (filter Madrid by trip IDs starting with "10")

### CRTM (Static Data)
- **Format**: GTFS (General Transit Feed Specification)
- **Data**: Schedules, routes, stops, station mappings
- **Update frequency**: Monthly

## 🏗️ Architecture

The project follows **Clean Architecture** principles with **Domain-Driven Design (DDD)** and **Hexagonal Architecture** patterns.

```
src/
├── index.ts                 # Application entry point & MCP server setup
│
├── transport/               # 🚇🚌🚆 TRANSPORT DOMAIN (Bounded Context)
│   ├── metro/              # Metro subdomain
│   │   ├── domain/         # Entities, value objects, interfaces
│   │   ├── application/    # Use cases (GetMetroArrivalsUseCase)
│   │   └── infrastructure/ # API adapters, repositories
│   │
│   ├── bus/                # Bus subdomain
│   │   ├── domain/
│   │   ├── application/    # Use cases (GetBusArrivalsUseCase)
│   │   └── infrastructure/ # EMT API adapter, auth
│   │
│   ├── train/              # Train subdomain
│   │   ├── domain/
│   │   ├── application/    # Use cases (GetTrainArrivalsUseCase)
│   │   └── infrastructure/ # Renfe GTFS-RT adapter
│   │
│   └── shared/             # Shared domain types
│       └── domain/         # Coordinates, TransportMode, etc.
│
├── mcp/                    # 🔌 MCP TOOLS
│   ├── tools/             # Tool implementations
│   │   ├── get-metro-arrivals.ts
│   │   ├── get-bus-arrivals.ts
│   │   └── get-train-arrivals.ts
│   ├── formatters/        # Output formatting
│   └── validators/        # Input validation
│
├── gtfs/                  # 📊 GTFS DATA MANAGEMENT
│   ├── domain/           # GTFS entities (Stop, Route, Trip)
│   └── infrastructure/   # File loaders, SQLite repository
│
├── cache/                # 💾 CACHING LAYER
│   ├── domain/
│   └── infrastructure/   # InMemoryCache implementation
│
└── common/               # 🔧 SHARED UTILITIES
    ├── http/            # HTTP client, retry policies
    ├── logger/          # Logging (Console, File, Combined)
    ├── functional/      # Either, Option, pipe utilities
    └── config/          # Environment configuration
```

### Key Design Patterns

- **Domain-Driven Design (DDD)**: Clear domain boundaries for each transport type
- **Hexagonal Architecture**: Domain independent from infrastructure
- **Functional Programming**: Either monad for error handling, pure functions
- **SOLID Principles**: Single responsibility, dependency inversion
- **Repository Pattern**: Abstract data access
- **Adapter Pattern**: External APIs → Domain models

## ⚡ Performance Optimizations

### Sprint 1 Optimizations (Completed ✅)

- **SQLite Persistent DB**: Loads GTFS data once on startup (~8ms queries vs 4500ms before)
- **GTFS-RT Cache**: Global 60-second cache for Renfe feed (0ms vs 200ms per request)
- **LRU Cache**: Trip destination queries cached (2ms vs 1000ms)
- **Station Mapper**: All 111 Cercanías stations pre-loaded (<1ms lookup)

**Result**: ~1000x performance improvement (3ms end-to-end vs 3750ms before)

## 🛠️ Development

### Running Tests

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Format code
npm run format
```

### Debug Mode

Enable verbose logging:

```bash
DEBUG=true DEBUG_LEVEL=debug npm start
```

Log levels: `error` | `warn` | `info` | `verbose` | `debug`

### Project Structure

- `src/` - TypeScript source code
- `dist/` - Compiled JavaScript (generated)
- `transport-data/` - GTFS static data files (compressed as `.txt.zip`)
- `*.db` - SQLite databases (generated on first run, ~246MB)

### GTFS Data Management

**Compression Workflow**

To reduce repository size, large GTFS data files (>100KB) are stored compressed:

```bash
# Compress all large GTFS files to .txt.zip
npm run compress:data

# Decompress all .txt.zip files
npm run setup:data
```

**Automatic Decompression**
- **npm install**: Automatically runs `postinstall` hook → decompresses GTFS files and SQLite databases
- **Docker build**: Dockerfile runs decompression script during image build
- **First run**: Application uses the decompressed `gtfs-static.db` database

**File Sizes**
- Uncompressed GTFS data: ~1.2GB
- Compressed GTFS (`.txt.zip`): ~150MB (stored in Git)
- Uncompressed SQLite database: ~246MB
- Compressed database (`gtfs-static.db.zip`): ~51MB (stored in Git)
- **Total compressed in Git**: ~200MB
- **Total uncompressed locally**: ~1.4GB

**Git Configuration**
- `.gitignore` excludes `*.txt` files (uncompressed GTFS)
- `.gitignore` allows `*.txt.zip` files (compressed GTFS)
- `.gitignore` excludes `*.db` files (uncompressed SQLite databases)
- `.gitignore` allows `*.db.zip` files (compressed databases)
- `.dockerignore` properly configured for Docker builds

## 📝 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMT_CLIENT_ID` | For buses | - | EMT API client ID |
| `EMT_PASS_KEY` | For buses | - | EMT API pass key |
| `DEBUG` | No | `false` | Enable debug logging |
| `DEBUG_LEVEL` | No | `info` | Log level |
| `GTFS_DATA_PATH` | No | `./transport-data` | Path to GTFS data |
| `METRO_API_URL` | No | Official URL | Override Metro API URL |
| `EMT_API_URL` | No | Official URL | Override EMT API URL |
| `CACHE_TTL_METRO` | No | `30` | Metro cache TTL (seconds) |
| `CACHE_TTL_BUS` | No | `10` | Bus cache TTL (seconds) |
| `CACHE_TTL_TRAIN` | No | `10` | Train cache TTL (seconds) |

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🙏 Credits & Acknowledgments

### Data Providers

- **Metro de Madrid** - Real-time Metro API and static data
- **EMT Madrid** - Real-time bus arrivals API
- **Renfe** - GTFS Realtime feed (Open Data CC-BY-4.0)
- **CRTM (Consorcio Regional de Transportes de Madrid)** - GTFS static data for all transport modes
- **xBaank/MadridTransporte-Backup** - GTFS data repository

### Development

- **Built with Claude** 🤖 - This project was developed with significant assistance from Claude (Anthropic), an AI assistant that helped with:
  - Architecture design (DDD + Hexagonal Architecture)
  - TypeScript implementation and functional programming patterns
  - API integration (Metro, EMT, Renfe GTFS-RT)
  - Performance optimizations (1000x speedup)
  - Code review and best practices
  - Documentation

### Technologies

- **TypeScript** - Type-safe JavaScript
- **Node.js** - Runtime environment
- **MCP SDK** (@modelcontextprotocol/sdk) - Model Context Protocol
- **fp-ts** - Functional programming utilities
- **better-sqlite3** - Fast SQLite3 bindings
- **csv-parse** - GTFS CSV parsing
- **zod** - Runtime type validation

---

**Made with ❤️ in Madrid, for Madrid**

*Real-time public transport data at your fingertips*

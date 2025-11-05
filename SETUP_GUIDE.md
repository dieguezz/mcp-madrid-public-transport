# Setup Guide - Madrid Transport MCP Server

Quick installation and configuration guide.

## Prerequisites

- Node.js >= 20.0.0
- npm >= 9.0.0
- (Optional) Docker Desktop to run in container

## Local Installation

### 1. Clone the repository

```bash
git clone https://github.com/dieguezz/mcp-madrid-public-transport.git
cd mcp-madrid-public-transport
```

### 2. Install dependencies

```bash
npm install
```

**Note**: This step automatically decompresses the necessary GTFS files (via postinstall hook).

### 3. Configure environment variables

Create a `.env` file in the project root:

```bash
# Optional - Debug
DEBUG=false
DEBUG_LEVEL=info

# Required - EMT API (only for buses)
# Free registration at: https://openapi.emtmadrid.es/
EMT_CLIENT_ID=your_client_id_here
EMT_PASS_KEY=your_passkey_here

# Optional - Cache TTL (seconds)
CACHE_TTL_METRO=30
CACHE_TTL_BUS=10
CACHE_TTL_TRAIN=10

# Optional - Paths
GTFS_DATA_PATH=./transport-data
```

**Metro and Trains DO NOT require credentials** - Only EMT buses need API keys.

### 4. Compile TypeScript

```bash
npm run build
```

### 5. Run the server

```bash
npm start
```

The MCP server will be listening on stdio (standard input/output).

## Docker Installation

### 1. Build the image

```bash
docker build -t mcp-madrid-transport .
```

### 2. Run the container

```bash
docker run -it \
  -e EMT_CLIENT_ID=your_client_id \
  -e EMT_PASS_KEY=your_passkey \
  mcp-madrid-transport
```

## Get EMT Credentials

EMT credentials are **FREE** and only needed to query buses:

1. Visit https://openapi.emtmadrid.es/
2. Click "Register" (Registrarse)
3. Complete the registration form
4. Verify your email
5. Log in
6. Go to "My Account" (Mi Cuenta) > "My Applications" (Mis Aplicaciones)
7. Create a new application
8. Copy your `Client ID` and `Pass Key`
9. Add them to your `.env` file or Docker environment variables

**EMT API Limits**:
- Free for personal use
- ~10,000 calls/day
- No official support

**Important**: Never share your credentials publicly or commit them to version control.

## Verify Installation

### Quick Test - Metro

```bash
# Should list available tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm start
```

Should return:

```json
{
  "tools": [
    {
      "name": "get_metro_arrivals",
      "description": "Get real-time arrival times for Madrid Metro..."
    },
    {
      "name": "get_bus_arrivals",
      "description": "Get real-time arrival times for buses..."
    },
    {
      "name": "get_train_arrivals",
      "description": "Get real-time arrival times for Cercanías..."
    }
  ]
}
```

## Use with Claude Desktop

### 1. Install the MCP Server

```bash
# Build and install globally
npm run build
npm link
```

### 2. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "madrid-transport": {
      "command": "mcp-madrid-public-transport",
      "env": {
        "EMT_CLIENT_ID": "your_client_id",
        "EMT_PASS_KEY": "your_passkey"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Madrid transport tools will be available in Claude.

## Usage Examples

Once configured in Claude Desktop, you can ask:

```
"When does the next metro arrive at Colombia towards Nuevos Ministerios?"

"What buses stop at Plaza de Castilla and when do they arrive?"

"When does the next train leave from Atocha to Fuenlabrada?"
```

## Development

### Run in development mode (with auto-reload)

```bash
npm run dev
```

### Run tests

```bash
npm test
```

### Lint and format

```bash
npm run lint
npm run format
```

## GTFS Data Management

Large GTFS files (>100KB) are stored compressed in Git.

### Manually decompress data

```bash
npm run setup:data
```

### Update GTFS data

```bash
# 1. Download new data and replace files
# 2. Compress
npm run compress:data

# 3. Remove original .txt files
find transport-data -name '*.txt' -type f -size +100k -delete

# 4. Commit
git add transport-data/**/*.txt.zip
git commit -m "Update GTFS data"
```

See [GTFS_DATA_MANAGEMENT.md](GTFS_DATA_MANAGEMENT.md) for more details.

## Project Structure

```
mcp-madrid-public-transport/
├── src/
│   ├── transport/        # Domain logic by transport type
│   │   ├── metro/
│   │   ├── bus/
│   │   ├── train/
│   │   └── shared/
│   ├── mcp/             # MCP tools
│   ├── gtfs/            # GTFS data handling
│   ├── cache/           # Caching layer
│   └── common/          # Shared utilities
├── transport-data/      # GTFS data (compressed .txt.zip)
├── scripts/             # Setup scripts
├── Dockerfile
├── server.yaml          # MCP Registry configuration
└── tools.json           # MCP tools list
```

## Troubleshooting

### Error: "Cannot find GTFS data"

```bash
# Decompress data
npm run setup:data
```

### Error: "EMT authentication failed"

- Verify that `EMT_CLIENT_ID` and `EMT_PASS_KEY` are correct
- Verify that credentials haven't expired
- Try regenerating credentials in the EMT portal

### Error: "Module not found"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

### GTFS data is outdated

GTFS data should be updated periodically:

- **Metro**: When the network changes (new lines/stations)
- **Bus**: Quarterly (route changes)
- **Train**: Yearly (schedule changes)

Download updated data from:
- Metro: https://www.metromadrid.es/
- EMT: https://opendata.emtmadrid.es/
- CRTM: https://datos.crtm.es/
- Renfe: https://data.renfe.com/

## Support

- **Issues**: https://github.com/dieguezz/mcp-madrid-public-transport/issues
- **Full documentation**: [CLAUDE.md](CLAUDE.md)
- **Docker Registry**: [DOCKER_REGISTRY_SUBMISSION.md](DOCKER_REGISTRY_SUBMISSION.md)
- **GTFS Data**: [GTFS_DATA_MANAGEMENT.md](GTFS_DATA_MANAGEMENT.md)

## License

MIT License - See [LICENSE](LICENSE) for details.

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Install runtime dependencies for better-sqlite3 and unzip for GTFS data
RUN apk add --no-cache sqlite-libs unzip

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy transport data (GTFS files - includes .txt.zip files)
COPY transport-data ./transport-data

# Copy decompression script
COPY scripts/decompress-gtfs-data.sh ./scripts/

# Decompress GTFS data files
RUN chmod +x ./scripts/decompress-gtfs-data.sh && \
    ./scripts/decompress-gtfs-data.sh

# Create directory for logs and database files
RUN mkdir -p /app/logs && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose MCP server via stdio
ENTRYPOINT ["node", "dist/index.js"]

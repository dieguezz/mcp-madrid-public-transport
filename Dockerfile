# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip postinstall - we don't need to decompress in build stage)
RUN npm ci --ignore-scripts

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Install runtime dependencies for better-sqlite3, unzip for GTFS data, curl for healthcheck, and tini
RUN apk add --no-cache sqlite-libs unzip curl tini

WORKDIR /app

# Copy everything needed for postinstall BEFORE npm ci
COPY package*.json ./
COPY transport-data ./transport-data
COPY scripts/decompress-gtfs-data.sh ./scripts/

# Install production dependencies (postinstall will decompress GTFS data)
RUN npm ci --omit=dev

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create directory for logs and database files
RUN mkdir -p /app/logs /app/data && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose HTTP port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the HTTP server
CMD ["node", "dist/index-http.js"]

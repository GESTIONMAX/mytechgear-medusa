# Dockerfile for Medusa v2 Backend - Production Deployment
# Multi-stage build for optimized image size

# ============================================
# Stage 1: Builder - Install dependencies and build
# ============================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies (required for native modules)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
# This compiles TypeScript and builds the admin dashboard
RUN npm run build

# ============================================
# Stage 2: Production - Minimal runtime image
# ============================================
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install runtime dependencies only (for native modules if any)
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/.medusa /app/.medusa
COPY --from=builder /app/dist /app/dist

# Copy configuration files
COPY medusa-config.ts ./
COPY tsconfig.json ./

# Copy source files needed at runtime
COPY src ./src

# Create uploads directory for file storage
RUN mkdir -p /app/uploads && chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose port 9000 (default Medusa port)
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:9000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the Medusa server
CMD ["npm", "start"]

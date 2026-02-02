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

# Set environment variables needed for build
# These are temporary and won't persist to runtime
ENV NODE_ENV=production \
    MEDUSA_ADMIN_ONBOARDING_TYPE=default

# Build the application
# This compiles TypeScript and builds the admin dashboard
RUN npm run build && \
    echo "=== Verifying build output ===" && \
    ls -la .medusa/ && \
    ls -la .medusa/server/public/ || echo "No public directory" && \
    find .medusa -name "index.html" || echo "No index.html found"

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

# Verify admin build was copied
RUN echo "=== Verifying admin build in production stage ===" && \
    ls -la .medusa/ && \
    ls -la .medusa/server/ && \
    if [ ! -f .medusa/server/public/admin/index.html ]; then \
        echo "ERROR: Admin index.html not found!" && exit 1; \
    fi && \
    echo "✓ Admin build verified"

# Copy configuration files
COPY medusa-config.js ./
COPY tsconfig.json ./

# Copy source files needed at runtime
COPY src ./src

# Create uploads directory for file storage
RUN mkdir -p /app/uploads && chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose port 9000 (default Medusa port)
EXPOSE 9000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the Medusa server
CMD ["npm", "start"]

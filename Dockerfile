# syntax=docker/dockerfile:1
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
# Use BuildKit cache to speed up rebuilds
RUN --mount=type=cache,target=/root/.npm \
    npm ci

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

# Install runtime dependencies (dumb-init for process handling, curl/wget for healthcheck)
RUN apk add --no-cache dumb-init curl wget

# Copy package files
COPY package*.json ./

# Copy node_modules from builder instead of npm ci (22min → 30s)
COPY --from=builder /app/node_modules ./node_modules

# Remove devDependencies (much faster than full npm ci)
RUN npm prune --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/.medusa /app/.medusa

# Vérification build — admin optionnel (API-only si DISABLE_MEDUSA_ADMIN=true)
RUN echo "=== Verifying build in production stage ===" && \
    ls -la .medusa/ && \
    ls -la .medusa/server/ && \
    if [ -f .medusa/server/public/admin/index.html ]; then \
        echo "✓ Admin build present (UI enabled)"; \
    else \
        echo "ℹ Admin build absent (API-only mode — DISABLE_MEDUSA_ADMIN=true)"; \
    fi

# Copy configuration files
COPY medusa-config.js ./
COPY tsconfig.json ./

# Note: src files are already compiled in .medusa/server/src
# No need to copy the TypeScript source

# Copy diagnostic script (si présent)
COPY scripts/diagnose-admin.sh ./scripts/
RUN chmod +x ./scripts/diagnose-admin.sh

# Symlink admin (uniquement si les fichiers existent — mode UI enabled)
RUN if [ -d /app/.medusa/server/public ]; then \
        ln -s /app/.medusa/server/public /app/public && \
        echo "✓ Symlink created: /app/public -> /app/.medusa/server/public"; \
    else \
        echo "ℹ No public dir (API-only mode)"; \
    fi

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

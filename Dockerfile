# ─── Stage 1: Build ──────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install ALL dependencies (including native modules)
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN npm ci

# Copy source
COPY . .

# Build frontend (Vite uses root vite.config.ts + root src/)
RUN npx vite build --outDir apps/web/dist

# ─── Stage 2: Production ─────────────────────────────────────────────────
FROM node:22-alpine AS production

# Install runtime deps for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install production deps (with native module compilation)
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN npm ci --omit=dev && \
    npm install tsx --save-exact --no-save

# Remove build tools to reduce image size
RUN apk del python3 make g++

# Copy source (API runs from TypeScript via tsx)
COPY --from=builder /app/packages/shared packages/shared
COPY --from=builder /app/packages/db packages/db
COPY --from=builder /app/apps/api apps/api

# Copy frontend build to serve via Fastify static
COPY --from=builder /app/apps/web/dist apps/web/dist

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/flight_recorder.db

# Render assigns PORT dynamically — do NOT hardcode it
EXPOSE 10000

# Health check uses $PORT at runtime
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:${PORT:-10000}/api/health || exit 1

# Run migrations, seed, then start server
CMD ["sh", "-c", "npx tsx packages/db/src/migrate.ts && npx tsx packages/db/src/seed.ts && npx tsx apps/api/src/index.ts"]

# ─── Stage 1: Build ──────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN npm ci --ignore-scripts

# Copy source
COPY . .

# Build frontend (Vite)
RUN npx vite build --outDir apps/web/dist

# ─── Stage 2: Production ─────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Install production deps + tsx (needed to run TS directly)
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN npm ci --omit=dev --ignore-scripts && \
    npm install tsx --save-exact --no-save

# Copy source (API runs from TypeScript via tsx)
COPY --from=builder /app/packages/shared packages/shared
COPY --from=builder /app/packages/db packages/db
COPY --from=builder /app/apps/api apps/api

# Copy frontend build to serve via Fastify static
COPY --from=builder /app/apps/web/dist apps/web/dist

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=/app/data/flight_recorder.db

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

# Run migrations, seed if empty, then start server
CMD ["sh", "-c", "npx tsx packages/db/src/migrate.ts && npx tsx apps/api/src/index.ts"]

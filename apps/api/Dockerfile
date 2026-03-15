FROM node:22-alpine AS base
WORKDIR /app

# Copy workspace root files
COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY apps/api/package.json apps/api/

# Install dependencies
RUN npm install --workspaces --include-workspace-root

# Copy source
COPY packages/shared/ packages/shared/
COPY packages/db/ packages/db/
COPY apps/api/ apps/api/

# Run migrations and start
EXPOSE 3001
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm run dev:api"]

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/

RUN npm install --workspaces --include-workspace-root

COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

RUN npm run build --workspace=apps/web

FROM nginx:alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

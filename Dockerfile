# syntax=docker/dockerfile:1

# ---- Build stage ----------------------------------------------------------
# Builds both the Vue front-end (vite -> /app/dist) and the Node server
# (tsc -> /app/server).
FROM node:20-alpine AS build
WORKDIR /app

# Install all dependencies first to leverage Docker layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Build the project (front/build + server/build, see package.json "build").
COPY . .
RUN npm run build

# ---- Runtime stage --------------------------------------------------------
# Only ships what is needed to run: the compiled server, the built front and
# the resolved node_modules (kept from the build stage so transitive runtime
# deps such as tslib - used by the compiled server via importHelpers - are
# guaranteed to be present).
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist

# Run in the "prod" environment (Config.PUBLIC_PATH -> ./dist).
RUN printf 'prod' > env.conf

# All runtime data (credentials.json, userList*.json, discord*.json, ...) is
# read/written under ./data. Mount a host folder here so it is editable and
# survives container restarts/rebuilds.
VOLUME ["/app/data"]

EXPOSE 3012

CMD ["node", "server/bootstrap.js"]

# Stage 1: Build server
FROM node:20-alpine AS server-build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
COPY ui/package.json ./ui/
RUN corepack enable && pnpm install --frozen-lockfile --filter @clusterassets/sigops-server
COPY server/ ./server/
RUN cd server && pnpm build

# Stage 2: Build UI
FROM node:20-alpine AS ui-build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
COPY ui/package.json ./ui/
RUN corepack enable && pnpm install --frozen-lockfile --filter @clusterassets/sigops-ui
COPY ui/ ./ui/
RUN cd ui && pnpm build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/package.json ./server/
COPY --from=ui-build /app/ui/dist ./ui/dist
EXPOSE 4200
CMD ["node", "server/dist/index.js"]

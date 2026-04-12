# syntax=docker/dockerfile:1.6
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install --include=dev

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 4200
USER node
CMD ["node", "dist/index.js"]

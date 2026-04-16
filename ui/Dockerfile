# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────
# SigOps — UI (React + Vite)
# Multi-stage build: pnpm install → vite build → nginx runtime
# ─────────────────────────────────────────────────────────────

# ── Stage 1: builder ──
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src ./src

RUN pnpm build

# ── Stage 2: runner ──
FROM nginx:alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --spider http://localhost:80/ || exit 1

USER nginx

CMD ["nginx", "-g", "daemon off;"]

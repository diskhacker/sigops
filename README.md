# SigOps

> The Open Source Infrastructure Execution OS

SigOps is a governed, AI-assisted execution OS that converts any operational signal into safe, automated actions. It observes infrastructure signals (Prometheus, Grafana, Datadog, webhooks, email), matches them against rules, executes workflows written in SEL (SigOps Execution Language), and verifies the outcome — all in a closed loop. The Rust-based agent runs on customer infrastructure with outbound-only WebSocket connections.

---

## Quick Reference

| | |
|---|---|
| **Entity** | SigOps Technologies Pvt Ltd |
| **Repo** | `sigops` |
| **Visibility** | PUBLIC |
| **License** | MIT (Open Source) |
| **Product ID** | `sigops` |
| **Tables** | ~10 |
| **API Endpoints** | ~25 |
| **Backend Port** | 4200 |
| **Frontend Port** | 4201 |
| **Stack** | Hono · Drizzle · PostgreSQL · Redis · Zod · React 18 · MUI · Vite |

---

## What This Product Does

### Core Features (Open Source)

- **Signal Ingestion** — Webhook receiver, Prometheus adapter, email polling, deduplication, fingerprinting
- **Signal Rules Engine** — Pattern matching, severity filtering, regex on titles, JSONPath on body, duration conditions
- **SEL Language** — First-class execution language with .sel files, parser, runtime, tooling
- **Execution Engine** — Closed-loop: signal → match → execute → verify → resolve. Risk scoring, approval gates
- **Agent Gateway** — WebSocket server for Rust agents. Heartbeat, command routing, tool discovery
- **Tool Registry** — Typed, versioned, reusable actions. 5 built-in tools (restart, http, notify_slack, wait, condition)
- **Workflow Engine** — CRUD, scheduling (cron), versioning, tags
- **FlowBuilder** — Visual workflow editor (basic, React Flow based)
- **Adapter Layer** — Coexist with PagerDuty, Datadog, Grafana (bidirectional adapters)
- **Dashboard** — Signal list, execution viewer, agent management, stats

For production features (on-call, war rooms, postmortems, status pages, AI
advisor, knowledge engine, marketplace, enterprise SSO), see the **SigOps
Cloud** section near the end of this README.

---

## Architecture

Full architecture document: `docs/architecture/SigOps-Architecture-v1.2.0.pdf`
Build instructions: `CLAUDE.md` (root of this repo)
Project memory: `docs/memory/memory.md`
Session logs: `docs/session/`

---

## Repository Structure

```
sigops/
├── CLAUDE.md                     # Build instructions for Claude Code
├── CLAUDE-CODE-AUDIT-PROMPT.md   # Universal protocol enforcement
├── README.md                     # This file
├── docker-compose.yml            # PostgreSQL + Redis
├── .env.example                  # Environment variables template
├── .gitignore
├── pnpm-workspace.yaml           # Links server/ + ui/
│
├── server/                       # Hono backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   ├── vitest.config.ts          # Test config (>90% coverage)
│   └── src/
│       ├── index.ts              # App entry + identity-provider registration
│       ├── config/index.ts       # Env validation (Zod)
│       ├── db/
│       │   ├── schema.ts         # ALL Drizzle table definitions
│       │   ├── migrations/       # Drizzle migrations
│       │   └── seed.ts           # Seed data
│       ├── lib/
│       │   ├── uap-client.ts     # @cluster/uap-client (identity provider HTTP client)
│       │   └── auth.ts           # @cluster/auth-middleware
│       ├── modules/
│       │   └── <module>/
│       │       ├── routes.ts     # Hono routes (CRUD + SEARCH)
│       │       ├── service.ts    # Business logic
│       │       ├── validation.ts # Zod schemas
│       │       └── __tests__/    # Unit + integration tests
│       └── shared/
│           ├── types.ts
│           ├── errors.ts
│           ├── pagination.ts
│           └── middleware.ts
│
├── ui/                           # React frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── stores/               # Zustand stores
│       ├── hooks/                # TanStack Query hooks
│       ├── components/           # Shared components (@cluster/ui-kit)
│       ├── pages/                # Route pages (List + Detail + Form)
│       └── lib/
│           ├── api.ts            # Axios wrapper
│           └── auth.ts           # JWT handling
│
└── docs/
    ├── architecture/             # Architecture PDF + DOCX
    ├── memory/memory.md          # Project memory (single source of truth)
    └── session/                  # Session logs (one per Claude Code session)
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ (`winget install OpenJS.NodeJS.LTS`)
- **pnpm** (`npm install -g pnpm`)
- **Docker Desktop** (for PostgreSQL + Redis)
- **Git** + **GitHub CLI** (`winget install GitHub.cli`)

### Setup

```bash
# 1. Clone
git clone https://github.com/<your-org>/sigops.git
cd sigops

# 2. Environment
cp .env.example .env
# Edit .env: set JWT_SECRET, AUTH_PROVIDER_URL, DATABASE_URL, REDIS_URL

# 3. Start databases
docker compose up -d
# PostgreSQL on port 5432, Redis on port 6372

# 4. Install dependencies
cd server && pnpm install
cd ../ui && pnpm install
cd ..

# 5. Create database tables
cd server && pnpm db:push

# 6. Seed initial data
pnpm db:seed

# 7. Start development server
pnpm dev
# Backend running on http://localhost:4200

# 8. Start frontend (separate terminal)
cd ui && pnpm dev
# Frontend running on http://localhost:4201
# API proxied to http://localhost:4200
```

### Verify

```bash
# Health check
curl http://localhost:4200/health
# → { "status": "ok", "db": "connected", "redis": "connected" }

# Run tests
cd server && pnpm test

# Run tests with coverage (must be >90%)
pnpm test:coverage
```

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sigops_dev

# Redis
REDIS_URL=redis://localhost:6372

# Identity provider (required — issues HS256 JWT tokens)
AUTH_PROVIDER_URL=<url-of-your-identity-provider>
AUTH_PROVIDER_API_KEY=<service-key-for-product-registration>
JWT_SECRET=<shared-hs256-secret-min-32-chars>

# Product Identity
PRODUCT_ID=sigops
PRODUCT_NAME=SigOps
PORT=4200

# Environment
NODE_ENV=development
LOG_LEVEL=debug
```

---

## Authentication

SigOps requires an external identity provider that issues HS256 JWT tokens.
Configure via `JWT_SECRET` (shared secret) and `AUTH_PROVIDER_URL` env vars.

SigOps deliberately does **not** include its own auth, tenants, billing,
RBAC, notifications, or audit-logging stack — those are the identity
provider's concern. Compatible with any provider that:

- issues HS256 JWT tokens
- includes `sub` (user id), `tid` (tenant id), and `permissions` claims
- verifies locally via shared secret (no per-request auth roundtrip)

ClusterAssets operates a managed identity layer — see **SigOps Cloud** below.

At boot, SigOps registers itself with the configured provider
(`POST ${AUTH_PROVIDER_URL}/products/register`) so that admins can map roles,
plans, and notification templates from a single control plane.

---

## Shared Packages

This product uses shared `@cluster/*` packages from the `cluster-shared` repo:

| Package | Purpose |
|---------|---------|
| `@cluster/uap-client` | HTTP client for the configured identity provider |
| `@cluster/auth-middleware` | JWT verification + RBAC + tenant isolation |
| `@cluster/drizzle-utils` | Pagination, audit logging, soft delete helpers |
| `@cluster/zod-schemas` | Shared validation schemas (pagination, errors) |
| `@cluster/ui-kit` | DataTable, FormDialog, AppShell, ThemeProvider |
| `@cluster/test-utils` | Test JWT minting, DB setup, API client |
| `@cluster/eslint-config` | Shared ESLint + Prettier config |

---

## Development Protocols

Every feature follows this mandatory process:

```
AUDIT    → Check what exists (memory, sessions, codebase)
REVIEW   → Cross-check against architecture document
CONFIRM  → Confirm approach before coding
REUSE    → Check @cluster/* packages first
IMPLEMENT → Write code following standards
```

A feature is **complete** only when:
- ✅ Backend API works (all CRUD + SEARCH endpoints)
- ✅ Zod validation on all request/response
- ✅ Frontend UI works (List + Detail + Create + Edit + Search pages)
- ✅ UI ↔ Backend wired via TanStack Query hooks
- ✅ Unit tests >90% coverage
- ✅ Integration tests on all endpoints
- ✅ Responsive (mobile + tablet + desktop)
- ✅ Session log updated
- ✅ Memory updated

---

## Testing

```bash
# Unit + integration tests
cd server && pnpm test

# With coverage report
pnpm test:coverage

# Watch mode (during development)
pnpm test:watch

# Specific module
pnpm test -- --grep "clients"
```

Coverage thresholds (enforced in vitest.config.ts):
- Lines: 90%
- Functions: 90%
- Branches: 85%
- Statements: 90%

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | TypeScript compile to dist/ |
| `pnpm start` | Run production build |
| `pnpm test` | Run all tests |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm db:generate` | Generate Drizzle migration |
| `pnpm db:push` | Push schema to database |
| `pnpm db:seed` | Seed initial data |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | TypeScript type checking |

---

## SigOps Cloud

SigOps open-source gives you the execution engine. **SigOps Cloud** adds what
production teams need on top:

### Intelligence

- **AI Advisor** — incident context summaries, suggested remediation
- **Knowledge Engine** — runbook RAG over your Confluence / docs

### Incident Management

- **On-Call** schedules with escalation chains
- **War Room** — real-time collaboration on active incidents
- **Postmortem** workflow with templates
- **Status Page** (public + private)
- **SLA Tracker** with breach alerts

### Enterprise

- SSO (SAML, OIDC)
- Audit log export (S3, SIEM integrations)
- Advanced RBAC with custom roles
- Multi-region deployment
- Dedicated support SLA

### Marketplace

- Curated tool registry
- Pre-built integrations (PagerDuty, Datadog, Slack, JIRA, and more)
- Community playbooks

**Managed hosting · Identity included · [Learn more →](https://sigops.clusterassets.com)**

---

## Contributing

1. Read `CLAUDE.md` before making any changes
2. Follow naming conventions (kebab-case files, snake_case tables, PascalCase components)
3. Every PR must include: backend + frontend + tests
4. Update `docs/session/` with what you changed
5. Update `docs/memory/memory.md` if decisions were made

---

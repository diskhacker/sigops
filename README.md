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

### Premium Features (in sigops-cloud, proprietary)

AI Advisor, Marketplace, Analytics, Knowledge Engine, On-Call, Postmortems, War Room, Status Page, Chaos Engineering, SigOps Graph, Blast Radius Predictor, Predictive Incidents, Health Score, Academy & Certification, 6 Plugins (SigShield, SigLens, SigProbe, SigTrace, SigShift, SigDocs)

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
│       ├── index.ts              # App entry + UAP registration
│       ├── config/index.ts       # Env validation (Zod)
│       ├── db/
│       │   ├── schema.ts         # ALL Drizzle table definitions
│       │   ├── migrations/       # Drizzle migrations
│       │   └── seed.ts           # Seed data
│       ├── lib/
│       │   ├── uap-client.ts     # @cluster/uap-client
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
# Edit .env: set JWT_SECRET (shared with UAP), DATABASE_URL, REDIS_URL

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

# UAP Integration (required — this product depends on UAP)
UAP_URL=http://localhost:4100/api/v1
UAP_API_KEY=<service-api-key-from-uap>
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

## UAP Dependency

This product does **NOT** handle authentication, users, tenants, billing, RBAC, notifications, audit logging, or AI management. All of these are provided by the **Universal Admin Platform (UAP)**.

**UAP must be running before starting this product.**

At boot, this product registers itself with UAP:
```
POST http://localhost:4100/api/v1/products/register
{
  "name": "sigops",
  "displayName": "SigOps",
  "plans": [...],
  "roles": [...]
}
```

JWT tokens are issued by UAP and verified locally using the shared HS256 secret. No per-request calls to UAP.

---

## Shared Packages

This product uses shared `@cluster/*` packages from the `cluster-shared` repo:

| Package | Purpose |
|---------|---------|
| `@cluster/uap-client` | HTTP client for UAP APIs |
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

## Part of ClusterAssets Ecosystem

SigOps is one of 11 products in the ClusterAssets ecosystem, all sharing the UAP foundation:

| Product | Domain | Port |
|---------|--------|------|
| **UAP** | Platform (Auth, Billing, RBAC, AI) | 4100 |
| **SigOps** | Infrastructure Execution OS | 4200 |
| **Credora** | Financial Operating System | 4300 |
| **Assera** | NRI Property + Elderly Care | 4400 |
| **Talentra** | Follow-the-Sun Operations | 4500 |
| **Armexa** | Security Command & SOC | 4600 |
| **Futurevo** | Child Career Guidance | 4700 |
| **Movana** | Mobility Intelligence | 4800 |
| **Lifetra** | Health & Wellness | 4900 |
| **Paynex** | Payments & Gold Finance | 5000 |
| **Novix** | AI R&D Lab (Internal) | 5100 |

---

## Contributing

1. Read `CLAUDE.md` before making any changes
2. Follow naming conventions (kebab-case files, snake_case tables, PascalCase components)
3. Every PR must include: backend + frontend + tests
4. Update `docs/session/` with what you changed
5. Update `docs/memory/memory.md` if decisions were made

---

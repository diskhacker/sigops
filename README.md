# SigOps — Infrastructure Execution OS

Open-source platform for automated infrastructure operations.
Ingest signals → match rules → execute workflows → verify results.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## What SigOps Does

SigOps is an **infrastructure execution OS** — a governed, closed-loop system that turns operational signals (alerts, webhooks, metrics breaches) into automated, auditable remediation. Instead of paging a human at 3am to run the same five commands, SigOps matches the signal against a rule, runs a workflow written in **SEL** (the SigOps Execution Language), dispatches steps to a Rust agent running on the target host, and verifies the outcome.

The target audience is platform / SRE / DevOps teams who already have monitoring (Prometheus, Grafana, etc.) but are drowning in manual remediation toil. SigOps does not replace your observability stack — it plugs into it and acts on what it sees.

At a high level: a signal enters through the ingest API, the rules engine matches it, a workflow executes step-by-step through an agent on the customer host, each step is tracked in a state machine with retries and risk scoring, and the resulting execution is visible in the dashboard for audit and replay.

---

## Core Features

Only features that exist in code on `main` today are listed here. Items planned but not shipped are in the **Roadmap** section.

- **Signal Ingestion** — Webhook receiver + Prometheus Alertmanager adapter. Fingerprinting and deduplication.
- **Signal Rules Engine** — Pattern matching, severity filtering, regex on titles, JSONPath on body.
- **Signal State Machine** — `OPEN → ACK → RESOLVED → SUPPRESSED` lifecycle with audit trail.
- **SEL Language** — Parser, evaluator, and built-in tool surface. Workflows are `.sel` files.
- **Workflows** — CRUD, SEL validation, versioning, tags.
- **Workflow Schedules** — Cron-stored schedules (CRUD layer).
- **Executions + Execution Steps** — State machine, retries, risk scoring, step-level tracking.
- **Agents** — HTTP heartbeat polling with backoff and token rotation on each cycle.
- **Built-in Tools (5)** — `restart`, `http`, `notify_slack`, `wait`, `condition`.
- **Agent Tools / Tool Registry** — Discovery + registry per agent.
- **Stats / Dashboard API** — Recent executions, severity breakdown, agent status.
- **Auth** — JWT HS256 verification via an external identity provider (see below).
- **UI Dashboard** — 10 pages (signals, rules, workflows, executions, agents, tools, schedules, stats, settings, auth) built with React 18 + Vite + MUI.
- **Docker** — Multi-stage `server/Dockerfile` and `ui/Dockerfile` (nginx:alpine). `docker-compose.yml` for Postgres + Redis locally.

---

## Architecture

```
signal → rules engine → SEL workflow → agent execution → verification
                                            │
                                            ▼
                                    execution state machine
                                    (OPEN → RUNNING → SUCCEEDED/FAILED)
```

- **Signal-driven.** All work starts with a signal. No cron-triggered actions outside of scheduled workflows.
- **Agent-first execution model.** Steps run on a Rust agent on the target host. The server never executes directly against customer infrastructure.
- **Closed-loop.** Every execution is tracked end-to-end — match, dispatch, step results, verification, resolution.
- **State machine driven.** Signals and executions both have explicit state machines; no ad-hoc status columns.

Full architecture document: `docs/architecture/SigOps-Architecture-v1.2.0.pdf`.

---

## Tech Stack

- **Runtime:** Node.js 20+ / TypeScript
- **Server:** Hono
- **Database:** PostgreSQL + Drizzle ORM
- **Cache / Queue:** Redis
- **Frontend:** React 18 + Vite + Zustand + MUI + TanStack Query
- **Agent:** Rust (separate repo — [sigops-agent](https://github.com/diskhacker/sigops-agent))

---

## Requirements

- Node.js **>= 20**
- PostgreSQL **>= 15**
- Redis **>= 7**
- Docker (optional, for the bundled `docker-compose.yml`)

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/diskhacker/sigops.git
cd sigops

# 2. Install
pnpm install

# 3. Configure
cp .env.example .env
# Edit .env: set JWT_SECRET, DATABASE_URL, REDIS_URL, AUTH_PROVIDER_URL

# 4. Start Postgres + Redis
docker compose up -d

# 5. Create tables
cd server && pnpm db:push

# 6. Run the server (port 4200)
pnpm dev

# 7. Run the UI (separate terminal, port 4201)
cd ../ui && pnpm dev
```

Health check:

```bash
curl http://localhost:4200/health
# → { "status": "ok", "db": "connected", "redis": "connected" }
```

---

## Configuration

| Env var | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Postgres connection string |
| `REDIS_URL` | yes | — | Redis connection string |
| `JWT_SECRET` | yes | — | HS256 shared signing secret (min 32 chars). Must match your identity provider. |
| `AUTH_PROVIDER_URL` | yes | — | URL of your identity provider (UAP or compatible). Used for product registration at boot. |
| `AUTH_PROVIDER_API_KEY` | yes | — | Service key used to register this product with the identity provider. |
| `PRODUCT_ID` | no | `sigops` | Identifier used in JWT audience claim. |
| `PORT` | no | `4200` | Backend port. |
| `NODE_ENV` | no | `development` | `development` \| `production`. |
| `LOG_LEVEL` | no | `info` | `debug` \| `info` \| `warn` \| `error`. |

---

## Authentication

SigOps requires an external identity provider that issues HS256 JWT tokens. Configure via `JWT_SECRET` (shared signing secret) and `AUTH_PROVIDER_URL`.

SigOps verifies tokens locally with the shared secret — there is no per-request auth round-trip. Compatible with any provider that:

- Issues HS256 JWT tokens
- Includes `sub` (user id), `tid` (tenant id), and `permissions` claims
- Exposes a `POST /products/register` endpoint for product self-registration

At boot, SigOps registers itself with the configured provider so administrators can map roles, plans, and notification templates from a single control plane.

For managed identity, billing, RBAC, and audit — see **SigOps Cloud** below.

---

## SigOps CLI

A local task registry for automating scripts. Works standalone without a server. Connected mode adds remote execution via agents.

```bash
npm install -g @sigops/cli
sigops init
sigops add my-task --run "node scripts/deploy.js --env={{env}}"
sigops run my-task --env=production
sigops ui   # web dashboard at http://localhost:3939
```

See [sigops-cli](https://github.com/diskhacker/sigops-cli) for full docs.

---

## SigOps Cloud

SigOps open-source gives you the execution engine. **SigOps Cloud** adds what production teams need on top:

### Intelligence
- **AI Advisor** — incident context summaries and suggested remediation
- **Knowledge Engine** — runbook search over your documentation

### Incident Management
- **On-Call** schedules with escalation chains
- **War Room** — collaboration during active incidents
- **Postmortem** workflow with templates
- **Status Page** (public + private)
- **SLA Tracker** with breach alerts

### Enterprise
- Managed identity, billing, and RBAC (via UAP)
- Audit log with export
- Multi-tenant isolation

### Marketplace
- Curated tool registry
- Pre-built integrations (Slack, JIRA, PagerDuty, and more)

[sigops.clusterassets.com](https://sigops.clusterassets.com)

---

## Roadmap

Features planned but not yet shipped:

- [ ] **FlowBuilder** — visual workflow editor
- [ ] **Bidirectional adapters** for PagerDuty, Datadog, and Grafana (currently inbound-only Prometheus)
- [ ] **WebSocket agent transport** (currently HTTP polling)
- [ ] **Rate limiting** on signal ingestion
- [ ] **OpenTelemetry / Prometheus metrics** export
- [ ] **Pattern Learning** — auto-detect recurring incidents
- [ ] **Predictive Incidents** — early warning system
- [ ] **Email signal polling**

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | TypeScript compile to `dist/` |
| `pnpm start` | Run production build |
| `pnpm test` | Run all tests |
| `pnpm test:coverage` | Run tests with coverage (>=90% lines/functions/statements, >=85% branches) |
| `pnpm db:generate` | Generate a Drizzle migration |
| `pnpm db:push` | Push schema to database (dev only — do NOT use in production) |
| `pnpm db:migrate` | Apply generated migrations (production path) |
| `pnpm db:seed` | Seed initial data |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | TypeScript type checking |

---

## Contributing

1. Read `CLAUDE.md` before making any changes.
2. Follow naming conventions (kebab-case files, snake_case tables, PascalCase components).
3. Every PR must include: backend + frontend + tests.
4. Update `docs/session/` with what you changed and `docs/memory/memory.md` if decisions were made.

See `CONTRIBUTING.md` if present.

---

## License

MIT — ClusterAssets Innovation Pvt. Ltd.

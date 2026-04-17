# SigOps — Infrastructure Execution OS

> Open Source Core (MIT) + Proprietary Cloud. Rust Agent. SEL Language.

## Recent Changes (Sprint 1.5 — 2026-04-17)

- **README rewritten.** Unimplemented feature claims moved to Roadmap: FlowBuilder, bidirectional adapters, WebSocket agent gateway, email polling, rate limiting on ingest, OpenTelemetry / Prometheus metrics export, and Cloud features without code (SSO, audit-log export, multi-region).
- **Docker CI added.** `.github/workflows/docker.yml` builds+pushes `ghcr.io/diskhacker/sigops-server` and `ghcr.io/diskhacker/sigops-ui` on `v*.*.*` tags and manual dispatch. CI uses `server/Dockerfile` (non-root: `USER node`). The root `Dockerfile` is unused in CI — to be deleted in v0.1.1.
- **Migration path documented.** `server/package.json` now has `db:migrate` (drizzle-kit migrate). **Do NOT use `db:push` in production.**
- **Agent transport reality.** The agent today is HTTP long-polling, not WSS. `Agent WebSocket gateway` in the Module Build Order below is aspirational and not yet implemented.

See `docs/session/2026-04-17-sprint-1.5.md` and `docs/memory/2026-04-17-sprint-1.5.md`.

---

## Product Identity

| Key | Value |
|-----|-------|
| Repo | `sigops` (backend+frontend), `sigops-agent` (Rust) |
| Product ID | `sigops` |
| Port | Backend: 4200, Frontend: 4201 |
| Entity | SigOps Technologies Pvt Ltd |
| Status | **EXISTS** — Phase 1 backend built |
| License | MIT (core), Proprietary (cloud features) |

## Architecture Reference
See `/docs/architecture/SigOps-Architecture-v1.2.0.pdf`

## PROTOCOLS — MANDATORY
```
AUDIT → REVIEW → CONFIRM → REUSE → IMPLEMENT
Feature = UI + Backend + Tests (>90%). All CRUD + SEARCH.
Session: /docs/session/ | Memory: /docs/memory/memory.md
```

## UAP Integration
Same pattern as all products. Product ID: `sigops`. Roles: sigops_admin (*), operator (signals/executions/workflows/tools), developer (read+workflows+sel), viewer (read-only).

---

## COMPLETE DRIZZLE SCHEMA (10 Tables)

See the schema block in the repo's `server/src/db/schema.ts` for the source of truth. The build spec that formerly lived here has been moved into code.

## MODULE BUILD ORDER
```
1. Config + DB + Health
2. Signal ingestion (webhook + Prometheus adapter)
3. Signal rules engine (matching + dedup)
4. SEL parser + evaluator
5. Execution engine (closed loop)
6. Agent gateway (TODAY: HTTP long-polling; planned: WebSocket)
7. Tool registry
8. Workflow CRUD + scheduler
9. Stats/dashboard API
10. React dashboard (signals, executions, agents, workflows)
```

## HARD RULES
1. Every feature ships UI + Backend + Tests (>90% coverage).
2. Tenant isolation on every query.
3. JWT verification is local — do not round-trip to the identity provider per request.
4. Audit every mutation.
5. Zod-validate every request.
6. README claims must match code that is on `main` today.
7. Production migrations use `db:migrate`. Never `db:push` in production.

# ClusterAssets — Deep Production Audit (Main-Branch Scope)

**Date:** 2026-05-07
**Auditor:** Claude Code (Opus 4.7, 1M context)
**Scope:** `main` branch, 7 in-scope repos under `diskhacker/`
**Supersedes:** `DEEP-AUDIT-REPORT-2026-04-13.md` (in this same repo)

This same `DEEP-AUDIT-REPORT-2026-05-07.md` is committed on the `claude/create-main-branch-audit-SsbNG` branch in each of the 7 repos.

## Executive Summary

Every prior-audit P0 has been **fixed**:
- `crypto` import in `sigops/server/src/db/schema.ts:1` — present at line 1.
- `tenantId` columns added to `executionSteps` + `agentTools` in `sigops-cloud`.
- Graceful shutdown wired in `sigops/server/src/index.ts` (SIGTERM/SIGINT, 10s force-exit).
- UAP impersonation hardening, GAP fixes (8/8 supportability gaps).
- `sigops-cloud` UI tests went from 0 → 18.
- `sigops-sdk` shipped CI + examples/ + docs/ (prior audit "missing" claims now outdated).

Three new P0s:
1. `uap/server/src/config/env.ts:9` — hard-coded `JWT_SECRET` default.
2. `sigops-agent/src/executor.rs` — `SecurityPolicy` dead code on hot path.
3. `cluster-deploy/.env.example` — missing `VAULT_MASTER_KEY`.

Plus: **no branch protection on `main`** in any of the 7 repos, **GHAS disabled** everywhere.

---

## `sigops` — Detailed Findings (focus repo for this commit)

**Purpose:** Open-core "Infrastructure Execution OS" — signal ingest, deduped rule matching, SEL workflow execution against agent-discovered tools. Three top-level packages: `server/` (Hono + Drizzle + Postgres + Redis), `ui/` (React + MUI + Vite), `sigops-cli/` (npm tool registry CLI). Audit head `ad0b215` 2026-04-21.

### Schema verification

`server/src/db/schema.ts` — `import crypto from "crypto";` is **PRESENT (line 1)** — prior P0 **FIXED**.

13 tables (was 9 in prior audit): `signals`, `workflows`, `executions`, `agents`, `toolRegistry`, `signalRules`, `workflowSchedules`, `executionSteps`, `agentTools`, `usageBaselines`, `notifications`, `platformConfig`, `auditLogs`.

`tenantId` (notNull) on all 10 tenant-scoped tables. **Missing on `toolRegistry`** (defensible — global tool catalog keyed by `(name, version)`). **Missing on `platformConfig`** (intentionally global, but P1 — log-level mutation is platform-global; if intent is per-tenant, tenants can clobber each other). On `auditLogs`, `tenant_id` is **nullable** (P2 — multi-tenant queries must remember `IS NULL OR = :tid`).

5 enums: `severity`, `signal_status`, `exec_status`, `step_status`, `agent_status`.

### 16 modules

`agent-tools, agents, auth, execution-steps, executions, ingest, platform-config, sel, signal-rules, signals, stats, tools, trace, usage-baselines, workflow-schedules, workflows`.

### SEL parser/executor

`server/src/lib/sel/`: `parser.ts` 1.85 KB, `executor.ts` 2.96 KB, `builtin-tools.ts` 5.08 KB with co-located tests. SEL routes module at `modules/sel/sel.routes.ts` (2.7 KB).

### Server startup & middleware

`server/src/index.ts`: graceful shutdown handlers for SIGTERM/SIGINT with 10s force-exit timeout (P0 from prior audit FIXED). Startup wires `applyPersistedLogLevel()`, UAP registration (best-effort), and a 5-min `runSpikeDetection()` cron interval (`unref()`-ed). **P1: cron runs in every replica → duplicate spike signals + duplicate notifications under HPA.**

`server/src/app.ts`: Hono app with `requestId` middleware and inline security-headers middleware (X-Content-Type-Options, X-Frame-Options DENY, HSTS). 16 mounted route groups: `/health`, `/docs`, `/api/v1/{platform-config, trace, usage-baselines, signals, workflows, executions, agents, tools, signal-rules, workflow-schedules, execution-steps, agent-tools, ingest, stats, sel}`. Centralized error handler maps ZodError → 400 and AppError → typed JSON.

**P1 — middleware gaps:** only `auth.ts` (Bearer JWT via jose, sets `tenantId` from `payload.tid`) and `request-id.ts`. **No CORS, no rate-limit, no helmet** (manual headers only). `FRONTEND_URL` env defined but unused.

### CLI

`@sigops/cli@1.0.0` MIT, npm-managed (own `package-lock.json` — P2 mixed package managers in one repo). Bin: `sigops` → `bin/sigops.js`. 7 commands: `add, history, init, inspect, list, remove, run`. Deps: chalk, commander, dotenv, js-yaml. 1 test file with 15 unit tests (added 2026-04-21).

### UI

11 pages: AgentToolsPage, AgentsPage, Dashboard, ExecutionStepsPage, ExecutionsPage, PlatformConfigPage (log level + usage thresholds), SignalRulesPage, SignalsPage, ToolsPage, WaterfallPage (flame chart), WorkflowSchedulesPage, WorkflowsPage. Components: `CrudTable.tsx` + `Layout.tsx` (version chip via `/health`). 4 test files: `Dashboard.test.tsx`, `Pages.test.tsx`, `CrudTable.test.tsx`, `Layout.test.tsx`.

### Tests / coverage

Server tests co-located with source. Vitest thresholds **lowered to 80/80/85/80** (was 90/90/85/90) — 2026-04-17 commit `71035a7` reduced to match actual 82.79% coverage. Excludes `index.ts`, `config/index.ts`, `db/migrations/**`, `db/schema.ts`, `db/index.ts`, `lib/hono-types.ts`. UI: 4 `.test.tsx`. CLI: 1 file, 15 tests.

### Docs

- `docs/architecture/`: `SigOps-Architecture-v1.2.0.docx` + `.pdf` (284 KB).
- `docs/audit/`: `audit-report.md` (10 KB).
- `docs/session/`: 11 files including `2026-04-21-production-readiness-audit.md`.
- `docs/memory/`: 4 files.
- Top-level: `00-MASTER-REPO-PLAN.md`, `CROSS-REPO-AUDIT.md`, `DEEP-AUDIT-REPORT.md`, `REPO-ARCHITECTURE-REVIEW.md`, plus `DEEP-AUDIT-REPORT-2026-04-13.md` and now this 2026-05-07 report.

### CI/CD

- `.github/workflows/ci.yml` — postgres:16-alpine + redis:7-alpine services, pnpm@10.33.0, Node 20, `pnpm typecheck` + `pnpm test:coverage`. **Lint disabled** awaiting ESLint 9 flat-config (commit `b0482f0`). **CI runs server only — UI + CLI tests never executed (P1).**
- `.github/workflows/docker.yml` — tag `v*.*.*` or workflow_dispatch; builds two GHCR images (`sigops-server`, `sigops-ui`) with `GIT_COMMIT` + `BUILD_TIME` build-args.

### Recent activity (26 commits since 2026-04-13)

`ad0b215` 2026-04-21 deps bump (hono 4.12.12→4.12.14, drizzle-orm 0.38.4→0.45.2 via dependabot PR #11) → `17f692b` 2026-04-21 fix(production-readiness): startup wiring, role normalization, logger timing → `65a92eb` docs: 8 supportability gaps complete → `76261dd` GAP 4 — usage spike detection + notifications → `1dee4a1` GAP 6 — step waterfall/flamegraph view → `1acb59d` GAP 5 — trace ID search API + UI tab → `99a9298` GAP 1 — runtime log level adjustment → `22920fe` GAP 3 — OpenAPI docs + Swagger UI → `53b4264` GAP 8 — version badge + health fields + Docker build args → `da4d0cd` fix: delete root Dockerfile, CLAUDE.md coverage → `3476c50` 2026-04-17 ci pnpm fixes → `71035a7` fix(ci): lower coverage to 80% → `b0482f0` fix(ci): disable lint for v0.1.0 → `a5967c6` feat(db): commit initial migration SQL (PR #10) → `db90322` 2026-04-16 ops: GHCR image build workflow + db:migrate (PR #9) → `2b309d3` feat(sigops): add UI Dockerfile + nginx config → ...

11 PRs total, all merged. 0 issues. 2 branches (`main`, `claude/production-readiness-audit-ngl6r`).

### Status of each prior P0/P1

| Prior issue | Status | Evidence |
|---|---|---|
| Missing `crypto` import in schema.ts | **FIXED** | `import crypto from "crypto";` at line 1 |
| No graceful shutdown | **FIXED** | SIGTERM/SIGINT in `index.ts` |
| Permissive CORS | **OPEN** | No CORS middleware in `app.ts`; `FRONTEND_URL` env defined but unused |
| Missing security headers (no helmet) | **PARTIAL** | Manual headers (3 of common 7); no CSP, no Referrer-Policy, no Permissions-Policy |
| Rate limiting missing | **OPEN** | No rate-limit middleware wired |
| Coverage reporting in CI | **PARTIAL** | `pnpm test:coverage` runs but no upload artifact / Codecov |
| ESLint in CI | **REGRESSED** | Lint commented out pending ESLint 9 flat-config |
| Zero @cluster/* package consumption | **OPEN** | `server/package.json` and `ui/package.json` have no `@cluster/*` deps |

### New risks

**P0:** none specific to this repo (the 3 new P0s sit in uap, sigops-agent, cluster-deploy).

**P1:**
- No CORS allow-list (`server/src/app.ts:24-37`).
- No rate limiter on `/api/v1/ingest` (`server/src/modules/ingest/`) — easy DoS / log-flood vector.
- `JWT_AUDIENCE` default = `sigops` in `.env.example`; the 2026-04-13 fix intended `aud=uap` for cross-product tokens. Two `.env.example` files (`./.env.example` and `./server/.env.example`) drift.
- Spike-detector cron runs in every replica → duplicate spike signals + notifications. Needs leader-election or BullMQ repeatable job.
- OpenAPI route enumerates 5 endpoint groups but `app.ts` mounts 16 — Swagger spec materially incomplete.
- `platform_config` table has no `tenantId` (`server/src/db/schema.ts:218-228`). Confirm intent in CLAUDE.md.
- CI does not run UI or CLI tests.

**P2:**
- `db:push` script still in `server/package.json` (`server/package.json:11`). PR #10 explicitly warns "NEVER use db:push in production".
- `auditLogs.tenantId` is nullable (`server/src/db/schema.ts:233`).
- `notifications.scope` defaults to `tenant_admin` (string, not enum) — typos silently mis-route.
- Spike detector stores `baseline_value` / `spike_threshold` as `text` (`schema.ts:189-191`) — should be `numeric`.
- No request-body size limit + no rate limit on `/ingest` = memory exhaustion vector.
- Mixed package managers (`pnpm-lock.yaml` + `sigops-cli/package-lock.json`).

**P3:**
- ESLint disabled in CI for "v0.1.0" — should track to v0.1.1.
- `docker-compose.yml` declares obsolete `version: "3.8"`.
- Two near-duplicate audit reports in `docs/`: `DEEP-AUDIT-REPORT.md` + `DEEP-AUDIT-REPORT-2026-04-13.md`.
- `claude/production-readiness-audit-ngl6r` branch lingering 2 weeks behind main.
- No SBOM/provenance attestation in `docker.yml` (no `--sbom=true`, `--provenance=true`).
- `.sigops/config.json` (157 B) committed — verify no machine-specific paths.

### Secret-scanning

`run_secret_scanning` returned `Repository does not have GitHub Advanced Security enabled.` Manual review: `.env.example` and `server/.env.example` only contain placeholder values (`change-me-shared-secret-…`, localhost URLs, default postgres creds). No real credentials.

---

## Other Repos (Brief)

- **`uap`** — P0: `JWT_SECRET` default in `server/src/config/env.ts:9`. 44 tables, 47 modules. In-memory rate limiter (P1). 17 commits since 2026-04-13. 689 tests passing.
- **`sigops-cloud`** — both prior P0s FIXED. UI tests went 0 → 18. No CORS, no rate-limit (P1). Lint disabled, coverage 35%. Stale `.js` artifacts in `ui/src/pages/`. GHCR images unsigned/unscanned.
- **`sigops-agent`** — P0: `SecurityPolicy` dead code in `executor.rs`. Health server binds `0.0.0.0:9100` + doesn't parse request (P1). Heartbeat error logs may leak rotated tokens.
- **`sigops-sdk`** — examples/, docs/, CI/CD all PRESENT (prior audit outdated). P0: CLI runtime deps under devDependencies. Several commands are stubs.
- **`cluster-shared`** — P0: scope rename `@cluster/*` ↔ `@diskhacker/*` inconsistent. P0: `mintTestJwt` non-cryptographic. Missing soft-delete API.
- **`cluster-deploy`** — P0: `.env.example` missing `VAULT_MASTER_KEY`. All images `:latest` (P1). Backup hardening needed.

---

## Cross-Repo Summary

| Check | Result |
|---|---|
| `main` branch protection | **FAIL (all 7 repos)** |
| GitHub Advanced Security | **FAIL (all 7 repos)** |
| Lint enforced in CI | **FAIL (all 7)** |
| `@cluster/*` package consumption | **FAIL (zero adoption)** |
| Vitest thresholds | DRIFT (UAP 85; sigops 80; sigops-cloud 35) |
| Issue tracker usage | FAIL (0 issues all-time across all 7) |

## Phase 0 Roadmap (this week)

1. UAP `env.ts:9` — drop default `JWT_SECRET`.
2. **`sigops/server/src/app.ts`** — add `cors()` allow-list driven by `FRONTEND_URL`; add `hono-rate-limiter` on `/api/v1/ingest` and auth.
3. `sigops-agent/src/executor.rs` — route through `policy.run()`.
4. `cluster-deploy/.env.example` — add `VAULT_MASTER_KEY`.
5. Branch protection on `main` in all 7 repos.
6. Enable GHAS in all 7 repos.
7. `cluster-shared` scope rename + `mintTestJwt` real signing.
8. `sigops-sdk` CLI deps fix.

## Phase 1 (next sprint, sigops-specific)

- **`sigops`** — convert `runSpikeDetection` cron to BullMQ repeatable job with leader election.
- **`sigops`** — expand OpenAPI/Swagger to all 16 route groups (currently 5).
- **`sigops`** — make CI run UI + CLI tests; re-enable lint.
- **`sigops`** — convert `notifications.scope` to `pgEnum`; convert spike numerics from `text` to `numeric`.
- **`sigops`** — sync `.env.example` files; document `JWT_AUDIENCE=uap` for cross-product use.
- **`sigops`** — bump vitest thresholds back toward 90/90/85/90 with focused tests.

---

## Summary Statistics

| Metric | Value |
|---|---|
| Repos audited | 7 / 7 |
| P0 findings | 7 |
| P1 findings | 35 |
| P2 findings | 24 |
| P3 findings | 14 |
| Prior P0 bugs (2026-04-13) still open | **0 — all 4 fixed** |
| New P0 bugs found (2026-05-07) | 7 |

**Headline:** correctness has improved markedly since 2026-04-13; remaining work is operational hygiene plus three specific code-level P0s. For sigops specifically, the supportability sprint shipped successfully — the highest-impact remaining items are CORS allow-list, rate limiting, multi-replica cron leadership, and Swagger completeness.

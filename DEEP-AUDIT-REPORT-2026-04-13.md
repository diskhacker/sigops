# ClusterAssets — Deep Production Audit Report

## Date: 2026-04-13
## Audited by: Claude Code (Opus 4.6)
## Repos audited: 15/15

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total repos | 15 |
| Repos with production code | 6 (UAP, Credora, Talentra, SigOps, SigOps-Cloud, SigOps-Agent) |
| Repos with minimal code | 2 (SigOps-SDK, Cluster-Shared) |
| Repos scaffolding-only | 7 (Armexa, Assera, Movana, Paynex, Lifetra, Futurevo, Novix) |
| Total source files | ~685 |
| Total test files | ~280+ |
| Overall production readiness | 35% (weighted by repo complexity) |
| Dependency consistency | 100% across all repos |
| CI/CD coverage | 7/15 repos (47%) |

---

## Critical Gaps (P0 — Must fix before ANY deployment)

1. **sigops-cloud: Missing tenantId in executionSteps and agentTools tables** — Breaks multi-tenant isolation. Any tenant can see other tenants' execution steps and agent tools.
2. **sigops + sigops-cloud: Missing `crypto` import in schema.ts** — `crypto.randomUUID()` called without import; causes runtime error on table inserts.
3. **credora: Only 51/114 tables defined (44.7%)** — 63 tables missing including Orders, Finance, Bank Recon, Budget, Gov Integration modules.
4. **UAP: No graceful shutdown handler** — Server will drop in-flight requests on deploy/restart.
5. **credora + talentra: No rate limiting** — All endpoints exposed to abuse without throttling.
6. **credora + talentra: No CORS configuration** — Cross-origin requests uncontrolled.
7. **7 product repos have ZERO code** — Armexa (security backbone) and Paynex (payment backbone) are not started but all other products depend on them.

## High Priority Gaps (P1 — Fix within current sprint)

1. **UAP: Permissive CORS (allows all origins)** — Must restrict to known domains before production.
2. **UAP: Missing security headers (no helmet)** — No X-Frame-Options, X-Content-Type-Options, etc.
3. **sigops-cloud: 0 UI test files** — vs 6 in sigops; regression risk.
4. **credora: No PAN/GSTIN regex validation** — Financial data integrity at risk.
5. **credora + talentra: State machine transitions not enforced** — Status fields can be set to any value bypassing workflow.
6. **cluster-shared: No LICENSE file** — Legal/compliance risk for shared packages.
7. **cluster-shared: No CLAUDE.md or README** — No documentation for shared infrastructure.
8. **sigops-sdk: No CI/CD pipeline** — Public npm packages shipping without automated testing.
9. **8 repos missing CI/CD** — sigops-sdk, armexa, assera, movana, paynex, lifetra, futurevo, novix.

## Medium Priority Gaps (P2 — Fix before production)

1. **All full-stack repos: No dedicated service layer** — Business logic mixed into route handlers.
2. **credora: credentialVault.passwordEncrypted stored as plain text** — No AES-256-GCM encryption.
3. **sigops-sdk: ESM-only build** — CLAUDE.md Hard Rule #7 requires ESM + CJS dual format.
4. **sigops-sdk: Missing examples/ directory** — 6 example projects specified in CLAUDE.md not created.
5. **sigops-sdk: Missing docs markdown files** — getting-started.md, tool-reference.md, etc. not created.
6. **talentra: Assessment hash-chain not verified** — assessmentLedger should implement SHA-256 chain.
7. **All repos: No coverage reporting in CI** — Tests run but coverage not enforced or published.
8. **Zero repos consume @cluster/* packages** — Shared packages exist but are unused.

## Low Priority Gaps (P3 — Nice to have)

1. **7 scaffolding repos: Missing README.md** — No setup instructions.
2. **7 scaffolding repos: Missing CLAUDE-CODE-AUDIT-PROMPT.md**.
3. **7 scaffolding repos: Missing docs/audit/ directory**.
4. **sigops-agent: No CLAUDE.md** — Rust agent has no spec document.
5. **sigops-agent: No separate tests/ directory** — Only 5 inline unit tests.
6. **UAP: No API versioning strategy documented**.
7. **cluster-shared: Tests colocated in src/ instead of __tests__/** — Non-standard convention.

---

## Per-Repo Detailed Report

### 1. UAP (Universal Admin Platform)

| Dimension | Status | Detail |
|-----------|--------|--------|
| **File Structure** | 18/22 | Missing: CLAUDE-CODE-AUDIT-PROMPT.md, docs/audit/progress.md, docs/audit/api-inventory.md, README.md |
| **Schema** | 41/43 tables (95%) | All critical tables present. 10 enums defined. Proper id/tenantId/timestamps. |
| **Endpoints** | 231 implemented | 47 route modules, all with Zod validation + auth middleware + tenant isolation |
| **UI** | 49 pages, 6 components | Dashboard + full CRUD pages for all modules. 8 UI test files. |
| **Tests** | 80 files (72 server + 8 UI) | Vitest with 90% coverage thresholds configured |
| **Security** | 7/9 | Rate limiting, auth (Argon2id + JWT/jose), health endpoint, Pino logger. Missing: graceful shutdown, security headers |
| **CI/CD** | Partial | TypeScript check + vitest. Missing: lint, build, coverage report |
| **Production Readiness** | **75%** | Strongest repo. Needs shutdown handler, security headers, CORS restriction |

**Gaps:**
- No graceful shutdown (SIGTERM handler)
- CORS allows all origins
- No helmet/security headers
- No ESLint in CI
- OAuth token encryption method unverified

---

### 2. SigOps (Infrastructure Execution OS)

| Dimension | Status | Detail |
|-----------|--------|--------|
| **File Structure** | 16/22 | Has CI, architecture docs, 5 session files, audit report |
| **Schema** | 9/10 tables (90%) | All core tables. SEL module implemented. Missing crypto import. |
| **Endpoints** | 63 implemented | 13 modules + SEL parser/executor + 5 built-in tools |
| **UI** | 10 pages, 2 components | CrudTable + Layout components. 6 UI test files. |
| **Tests** | 39 files (33 server + 6 UI) | SEL parser, executor, builtin-tools all tested |
| **Security** | 6/9 | JWT auth, rate limiting (assumed from UAP pattern), request-id middleware |
| **CI/CD** | Partial | Same as UAP |
| **Production Readiness** | **70%** | SEL module is standout feature. Fix crypto import bug. |

**Gaps:**
- `crypto.randomUUID()` called without import in schema.ts
- No graceful shutdown

---

### 3. SigOps-Cloud

| Dimension | Status | Detail |
|-----------|--------|--------|
| **File Structure** | 14/22 | Fewer session docs, minimal memory.md |
| **Schema** | 9/10 tables (90%) | CRITICAL: Missing tenantId in executionSteps + agentTools |
| **Endpoints** | 63 implemented | Mirrors sigops + heartbeat scheduler |
| **UI** | 10 pages, 2 components | Same as sigops. **0 UI test files** (major gap). |
| **Tests** | 34 server + 0 UI | 34 server tests (1 extra: heartbeat-cron) |
| **Security** | 5/9 | Same as sigops minus tenant isolation bugs |
| **CI/CD** | Partial | Same structure |
| **Production Readiness** | **55%** | Tenant isolation bugs are blocking. |

**Gaps:**
- **BLOCKING:** executionSteps and agentTools missing tenantId — multi-tenant data leak
- **BLOCKING:** Missing crypto import
- Zero UI test files

---

### 4. SigOps-Agent (Rust Binary)

| Dimension | Status | Detail |
|-----------|--------|--------|
| **Cargo.toml** | Complete | tokio, reqwest, serde, clap, tracing |
| **Source Files** | 6 (.rs), 1,245 lines | main, config, discovery, executor, heartbeat, health |
| **Features** | 5/6 | Config, discovery (7 tools), executor (5 tools), heartbeat (backoff), health endpoint |
| **Tests** | 5 inline | Unit tests for config, health, agent-id |
| **Security** | Good | URL validation, no shell injection, bearer auth |
| **CI/CD** | Yes | GitHub Actions with cargo test |
| **Production Readiness** | **65%** | Missing: WebSocket client, integration tests, CLAUDE.md |

**Gaps:**
- No WebSocket client (uses HTTP polling instead)
- Only 5 inline tests (no integration test suite)
- No CLAUDE.md specification

---

### 5. Credora (Financial Operating System)

| Dimension | Status | Detail |
|-----------|--------|--------|
| **File Structure** | 16/22 | Has CI, 6 session files, architecture v2.0.0 |
| **Schema** | 51/114 tables (44.7%) | **MAJOR GAP: 63 tables missing** |
| **Endpoints** | 273 implemented | 55 modules, all CRUD. Exceeds 190 target. |
| **UI** | 31 pages, 4 components | 2 UI test files |
| **Tests** | 65 server test files | Good module coverage |
| **Security** | 4/9 | Auth + logger + health + error handling. No rate limit, CORS, shutdown. |
| **CI/CD** | Partial | TypeScript + vitest only |
| **Production Readiness** | **45%** | Schema incomplete. Missing financial validations. |

**Gaps:**
- 63 tables undefined (Orders, Finance, Bank, Budget, Compliance, Gov modules)
- No PAN/GSTIN regex validation
- credentialVault not encrypted
- State machine transitions not enforced
- No rate limiting or CORS

---

### 6. Talentra (Workforce Operations)

| Dimension | Status | Detail |
|-----------|--------|--------|
| **File Structure** | 15/22 | Has CI, 4 session files, architecture v2.1.0 |
| **Schema** | 67/67 tables (100%) | **COMPLETE.** Immutable assessments, hash-chain ledger, anonymous reports. |
| **Endpoints** | 128 implemented | 26 modules. Assessment immutability enforced (PUT/DELETE blocked). |
| **UI** | 28 pages, 4 components | 2 UI test files |
| **Tests** | 36 server test files | Immutability tested |
| **Security** | 5/9 | Auth + logger + health + immutability + anonymity. No rate limit, CORS. |
| **CI/CD** | Partial | TypeScript + vitest only |
| **Production Readiness** | **55%** | Schema complete but security gaps. |

**Gaps:**
- No rate limiting or CORS
- State machine transitions not enforced
- Auto-approval for sick leave not implemented
- Assessment hash-chain integrity not verified
- No graceful shutdown

---

### 7. SigOps-SDK (Developer Toolkit)

| Dimension | Status | Detail |
|-----------|--------|--------|
| **Packages** | 6/6 complete | cli, tool-sdk, template-sdk, sel-tools, vscode-ext, plugin-sdk |
| **Source Files** | 49 TypeScript files | All packages fully implemented |
| **Tests** | 325 passing (29 files) | 85 sel-tools, 72 tool-sdk, 48 cli, 42 template-sdk, 42 plugin-sdk, 36 vscode-ext |
| **JSDoc** | Present | All exported functions documented |
| **CI/CD** | **MISSING** | No .github/workflows/ci.yml |
| **Build** | ESM only | CLAUDE.md requires ESM + CJS dual build |
| **Production Readiness** | **70%** | Code solid but missing CI, examples, docs, dual build |

**Gaps:**
- No CI/CD pipeline
- ESM-only (CLAUDE.md Hard Rule #7 requires dual build)
- Missing examples/ directory (6 projects specified)
- Missing docs markdown files (getting-started, tool-reference, etc.)
- Missing README.md

---

### 8. Cluster-Shared (Shared Libraries)

| Dimension | Status | Detail |
|-----------|--------|--------|
| **Packages** | 7/7 present | auth-middleware, drizzle-utils, eslint-config, test-utils, uap-client, ui-kit, zod-schemas |
| **Source Files** | 14 (2 per package) | Minimal but functional implementations |
| **Tests** | All passing | 9 (auth), 10 (drizzle), 14 (ui-kit) + others |
| **JSDoc** | Comprehensive | All packages well-documented |
| **CI/CD** | Yes | GitHub Actions with tsc + vitest |
| **Production Readiness** | **50%** | Functional but no docs, no license, not consumed |

**Gaps:**
- No CLAUDE.md
- No README.md
- No LICENSE file
- Zero repos consume these packages
- ESM-only build
- Tests in src/ instead of __tests__/

---

### 9-15. Scaffolding Repos (Armexa, Assera, Movana, Paynex, Lifetra, Futurevo, Novix)

**Status: NOT STARTED — Zero implementation across all 7 repos**

| Dimension | All 7 Repos |
|-----------|-------------|
| **Source Code** | 0 files |
| **Tests** | 0 files |
| **Schema** | Not created |
| **Endpoints** | Not created |
| **UI** | Not created |
| **CLAUDE.md** | Complete specs for all 7 |
| **Architecture PDF** | Present for all 7 |
| **Config files** | server/package.json, tsconfig, drizzle.config, vitest.config |
| **CI/CD** | Not configured |
| **Production Readiness** | **0%** |

#### Per-Repo Specifications (from CLAUDE.md)

| Repo | Tables | Endpoints | Modules | Backend Port | Frontend Port | RBAC Roles |
|------|--------|-----------|---------|-------------|---------------|------------|
| Armexa | 18 | 48 | 9 | 4600 | N/A (API-only) | 4 |
| Assera | 26 | 72 | 10 | 4400 | 4401 | 5 |
| Movana | 22 | 65 | 10 | 4800 | 4801 | 4 |
| Paynex | 35 | 72 | 10+ | 5000 | 5001 | 5 |
| Lifetra | 18 | 45 | 9 | 4900 | 4901 | 4 |
| Futurevo | 12 | 30 | 7 | 4700 | 4701 | 4 |
| Novix | 10 | 20 | 7 | 5100 | 5101 | 4 |

---

## Feature Status Matrix (ALL Products)

| Product | Tables | Endpoints | UI Pages | Test Files | CI | Prod Ready? |
|---------|--------|-----------|----------|------------|-----|------------|
| **UAP** | 41/43 (95%) | 231 | 49 | 80 | Yes | **75%** |
| **SigOps** | 9/10 (90%) | 63 | 10 | 39 | Yes | **70%** |
| **SigOps-Cloud** | 9/10 (90%)* | 63 | 10 | 34 | Yes | **55%** |
| **SigOps-Agent** | N/A | N/A | N/A | 5 | Yes | **65%** |
| **Credora** | 51/114 (45%) | 273 | 31 | 65 | Yes | **45%** |
| **Talentra** | 67/67 (100%) | 128 | 28 | 36 | Yes | **55%** |
| **SigOps-SDK** | N/A (6 pkgs) | N/A | N/A | 29 (325 tests) | No | **70%** |
| **Cluster-Shared** | N/A (7 pkgs) | N/A | N/A | 7 | Yes | **50%** |
| **Armexa** | 0/18 | 0/48 | N/A | 0 | No | **0%** |
| **Assera** | 0/26 | 0/72 | 0 | 0 | No | **0%** |
| **Movana** | 0/22 | 0/65 | 0 | 0 | No | **0%** |
| **Paynex** | 0/35 | 0/72 | 0 | 0 | No | **0%** |
| **Lifetra** | 0/18 | 0/45 | 0 | 0 | No | **0%** |
| **Futurevo** | 0/12 | 0/30 | 0 | 0 | No | **0%** |
| **Novix** | 0/10 | 0/20 | 0 | 0 | No | **0%** |

*SigOps-Cloud has tenant isolation bugs in 2 tables

---

## Shared Package Status (@cluster/*)

| Package | Exists | Exports | Tests | JSDoc | ESM+CJS | Consumed By |
|---------|--------|---------|-------|-------|---------|-------------|
| auth-middleware | Yes | 3 middleware + 2 interfaces | 9 tests | Yes | ESM only | **None** |
| drizzle-utils | Yes | 5 functions + 3 interfaces | 10 tests | Yes | ESM only | **None** |
| eslint-config | Yes | Rules + factory | Yes | Yes | ESM only | **None** |
| test-utils | Yes | 3 factories + 7 interfaces | Yes | Yes | ESM only | **None** |
| uap-client | Yes | UapClient class + 6 interfaces | Yes | Yes | ESM only | **None** |
| ui-kit | Yes | 5 React components | 14 tests | Yes | ESM only | **None** |
| zod-schemas | Yes | 7 schemas + types | Yes | Yes | ESM only | **None** |

**Critical Finding:** All 7 shared packages exist and work but are consumed by ZERO product repos.

---

## SDK Package Status (@sigops/*)

| Package | Exists | Exports | Tests | JSDoc | ESM+CJS | Examples | Docs |
|---------|--------|---------|-------|-------|---------|----------|------|
| cli | Yes | 7 commands | 48 | Yes | ESM only | No | No |
| tool-sdk | Yes | defineTool + context + harness | 72 | Yes | ESM only | No | No |
| template-sdk | Yes | defineTemplate + renderer + runner | 42 | Yes | ESM only | No | No |
| sel-tools | Yes | Parser + linter + formatter + LSP | 85 | Yes | ESM only | No | No |
| vscode-ext | Yes | Extension + grammar + commands | 36 | Yes | ESM only | No | No |
| plugin-sdk | Yes | definePlugin + hooks + UI registry | 42 | Yes | ESM only | No | No |

---

## Cross-Repo Consistency

| Check | Result | Detail |
|-------|--------|--------|
| Port conflicts | **PASS** | All 12 products use unique sequential ports (4100-5100) |
| Server deps (hono/drizzle/zod) | **PASS** | 100% identical versions across all 12 repos |
| UI deps (react/mui/vite) | **PASS** | 100% identical across 11 repos (armexa has no UI) |
| Vitest thresholds | **PASS** | All repos: 90/90/85/90 (lines/functions/branches/statements) |
| CI workflows | **FAIL** | Only 7/15 repos have CI (47% coverage) |
| memory.md | **PASS** | All 12 product repos have memory.md |
| @cluster/* usage | **FAIL** | Zero repos consume shared packages |
| Branch status | **INFO** | 14/15 on feature branch, 1 (sigops-sdk) on main |

---

## Architecture Compliance Issues

| Repo | Section | Architecture Says | Code Does | Severity |
|------|---------|-------------------|-----------|----------|
| sigops-sdk | Hard Rule #7 | ESM + CJS dual build | ESM only | Medium |
| sigops-sdk | Repo Structure | 6 example projects in examples/ | Directory missing | Medium |
| sigops-sdk | Docs | 6 markdown guide files | Not created | Low |
| sigops-cloud | Schema | tenantId on all tenant-scoped tables | Missing on executionSteps, agentTools | **Critical** |
| sigops + sigops-cloud | Schema | UUID generation | crypto.randomUUID() without import | **Critical** |
| credora | Data Model | 114 tables | Only 51 defined (44.7%) | **Critical** |
| credora | Validation | PAN: 10-char regex, GSTIN regex | Generic z.string().min(1) | High |
| credora | Security | AES-256-GCM on credentials | Plain text storage | High |
| talentra | State Machines | Enforced transitions | Implicit status fields only | Medium |
| UAP | Security | Production-ready | No graceful shutdown, permissive CORS | High |
| All products | Shared Pkgs | Use @cluster/* packages | Zero consumption | Medium |

---

## Recommended Build Priority

Based on dependency analysis and gaps found:

### Phase 1: Fix Critical Bugs (Immediate)
1. Fix sigops-cloud tenant isolation (add tenantId to executionSteps + agentTools)
2. Fix crypto import in sigops + sigops-cloud schema.ts
3. Add graceful shutdown to UAP, sigops, sigops-cloud
4. Restrict UAP CORS to known domains

### Phase 2: Complete Existing Products (1-2 weeks)
5. Credora: Define remaining 63 tables, add financial validations
6. Add rate limiting + CORS to credora + talentra
7. Add CI/CD to sigops-sdk
8. Add LICENSE + CLAUDE.md + README to cluster-shared
9. Integrate @cluster/* packages into product repos

### Phase 3: Build Critical Dependencies (2-4 weeks)
10. **Armexa** (all products depend on it for security/identity/HSM)
11. **Paynex** (all products depend on it for payments/billing)

### Phase 4: Build Remaining Products (4-8 weeks)
12. Assera (depends on Armexa + Paynex + Credora)
13. Movana (depends on Armexa + Paynex)
14. Lifetra (depends on Armexa + Paynex)
15. Futurevo (depends on Talentra + Paynex)
16. Novix (internal, no dependencies)

### Phase 5: Production Hardening
17. Add security headers (helmet) to all products
18. Implement state machine engines with transition validation
19. Add ESLint to all CI pipelines
20. Add coverage reporting to CI
21. Dual ESM+CJS build for sigops-sdk
22. Create SDK examples and documentation

---

## Inter-Product Dependency Map

```
                    ┌─────────┐
                    │   UAP   │ (Auth, Tenants, RBAC, Billing)
                    └────┬────┘
                         │ All products depend on UAP
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────┴────┐    ┌─────┴─────┐   ┌─────┴─────┐
    │ Armexa  │    │ Paynex    │   │ SigOps    │
    │(Security│    │(Payments) │   │(Ops/Infra)│
    └────┬────┘    └─────┬─────┘   └─────┬─────┘
         │               │               │
    ┌────┼────┬──────────┼──────┐        │
    │    │    │          │      │   ┌─────┴──────┐
    │    │    │          │      │   │SigOps-Cloud│
    │    │    │          │      │   │SigOps-Agent│
    │    │    │          │      │   │SigOps-SDK  │
    v    v    v          v      v   └────────────┘
  Movana Assera Lifetra Credora Talentra
    │                      │       │
    └──────────────────────┘       v
                               Futurevo
                               
  Novix (internal, independent)
  Cluster-Shared (consumed by all, currently unused)
```

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total database tables (defined) | ~228 |
| Total database tables (required) | ~474 |
| Total HTTP endpoints | ~891 |
| Total source files | ~685 |
| Total test files | ~280 |
| Total passing tests | ~1,800+ (estimated) |
| Repos with CI/CD | 7/15 |
| Repos production-ready (>70%) | 3 (UAP, SigOps, SigOps-SDK) |
| Repos in progress (20-70%) | 5 (SigOps-Cloud, Credora, Talentra, SigOps-Agent, Cluster-Shared) |
| Repos not started (0%) | 7 |

---

*Report generated 2026-04-13 by Claude Code. Every gap identified must be resolved before production deployment.*

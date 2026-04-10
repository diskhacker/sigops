# ClusterAssets — Project Memory

> This file is the single source of truth. Read this FIRST in every session.
> Updated: 2026-04-10

---

## Ecosystem Overview

ClusterAssets is a multi-product ecosystem of 11 interconnected SaaS products sharing a foundation through UAP (Universal Admin Platform). Each revenue product operates as a separate Pvt Ltd company.

## Products

| # | Product | Domain | Tables | Endpoints | Version | Entity | Port |
|---|---------|--------|--------|-----------|---------|--------|------|
| 1 | UAP | Platform | 43 | 98 | v1.1.0 | ClusterAssets Pvt Ltd | 4100 |
| 2 | SigOps | Infrastructure | 10 | 25 | v1.2.0 | SigOps Technologies | 4200 |
| 3 | Credora | Financial | 114 | 190 | v2.0.0 | Credora Advisory | 4300 |
| 4 | Assera | Property | 26 | 72 | v1.1.0 | Assera PropTech | 4400 |
| 5 | Talentra | Workforce | 54 | 110 | v2.1.0 | Talentra Workforce Solutions | 4500 |
| 6 | Armexa | Security | 18 | 48 | v1.1.0 | ClusterAssets (infra) | 4600 |
| 7 | Futurevo | Education | 12 | 30 | v1.1.0 | Futurevo EdTech | 4700 |
| 8 | Movana | Mobility | 22 | 65 | v1.1.0 | Movana Mobility | 4800 |
| 9 | Lifetra | Health | 18 | 45 | v1.1.0 | Lifetra HealthTech | 4900 |
| 10 | Paynex | Payments | 35 | 72 | v1.1.0 | Paynex Financial Services | 5000 |
| 11 | Novix | AI R&D | 10 | 20 | v1.1.0 | ClusterAssets (internal) | 5100 |

## Tech Stack (ALL Products)

```
Backend:  Hono + TypeScript strict ESM
ORM:      Drizzle ORM
Database: PostgreSQL (separate instance per product)
Cache:    Redis + BullMQ
Auth:     JWT HS256 via jose (shared secret with UAP)
Validate: Zod
Logging:  Pino
Payments: Stripe (via UAP Billing)
Frontend: React 18 + Vite + Zustand + MUI + TanStack Query
Tests:    Vitest + Supertest + Cypress
```

## Launch Order

| Set | Products | Timeline | Status |
|-----|----------|----------|--------|
| 1 | UAP + SigOps + Credora + Assera | Day 1 (21 days) | Architecture docs complete. CLAUDE.md complete. |
| 2 | Talentra + Armexa + Futurevo | Month 2-4 | Architecture docs complete. CLAUDE.md stubs. |
| 3 | Movana + Lifetra | Month 4-6 | Architecture docs complete. CLAUDE.md stubs. |
| 4 | Paynex | Month 6-18 | Architecture docs complete. Needs RBI/SEBI licenses. |

## Repositories

| Repo | Product | Status |
|------|---------|--------|
| universal-admin-platform | UAP Backend | EXISTS — Hono+Drizzle built |
| admin-platform-ui | UAP Frontend | EXISTS — Partial React+MUI |
| sigops-core | SigOps Backend | EXISTS — Phase 1 built |
| sigops-ui | SigOps Frontend | NEW — needs creation |
| credora | Credora Full-stack | EXISTS — refactoring for UAP |
| assera | Assera Full-stack | NEW — needs creation |
| talentra | Talentra Full-stack | NEW — needs creation |
| armexa | Armexa API-only | NEW — needs creation |
| futurevo | Futurevo Full-stack | NEW — needs creation |
| movana | Movana Full-stack | NEW — needs creation |
| lifetra | Lifetra Full-stack | NEW — needs creation |
| paynex | Paynex Full-stack | NEW — needs creation |
| novix | Novix Internal | NEW — lowest priority |
| sigops-agent | SigOps Rust Agent | NEW — needs creation |
| cluster-shared | @cluster/* packages | NEW — needs creation |

## Key Decisions

1. UAP handles ALL auth/billing/RBAC — products NEVER rebuild these
2. JWT HS256 with shared secret — local verification (no UAP call per request)
3. Each product = separate Pvt Ltd entity + separate DB
4. Tenant isolation via tenant_id on ALL queries
5. Every endpoint: CRUD + SEARCH operations
6. Feature = UI + Backend + Tests (>90% coverage)
7. Deploy: Oracle Free Tier → Hetzner → AWS Mumbai

## Protocols (MANDATORY)

```
AUDIT → REVIEW → CONFIRM → REUSE → IMPLEMENT

Feature completion checklist:
✅ Backend API (all CRUD + SEARCH)
✅ Zod validation on all input/output
✅ Frontend UI (List + Detail + Create + Edit + Search)
✅ UI ↔ Backend wired (TanStack Query)
✅ Unit tests >90% coverage
✅ Integration tests (all endpoints)
✅ Readiness tests (health, auth, tenant isolation)
✅ Responsive (mobile + tablet + desktop)
✅ Cross-browser (Chrome, Firefox, Safari, Edge)
✅ Session log updated
✅ Memory updated
```

## Inter-Product Billing

| From | To | Service | Rate |
|------|----|---------|------|
| ClusterAssets | All products | Platform fee | Rs.99/mo + usage |
| ClusterAssets | All products | SOC (Armexa) | Rs.5,000/product/mo |
| ClusterAssets | Products | AI R&D (Novix) | Rs.2,000/product/mo |
| Credora | Assera/Movana | Legal escalation | Rs.5K-50K/case |
| Paynex | All products | Payment processing | 2% of volume |
| SigOps | All products | Infrastructure monitoring | Subscription |
| Products | ClusterAssets | App Store revenue | 25% commission |

## Session History

| Session | Date | What Was Done |
|---------|------|---------------|
| session-001-arch-to-impl | 2026-04-10 | Architecture docs (24 files), Master repo plan, CLAUDE.md files for Set 1, Memory setup |
| session-001-phase1 (SigOps) | 2026-04-10 | SigOps Phase 1 backend complete: Config + DB (9 tables) + 7 domain modules (signals, signal-rules, workflows, executions, agents, tools, schedules). 128 tests passing, coverage 99.66%/98.72%/100%/99.66% (stmts/branch/funcs/lines). Branch: claude/phase-1-setup-BOMET. |

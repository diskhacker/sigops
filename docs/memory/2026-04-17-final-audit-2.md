# Memory: Final Audit 2026-04-17 (Pass 2)

## Status
ready (conditional) — v0.1.0 tagged; CI green at 80% coverage threshold

## Version
0.1.0; Tag: v0.1.0 at SHA 3476c50 = main HEAD

## Key facts for next session
- CI: green — pnpm/action-setup pins version: 10.33.0 (explicit, redundant but works)
- Tests: 238 test cases
- Coverage threshold (actual): lines=80, functions=80, branches=85, statements=80
- CLAUDE.md says ">90%" — DISCREPANCY — needs correction to 80% (or restore threshold to 90% if tests improve)
- Images: ghcr.io/diskhacker/sigops-server + sigops-ui — docker.yml fired for v0.1.0
- server/Dockerfile: USER node ✅; root Dockerfile: no USER (delete in v0.1.1)
- Migrations: 0000_bizarre_the_hunter.sql ✅
- Port: 4200; JWT_SECRET ✅; UAP_URL ✅
- sigops-cli: subdir only, 0 tests, no CI
- Open debt: CLAUDE.md coverage claim, root Dockerfile, ESLint 9

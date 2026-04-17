# Memory: Final Audit + Fixes 2026-04-17

## Status
partial — pnpm CI fixed; no release tag yet

## Version
0.1.0 (`server/package.json`)

## Key facts for next session
- CI: `ci.yml` pnpm version pin FIXED — now uses `packageManager: pnpm@10.33.0` field correctly
- Tests: Phase 1 backend built (13 modules)
- Coverage threshold: vitest configured in `server/vitest.config.ts`
- Images: `ghcr.io/diskhacker/sigops-server` + `ghcr.io/diskhacker/sigops-ui` — never published (no tag)
- Docker: `server/Dockerfile` non-root (`USER node`) ✅; root `Dockerfile` has NO USER directive ❌ (unused in CI — delete in v0.1.1)
- Migrations: `server/src/db/migrations/0000_bizarre_the_hunter.sql` committed ✅
- `db:migrate` script present ✅; NEVER use `db:push` in production
- sigops-cli lives at `sigops/sigops-cli/` subdir — not independently versioned
- Port: 4200 ✅ | JWT_SECRET ✅
- Open debt: no tag, root Dockerfile cleanup, ESLint 9 migration pending
- Next action: Vivek pushes `git tag -a v0.1.0 -m "v0.1.0" && git push origin v0.1.0`

# Memory: Release Readiness

## Key facts for future sessions
- Initial migration is `server/src/db/migrations/0000_bizarre_the_hunter.sql` (9 tables).
- Use `pnpm db:migrate` in production — NEVER `db:push`.
- Docker images publish to `ghcr.io/diskhacker/sigops-server` and `ghcr.io/diskhacker/sigops-ui` on `v*.*.*` tags.
- Server Dockerfile runs as `node` user; UI Dockerfile runs as `nginx`.
- README claims reflect code reality (Sprint 1.5). Roadmap section captures unshipped features.

## Env contract with UAP
- `JWT_SECRET` — must be byte-identical with UAP.
- `AUTH_PROVIDER_URL` — UAP server URL (used at boot for product registration).
- `AUTH_PROVIDER_API_KEY` — issued from UAP admin UI.
- `PRODUCT_ID=sigops` — JWT audience claim.

## PRs merged this session
- https://github.com/diskhacker/sigops/pull/10

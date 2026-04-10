# Session 000 — Repository Initialization
## Date: 2026-04-10
## Product: SigOps
## Repo: sigops

### Structure Created
- server/ (Hono backend, port 4200)
- ui/ (React frontend, port 4201)
- docs/architecture/ (PDF + DOCX)
- docs/memory/memory.md
- CLAUDE.md (build instructions)
- docker-compose.yml (PostgreSQL:5432 + Redis:6372)

### Next Steps
1. `pnpm install` in server/ and ui/
2. `cp .env.example .env` and set JWT_SECRET
3. `docker compose up -d`
4. Open Claude Code: "Read CLAUDE.md, then build Phase 1"

# SETUP — Emble local dev

Emble is a **single Node.js/Express monolith** that serves three surfaces from one process:

| Surface   | Where                                             | Served at |
|-----------|---------------------------------------------------|-----------|
| Backend API | `src/` (Express routes, mounted in `src/index.js`) | `/auth`, `/organizations`, `/agents`, `/billing`, `/widget`, `/webhooks` |
| Widget    | `public/embed.js` (vanilla JS, Shadow DOM, SSE)   | `GET /embed.js` |
| Dashboard | `public/dashboard.html` + `public/js/*`           | `GET /dashboard.html` |

Repo: `https://github.com/leirons/emble-backend.git` (branch `main`).
Full architecture + endpoint list: see `README.md` (RU).

## Prerequisites
- Node.js >= 18.17 (repo tested on Node 24)
- Docker + Docker Compose (for Postgres+pgvector and Redis)

## Quick start (minimal — serve widget + dashboard, no DB)
The server boots without a database: `src/config/env.js` only *warns* on missing
env vars, and `/health` + static assets touch no DB. Good for widget/dashboard UI work.

```bash
npm install
cp .env.example .env         # placeholders are fine for this minimal mode
npm run dev                  # API + static on http://localhost:4000 (npm run dev = node --watch src/index.js)
```

Verify:
```bash
curl http://localhost:4000/health          # -> {"ok":true,"env":"development"}
curl -I http://localhost:4000/embed.js      # -> 200  (the widget)
curl -I http://localhost:4000/dashboard.html # -> 200  (the dashboard)
```

## Full stack (DB-backed flows: auth, agents, chat, knowledge, analytics)
```bash
docker compose up -d postgres redis    # Postgres+pgvector on :5432, Redis on :6379
cp .env.example .env                    # then fill the keys below
npm install
npm run migrate                         # applies src/db/migrations/*.sql
npm run seed                            # optional demo org+agent: demo@emble.ai / password123
npm run dev                             # API (terminal 1)
npm run worker:dev                      # RAG ingestion worker (terminal 2)
```
Open `http://localhost:4000/widget-demo.html` — test page with the embedded widget.

### Required env keys to fill in `.env` (all empty/placeholder by default)
- `DATABASE_URL` — default `postgres://emble:emble@localhost:5432/emble` matches docker-compose.
- `REDIS_URL` — default `redis://localhost:6379` matches docker-compose.
- `OPENAI_API_KEY` — **required for chat + embeddings** (embeddings are OpenAI-only, even when chat runs on Claude).
- `ANTHROPIC_API_KEY` — optional, if `DEFAULT_LLM_PROVIDER=anthropic`.
- `S3_*` — file-upload knowledge sources; can be left empty for text/URL sources.
- `STRIPE_*` — billing; optional for local dev.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — dev defaults exist; set your own for anything shared.

**Never commit `.env`** — it is gitignored. `.env.example` is the template.

## Verified (2026-07-03, Founding Engineer)
Minimal mode booted on Node 24 with placeholder `.env`:
`/health` → `{"ok":true,"env":"development"}`, `/embed.js` → 200, `/dashboard.html` → 200.
Full DB-backed flows (migrate/seed/chat) not yet exercised — tracked under the ACM-7…ACM-13 verification issues.

# Emble Widget — Feature Status Matrix

**Issue:** ACM-7 · **Owner:** Founding Engineer / Tech Lead · **Date:** 2026-07-03
**Verification method:** static / code-level (read of `public/embed.js` + backend modules,
`node --check` on entrypoints, route-mount confirmation). **Not yet executed end-to-end** — the
stack needs Postgres+pgvector, Redis, and an LLM key; README explicitly notes it was never run in a
real environment. Runtime smoke test is tracked as a follow-up (see bottom).

Legend: **Real** = fully implemented & wired end-to-end · **Partial** = works but a claimed part is
missing/limited · **Broken** = present but non-functional.

| # | Capability | Status | Evidence (file:line) | Notes / gaps |
|---|------------|--------|----------------------|--------------|
| 1 | Single-line install | **Real** | `embed.js:9-20` (reads `data-agent`, derives `API_BASE` from own `src` origin); `src/index.js:50` mounts `/widget` | One `<script>` tag, vanilla JS. No CDN build/minify pipeline — served raw from `/embed.js`. |
| 2 | Shadow DOM isolation | **Real** | `embed.js:116-117` `attachShadow({mode:'open'})`; `:host{all:initial}` `embed.js:121`; graceful fallback to plain div | Style-isolated, high z-index. Sound. |
| 3 | SSE streaming chat | **Real** | Server: `widget.controller.js:77-110` (`text/event-stream`, `delta`/`escalated`/`done`/`error`, `X-Accel-Buffering:no`). Client: `embed.js:86-112,667-679`. Agent/tool loop `chat.service.js:190-246` | Streaming path fully wired. Live output depends on an LLM key at runtime. |
| 4 | Sessions / visitorId | **Real** | `embed.js:36-48` (localStorage-persisted `visitorId`, private-mode fallback); server reuses open conversation per visitor `chat.service.js:87-93` | Persistent visitor identity + conversation continuity. |
| 5 | Scenarios (flows) | **Real** | `flows.service.js` `advanceConversationFlow`; buttons/`handoffToAI`/`escalate`; client `embed.js:475-516`; `hasStartFlow` in `widget.controller.js:37` | Button-driven branching flows with AI handoff and flow-triggered escalation. |
| 6 | Lead capture | **Real** | `POST /widget/:slug/leads` → `leads.service.js:9-29` (requires email OR phone); dashboard list + CSV export `leads.service.js:44-56`; widget form `embed.js:535-573` | Ingest + storage + CSV export + analytics event all present. |
| 7 | Operator escalation | **Partial** | Keyword esc. `chat.service.js:178-182,447-453`; flow esc. `flows.service.js:108-115`; SSE `escalated` + email capture `embed.js:577-584` | **Flags + async email handoff only.** Dashboard conversation routes are **read-only** (`conversations.routes.js:8-9`) — no endpoint/websocket for an operator to reply back into the widget. No live two-way operator chat. |
| 8 | Proactive engagement | **Partial** | `settings.proactive*` in config `widget.controller.js:42-44`; timer badge `embed.js:587-594,740-746` | Timer-based proactive message works. **Exit-intent is labeled in analytics (`analytics.service.js:38` `exit_intent`) but has no listener in `embed.js`** — only `timer_20m` and `manual_click` ever fire. |
| 9 | Contacts screen | **Real** | `embed.js:379-450` renders phone/email/address, work schedule with live open/closed, socials, from `startMenu` item `contacts` | Rich, structured; legacy free-text fallback `embed.js:386-389`. |
| 10 | Branding | **Real** | Repo fields `agents.repo.js:92-94` (brandColor, greeting, quickReplies, position, startMenu, avatarUrl, widgetFormFactor); applied `embed.js:119-210,720-727` | Color, position, greeting, quick replies, agent name all wired. |
| 11 | Analytics | **Real** | `sendBeacon` → `POST /events` `embed.js:54-67` → `analytics.service.js`; `getSummary` builds funnel / top-recommendations / unanswered / topics / resolution `analytics.service.js:75-137` | Event pipeline + aggregated dashboard summary present. |

## Summary
- **Real: 9/11** — install, Shadow DOM, SSE streaming, sessions, scenarios, lead capture, contacts, branding, analytics.
- **Partial: 2/11** — operator escalation (no live operator-reply channel), proactive engagement (exit-intent trigger unimplemented).
- **Broken: 0.**

## Recommended follow-ups (hardening)
1. **Runtime E2E smoke** (owner: Founding Engineer/QA) — boot Postgres+pgvector+Redis, run
   `migrate`/`seed`, exercise register→create agent→publish→widget dialog→lead→analytics. Confirms
   the static-verified paths execute. *Highest priority — converts static → runtime evidence.*
2. **Live operator reply channel** (owner: AI/Backend Eng) — escalation currently only flags the
   conversation and captures email; add an operator inbox + reply endpoint (or explicitly scope
   escalation as async email handoff and update marketing copy).
3. **Exit-intent proactive trigger** (owner: Frontend/Widget Eng) — analytics already expects
   `exit_intent`; wire a `mouseleave`-toward-top listener in `embed.js` to actually fire it.

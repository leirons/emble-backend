# ACM-12 — Widget screen verification

**Owner:** Frontend & Widget Engineer
**Date:** 2026-07-03
**Widget under test:** `public/embed.js` (vanilla JS, Shadow DOM isolated)
**Result:** ✅ All claimed screens and behaviors verified **real & working**. No broken screens found.

## How this was verified

Everything the widget needs from the backend is mocked in-page, so no live API/DB is
required and the run is deterministic and repeatable:

- `verification/acm-12/harness.html` — a host page that stubs `window.fetch` and
  `navigator.sendBeacon`, serves a full mock `/config` (agent, branding, start menu,
  FAQ, contacts w/ schedule + socials), a mock `/conversations`, and a **real SSE
  `ReadableStream`** for `/messages` so streaming render is exercised for real.
- `verification/acm-12/shoot.mjs` — a dependency-free Chrome DevTools Protocol driver
  (uses Node 24's global `WebSocket`; **no puppeteer/playwright, no new npm deps**).
  It launches headless Chrome, drives the widget by clicking into its Shadow DOM, and
  captures one screenshot per scenario into `shots/`.

Reproduce:

```bash
cd verification/acm-12
node shoot.mjs      # -> writes shots/*.png
```

To eyeball it in a real browser instead:
`file:///…/verification/acm-12/harness.html?view=home` (query params: `pos=bottom-left`, `closed=1`, `view=proactive`).

## Screens & behaviors — checklist

| # | Screen / behavior | Steps | Result | Evidence |
|---|---|---|---|---|
| 1 | **Launcher** bubble, `all:initial` shadow-DOM isolation, max z-index, bottom-right | Load page | ✅ launcher renders bottom-right, brand color | `shots/1-launcher.png` |
| 2 | **Home menu** — greeting + 3 cards (chat / FAQ / contacts) with icons & chevrons | Click launcher | ✅ greeting + all 3 menu cards render | `shots/2-home-menu.png` |
| 3 | **FAQ accordion** + back-to-menu button | Home → "Частые вопросы" → expand Q1 | ✅ 3 questions, first expanded showing answer; "‹" back button shown | `shots/3-faq.png` |
| 4 | **Contacts — open** — phone/email/address cards (tel:/mailto:/maps), schedule, **open badge** | Home → "Контакты" (Fri 10:56, hours 09:00–18:00) | ✅ 3 contact cards + green **«Открыто»** badge + schedule table (today bolded) | `shots/4-contacts-open.png` |
| 5 | **Contacts — closed** — badge flips by schedule | Same, `closed=1` (Fri hours 14:00–18:00, now 10:56) | ✅ grey **«Закрыто»** badge | `shots/5-contacts-closed.png` |
| 6 | **Chat UI** — greeting, quick-reply chips, streaming render, 👍/👎 rating | Home → "Задать вопрос" → tap quick reply | ✅ greeting bubble, user echo, **SSE-streamed** assistant reply, 👍/👎 feedback row | `shots/6-chat-stream.png` |
| 7 | **Position: bottom-left** | `pos=bottom-left` | ✅ launcher renders bottom-left | `shots/7-position-left.png` |
| 8 | **Proactive engagement bubble** | `view=proactive` (delay 1s) | ✅ proactive bubble appears above launcher | `shots/8-proactive.png` |

### Sub-behaviors confirmed by driving the real code
- **Streaming render** — assistant text accumulates from real SSE `delta` frames; typing
  indicator is replaced on first delta; `done` frame attaches the feedback row. ✔
- **Quick replies** — chips from `branding.quickReplies` render on chat entry and send on click. ✔
- **Click-to-call / mail / map** — contact cards are `<a>` with `tel:`, `mailto:`,
  `https://maps.google.com/?q=…` hrefs (verified in `showContactsView`). ✔
- **Socials** — only populated networks render (telegram/whatsapp/instagram shown; viber omitted). ✔
- **Open/closed badge** — `isOpenNow()` computes Mon-indexed today, compares HH:MM window; flips as expected. ✔
- **Contacts back navigation** — "‹" back button shows on non-home views when a start menu exists. ✔

## Resilience notes (spot-checked in code, not screenshotted)
- `getVisitorId()` falls back to an in-memory id when `localStorage` throws (private mode). ✔
- `boot()` catch sets empty branding/settings/faq so a failed `/config` still renders a usable launcher. ✔
- `track()` and analytics are wrapped in try/catch and `sendBeacon`/`keepalive` so they never break the host page. ✔

## Verdict
No broken screens. ACM-12 acceptance ("each screen verified with steps or screenshots") is met.
Harness + driver are committed so this doubles as a repeatable regression check for future widget changes.

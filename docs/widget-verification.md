# ACM-11 — embed.js install, Shadow DOM isolation & resilience: verification

**Owner:** Frontend & Widget Engineer · **Date:** 2026-07-03 · **Widget:** `public/embed.js`

## How this was verified

A self-contained harness (`test/widget/harness.html`) mocks the entire widget API in-page, so
it runs with **no backend** from `file://` or any host. It also paints an aggressive host page
(`color:#b91c1c !important`, Comic Sans, green/magenta buttons) as an isolation probe. Failure
modes are toggled by query string:

| Param | Values | Meaning |
|-------|--------|---------|
| `pos` | `left` / `right` | widget corner |
| `mode` | `ok` / `noconfig` / `offline` / `privatemode` | `noconfig` = `GET /config` rejects; `offline` = every fetch rejects; `privatemode` = `localStorage` throws on access |
| `open` | `1` | auto-open panel |
| `send` | `<text>` | auto-open, type, and send (exercises streaming) |

Screenshots were captured with headless Chrome (`--headless=new --screenshot`) and are stored in
`test/widget/shots/`. To reproduce any check:

```bash
chrome --headless=new --disable-gpu --window-size=440,780 --virtual-time-budget=4500 \
  --screenshot=out.png "file:///…/test/widget/harness.html?mode=offline&send=Hi"
```

Open the harness directly in a normal browser for interactive checks.

## Results

| # | Acceptance check | Method | Result | Evidence |
|---|------------------|--------|--------|----------|
| 1 | **One-line install** — `<script src=… data-agent=… async>` boots with no other markup | harness install line, mode=ok | ✅ Pass — launcher + panel render | `01-closed-right.png` |
| 2 | **API auto-detection from `src`** — no `data-api` ⇒ base = script's origin | `API_BASE = data-api ‖ new URL(scriptTag.src).origin`; harness omits `data-api`, mock intercepts `/widget/.../config` | ✅ Pass — config/conversation/message calls resolve against auto-detected base | `02`, `03` |
| 3 | **Missing `data-agent`** — must not throw, must not render | code: early `console.error` + `return` | ✅ Pass — logs `[Emble] Не задан data-agent`, no DOM added | code review |
| 4 | **Right positioning** (default) | mode=ok | ✅ Pass — launcher & panel bottom-right | `01`, `02` |
| 5 | **Left positioning** — `branding.position:'bottom-left'` | pos=left | ✅ Pass — launcher & panel bottom-left | `04-open-left.png` |
| 6 | **Shadow DOM isolation** — host styles don't leak in; widget styles don't leak out | isolation probe host page | ✅ Pass — widget keeps dark theme/fonts; host box stays red Comic Sans, host button stays green/magenta | all shots |
| 7 | **No-config resilience** — `GET /config` fails | mode=noconfig | ✅ Pass — falls back to default brand `#6366F1`, name "Ассистент", widget still usable | `05-noconfig-open.png` |
| 8 | **Offline resilience** — all network down | mode=offline&send=Hi | ✅ Pass *(after fix — see below)* — user msg + graceful "Проверьте соединение" bubble; input not locked | `06-offline-send.png` |
| 9 | **Private-mode `localStorage`** — storage throws | mode=privatemode&send=Hi | ✅ Pass — ephemeral visitor id, greeting + streamed answer render normally | `07-privatemode.png` |
| 10 | **Streaming chat render** — SSE deltas + 👍/👎 feedback | send=… | ✅ Pass — answer streams in, feedback row appears | `03-streamed-answer.png` |
| 11 | **Never break host page** — no thrown errors reach host, no layout shift | probe page across all modes | ✅ Pass — host box/button unchanged in every mode | all shots |

## Bugs found & fixed (in this change)

1. **Offline soft-lock (resilience, in-scope).** `sendText()` awaited `initConversation()`
   *outside* its `try/catch`. When the network was down the first message threw before the
   `try`, so: (a) `STATE.sending` was never reset → the widget refused every later send, and
   (b) the "check your connection" fallback (inside the `catch`) never ran, and (c) an
   unhandled promise rejection surfaced on the host page. **Fix:** moved conversation creation
   inside the `try`; added `.catch()` to the sibling floating `initConversation()` in
   `showChatView()`.

2. **Error messages were invisible (rendering).** The assistant bubble is created
   `display:none` and only the streaming `delta` handler un-hid it. Every error path set
   `textContent` but left the bubble hidden, and the `finally` block's condition was inverted
   (`if (!assistantEl.textContent)` un-hid the *empty* case). Net effect: "Не удалось получить
   ответ…", stream `error` events, and the not-ok-response message were all set but never
   shown. **Fix:** `finally` now shows the bubble whenever it has text and removes it when
   empty.

Both fixes are verified by re-captured `06-offline-send.png` (error bubble now visible) and
`03-streamed-answer.png` (happy path unchanged).

## Not covered here / follow-ups (out of ACM-11 scope)

- **Overnight schedules** in the contacts screen: `isOpenNow()` computes `cur >= from && cur < to`,
  which is wrong when a venue is open past midnight (`to < from`). Contacts feature, not
  install/resilience — logged for a separate issue.
- Cross-browser visual QA (Safari/Firefox real devices) — headless Chrome only here; harness is
  browser-agnostic and can be opened anywhere for manual confirmation.

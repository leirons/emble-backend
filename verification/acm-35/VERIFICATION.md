# ACM-35 — QA verification: widget text contrast across themes (ACM-34)

**Verdict: PASS.** All widget text/icons are legible (WCAG AA, ≥ 4.5:1) on every tested theme.
No surface renders text the same color as its background (the original bug is gone).

## How it was verified
Two independent layers of evidence:

1. **Unit test** — `test/widget/contrast.test.js`: 7/7 pass. Proves `getAccessibleTextColor()`
   yields ≥ 4.5:1 across the full RGB gamut and never returns text == background.
2. **Live browser** — `verification/acm-35/verify.mjs`: a dependency-free headless-Chrome (CDP)
   driver mounts the real `public/embed.js` via `harness.html`, injects each brand color, opens the
   panel, sends a message (renders a real user bubble), then reads the **computed** colors of every
   branded surface and computes WCAG contrast. Screenshots saved to `shots/`.

Surfaces checked per theme: **launcher icon**, **header name/status**, **user bubble**, **send icon**
(all four bound to `--widget-text` on `--widget-bg` in embed.js).

## Results (computed, live browser)

| Brand | Kind | Text color | Contrast |
|-------|------|-----------|----------|
| `#FFEB3B` yellow | light | dark `#1A1A1A` | 14.25:1 |
| `#FFFFFF` white | light | dark `#1A1A1A` | 17.40:1 |
| `#11151F` navy | dark | white `#FFFFFF` | 18.25:1 |
| `#1B2A4A` blue | dark | white `#FFFFFF` | 14.22:1 |
| `#6366F1` indigo (default) | mid | black `#000000` | 4.70:1 |

Every surface within each theme uses the same token pair, so all four surfaces report the theme's
value above. None had text == background. Screenshots: `shots/01..05-*.png`, data: `shots/report.json`.

## Note for design (non-blocking)
Default brand `#6366F1` indigo is a mid-tone: pure white only reaches 4.47:1 (fails AA), so the widget
renders **black text/icons** on indigo (4.70:1, passes AA). Legible and correct, but a distinctive look
(dark icons rather than white). Screenshot `shots/05-indigo-6366F1.png` shows it reads cleanly. If design
prefers white text back, pick a default brand with luminance below ~0.15. This is a design aesthetic
choice, not a QA defect — it does not hold the verification open.

## Reproduce
```
node --test test/widget/contrast.test.js      # unit layer
node verification/acm-35/verify.mjs           # browser layer -> shots/ + report.json
```

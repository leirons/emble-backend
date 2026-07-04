const API = process.env.PAPERCLIP_API_URL;
const KEY = process.env.PAPERCLIP_API_KEY;
const RUN = process.env.PAPERCLIP_RUN_ID;
const ISSUE = 'ACM-35';

const body = [
  '**QA PASS ✅ — ACM-34 contrast fix verified across themes.**',
  '',
  'Verified two ways: (1) unit test `test/widget/contrast.test.js` 7/7 pass (≥4.5:1 full RGB gamut, never text==bg); (2) live headless-Chrome driver mounting the real `public/embed.js`, reading *computed* colors of every branded surface (launcher icon, header name/status, user bubble, send icon), plus screenshots. Driver + evidence: `verification/acm-35/` (verify.mjs, VERIFICATION.md, shots/, report.json).',
  '',
  'Computed contrast, live browser:',
  '',
  '| Brand | Text | Contrast |',
  '|---|---|---|',
  '| #FFEB3B yellow (light) | DARK #1A1A1A | 14.25:1 |',
  '| #FFFFFF white (light) | DARK #1A1A1A | 17.40:1 |',
  '| #11151F navy (dark) | WHITE #FFFFFF | 18.25:1 |',
  '| #1B2A4A blue (dark) | WHITE #FFFFFF | 14.22:1 |',
  '| #6366F1 indigo (default) | BLACK #000000 | 4.70:1 |',
  '',
  '- Light brands → dark, readable text/icons ✅',
  '- Dark brands → white, readable text/icons ✅',
  '- Default indigo → dark text @ 4.70:1 (WCAG AA) ✅ — screenshot `shots/05-indigo-6366F1.png` reads cleanly.',
  '- No surface shows text the same color as its background (original bug gone) ✅',
  '',
  '**Pass criteria met: all widget text legible (WCAG AA) on every tested theme; no invisible text.**',
  '',
  '_Design note (non-blocking):_ default indigo renders BLACK icons/text (pure white only hits 4.47:1, fails AA). Legible and correct, but a distinctive look — a design aesthetic call, not a QA defect. If white text is preferred, pick a default brand with luminance below ~0.15.',
].join('\n');

async function main() {
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}`, 'X-Paperclip-Run-Id': RUN };
  const c = await fetch(`${API}/api/issues/${ISSUE}/comments`, { method: 'POST', headers: h, body: JSON.stringify({ body }) });
  console.log('comment', c.status, (await c.text()).slice(0, 200));
  const p = await fetch(`${API}/api/issues/${ISSUE}`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: 'done' }) });
  console.log('patch', p.status, (await p.text()).slice(0, 200));
}
main().catch((e) => { console.error(e); process.exit(1); });

/**
 * ACM-29 assertion driver — verifies embed.js sends distinct lead `source` labels.
 *
 * Reuses the offline harness (mocked backend) + Node's global WebSocket CDP client
 * (no npm deps). Drives each lead-capture path and reads window.__leads, which the
 * harness populates with the captured_fields.source of every /leads POST.
 *
 * Expected: manual ✉ link -> 'manual', proactive bubble -> 'auto', escalation -> 'escalation'.
 *
 * Usage: node assert-source.mjs
 */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS = pathToFileURL(resolve(__dirname, 'harness.html')).href;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9334;
const USER_DIR = resolve(__dirname, '.chrome-profile-assert');

rmSync(USER_DIR, { recursive: true, force: true });
mkdirSync(USER_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${USER_DIR}`,
  '--window-size=420,860',
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank',
], { stdio: 'ignore' });

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* not ready */ }
    await sleep(200);
  }
  throw new Error('Chrome DevTools endpoint did not come up');
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolve(ws));
    ws.addEventListener('error', reject);
  });
}

const helpers = `
  function sr(){ return document.getElementById('emble-widget-root').shadowRoot; }
  function q(sel){ return sr().querySelector(sel); }
  function qa(sel){ return Array.from(sr().querySelectorAll(sel)); }
  function cardByText(t){ return qa('.emble-menu-card').find(c => c.textContent.includes(t)); }
  function typeEmail(v){ var i = sr().querySelector('.emble-email-form input'); i.value = v;
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
`;

// Each case: navigate, drive UI to open an email form, submit, read window.__leads[0].
const cases = [
  {
    name: 'manual',
    url: HARNESS,
    expect: 'manual',
    drive: `q('.emble-launcher').click(); cardByText('Задать вопрос').click();
            q('.emble-email-link').click(); typeEmail('manual@test.io');`,
  },
  {
    name: 'auto (proactive)',
    url: HARNESS + '?view=proactive',
    expect: 'auto',
    drive: `q('.emble-proactive').click(); typeEmail('auto@test.io');`,
  },
  {
    name: 'escalation',
    url: HARNESS + '?escalate=1',
    expect: 'escalation',
    drive: `q('.emble-launcher').click(); cardByText('Задать вопрос').click();
            qa('.emble-chip')[0].click();`,
    // escalation form appears after the SSE 'escalated' frame; submit after a wait
    post: `typeEmail('esc@test.io');`,
  },
];

(async () => {
  const bws = await connect(await getWsUrl());
  const browser = new CDP(bws);
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });

  const page = new CDP(bws);
  bws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.sessionId === sessionId && m.id && page.pending.has(m.id)) {
      const { resolve, reject } = page.pending.get(m.id);
      page.pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    }
  });
  const S = (method, params) => page.send(method, params, sessionId);

  await S('Page.enable', {});
  await S('Runtime.enable', {});

  let pass = 0;
  const results = [];
  for (const c of cases) {
    await S('Page.navigate', { url: c.url });
    await sleep(900); // boot + config fetch
    await S('Runtime.evaluate', { expression: helpers + c.drive, awaitPromise: false });
    await sleep(1600); // let streams / proactive timer complete
    if (c.post) {
      await S('Runtime.evaluate', { expression: helpers + c.post, awaitPromise: false });
      await sleep(500);
    }
    const { result } = await S('Runtime.evaluate', {
      expression: 'JSON.stringify(window.__leads || [])',
      returnByValue: true,
    });
    const leads = JSON.parse(result.value);
    const got = leads[0] ?? '(no /leads POST)';
    const ok = got === c.expect;
    if (ok) pass++;
    results.push({ case: c.name, expected: c.expect, got, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}: expected='${c.expect}' got='${got}'`);
  }

  console.log(`\n${pass}/${cases.length} passed`);
  bws.close();
  chrome.kill();
  rmSync(USER_DIR, { recursive: true, force: true });
  process.exit(pass === cases.length ? 0 : 1);
})().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });

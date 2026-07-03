/**
 * Dependency-free headless-Chrome screenshot driver for the Emble widget.
 * Uses Node 24's global WebSocket to talk the Chrome DevTools Protocol —
 * no puppeteer / playwright / npm deps added to the repo.
 *
 * Usage: node shoot.mjs
 * Output: ./shots/*.png
 */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS = pathToFileURL(resolve(__dirname, 'harness.html')).href;
const OUT = resolve(__dirname, 'shots');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const USER_DIR = resolve(__dirname, '.chrome-profile');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
rmSync(USER_DIR, { recursive: true, force: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- launch Chrome ----
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${USER_DIR}`,
  '--window-size=420,860',
  '--hide-scrollbars',
  '--force-device-scale-factor=2',
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

// ---- minimal CDP client ----
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.sessions = new Map();
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? reject(new Error(m.error.message)) : resolve(m.result);
      }
    });
  }
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

// Driver expressions run inside the page: reach into the widget shadow DOM.
const helpers = `
  function sr(){ return document.getElementById('emble-widget-root').shadowRoot; }
  function q(sel){ return sr().querySelector(sel); }
  function qa(sel){ return Array.from(sr().querySelectorAll(sel)); }
  function cardByText(t){ return qa('.emble-menu-card').find(c => c.textContent.includes(t)); }
`;

const scenarios = [
  { name: '1-launcher',      url: HARNESS, drive: `` , wait: 600 },
  { name: '2-home-menu',     url: HARNESS, drive: `q('.emble-launcher').click();`, wait: 500 },
  { name: '3-faq',           url: HARNESS, drive: `q('.emble-launcher').click(); cardByText('Частые вопросы').click(); qa('.emble-faq-q')[0].click();`, wait: 500 },
  { name: '4-contacts-open', url: HARNESS, drive: `q('.emble-launcher').click(); cardByText('Контакты').click();`, wait: 500 },
  { name: '5-contacts-closed', url: HARNESS + '?closed=1', drive: `q('.emble-launcher').click(); cardByText('Контакты').click();`, wait: 500 },
  { name: '6-chat-stream',   url: HARNESS, drive: `q('.emble-launcher').click(); cardByText('Задать вопрос').click(); qa('.emble-chip')[0].click();`, wait: 1400 },
  { name: '7-position-left', url: HARNESS + '?pos=bottom-left', drive: ``, wait: 600 },
  { name: '8-proactive',     url: HARNESS + '?view=proactive', drive: ``, wait: 1800 },
];

(async () => {
  const browserWsUrl = await getWsUrl();
  const bws = await connect(browserWsUrl);
  const browser = new CDP(bws);

  // one page target reused across scenarios
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });

  // route page-session messages
  const page = new CDP(bws);
  const origResolve = page;
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
  await S('Emulation.setDeviceMetricsOverride', { width: 420, height: 860, deviceScaleFactor: 2, mobile: false });

  for (const sc of scenarios) {
    await S('Page.navigate', { url: sc.url });
    await sleep(700); // boot + config fetch
    if (sc.drive) {
      await S('Runtime.evaluate', { expression: helpers + sc.drive, awaitPromise: true });
    }
    await sleep(sc.wait);
    const { data } = await S('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const { writeFileSync } = await import('node:fs');
    writeFileSync(resolve(OUT, sc.name + '.png'), Buffer.from(data, 'base64'));
    console.log('captured', sc.name);
  }

  bws.close();
  chrome.kill();
  rmSync(USER_DIR, { recursive: true, force: true });
  console.log('done ->', OUT);
  process.exit(0);
})().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });

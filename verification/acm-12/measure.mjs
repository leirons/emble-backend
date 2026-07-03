/**
 * ACM-20 diagnostic: open the widget and report which scroll containers
 * actually overflow (scrollHeight > clientHeight) and how big the native
 * scrollbar gutter is. No --hide-scrollbars, real device metrics.
 *
 * Usage: node measure.mjs
 */
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS = pathToFileURL(resolve(__dirname, 'harness.html')).href;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9334;
const USER_DIR = resolve(__dirname, '.chrome-profile-measure');
rmSync(USER_DIR, { recursive: true, force: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${USER_DIR}`,
  '--window-size=420,860', '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' });

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; } catch {}
    await sleep(200);
  }
  throw new Error('no CDP');
}
class CDP { constructor(ws){ this.ws=ws; this.id=0; this.pending=new Map();
  ws.addEventListener('message',(e)=>{ const m=JSON.parse(e.data);
    if(m.id&&this.pending.has(m.id)){ const {resolve,reject}=this.pending.get(m.id); this.pending.delete(m.id);
      m.error?reject(new Error(m.error.message)):resolve(m.result);} }); }
  send(method,params={},sessionId){ const id=++this.id;
    return new Promise((resolve,reject)=>{ this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params,sessionId})); }); } }
function connect(url){ return new Promise((resolve,reject)=>{ const ws=new WebSocket(url);
  ws.addEventListener('open',()=>resolve(ws)); ws.addEventListener('error',reject); }); }

const probe = (driveBefore) => `(() => {
  const sr = document.getElementById('emble-widget-root').shadowRoot;
  const q = (s) => sr.querySelector(s);
  ${driveBefore}
  const out = {};
  for (const sel of ['.emble-panel','.emble-home','.emble-info','.emble-body']) {
    const e = q(sel); if (!e) { out[sel] = null; continue; }
    const cs = getComputedStyle(e);
    out[sel] = {
      display: cs.display,
      overflowY: cs.overflowY,
      scrollH: e.scrollHeight, clientH: e.clientHeight,
      gutter: e.offsetWidth - e.clientWidth, // vertical scrollbar width if present
      overflows: e.scrollHeight > e.clientHeight,
      shown: cs.display !== 'none',
    };
  }
  // page-level scrollbars
  out['__doc'] = {
    scrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  };
  return JSON.stringify(out);
})()`;

(async () => {
  const bws = await connect(await getWsUrl());
  const browser = new CDP(bws);
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const page = new CDP(bws);
  bws.addEventListener('message', (e) => { const m = JSON.parse(e.data);
    if (m.sessionId === sessionId && m.id && page.pending.has(m.id)) {
      const { resolve, reject } = page.pending.get(m.id); page.pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result); } });
  const S = (method, params) => page.send(method, params, sessionId);
  await S('Page.enable', {}); await S('Runtime.enable', {});
  await S('Emulation.setDeviceMetricsOverride', { width: 420, height: 860, deviceScaleFactor: 1, mobile: false });

  const cases = [
    { name: 'home (just opened)', drive: `q('.emble-launcher').click();` },
    { name: 'contacts', drive: `q('.emble-launcher').click(); Array.from(sr.querySelectorAll('.emble-menu-card')).find(c=>c.textContent.includes('Контакты')).click();` },
  ];
  const { writeFileSync } = await import('node:fs');
  for (const c of cases) {
    await S('Page.navigate', { url: HARNESS });
    await sleep(900);
    const { result } = await S('Runtime.evaluate', { expression: probe(c.drive), returnByValue: true, awaitPromise: true });
    console.log('\n=== ' + c.name + ' ===');
    console.log(JSON.stringify(JSON.parse(result.value), null, 2));
    const { data } = await S('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const shot = resolve(__dirname, 'shots', 'acm20-' + c.name.replace(/[^a-z]+/gi, '-') + '.png');
    writeFileSync(shot, Buffer.from(data, 'base64'));
    console.log('screenshot ->', shot);
  }
  bws.close(); chrome.kill();
  try { rmSync(USER_DIR, { recursive: true, force: true }); } catch {}
  process.exit(0);
})().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });

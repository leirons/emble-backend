/**
 * ACM-35: browser verification of the ACM-34 widget text-contrast fix.
 * Dependency-free headless-Chrome driver (CDP over Node 24 global WebSocket),
 * same pattern as verification/acm-12/shoot.mjs — no puppeteer/playwright.
 *
 * For each brand color it:
 *   - mounts the real embed.js (verification/acm-35/harness.html)
 *   - opens the panel and sends a message (renders a user bubble)
 *   - reads COMPUTED colors of every branded surface and computes WCAG contrast
 *   - asserts text != background and contrast >= 4.5:1
 *   - screenshots the open chat as visual evidence
 *
 * Usage: node verify.mjs   Output: ./shots/*.png + PASS/FAIL report to stdout
 */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS = pathToFileURL(resolve(__dirname, 'harness.html')).href;
const OUT = resolve(__dirname, 'shots');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9344;
const USER_DIR = resolve(__dirname, '.chrome-profile');

const BRANDS = [
  { name: '01-yellow-FFEB3B', brand: '#FFEB3B', expect: 'dark', kind: 'light' },
  { name: '02-white-FFFFFF', brand: '#FFFFFF', expect: 'dark', kind: 'light' },
  { name: '03-navy-11151F', brand: '#11151F', expect: 'light', kind: 'dark' },
  { name: '04-blue-1B2A4A', brand: '#1B2A4A', expect: 'light', kind: 'dark' },
  { name: '05-indigo-6366F1', brand: '#6366F1', expect: 'dark', kind: 'default' },
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
rmSync(USER_DIR, { recursive: true, force: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${USER_DIR}`,
  '--window-size=420,860', '--hide-scrollbars', '--force-device-scale-factor=2',
  '--no-first-run', '--no-default-browser-check', 'about:blank',
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
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map();
    // Handle browser-level responses (no sessionId). Page-session responses are
    // routed by a separate listener installed after the session is attached.
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (!m.sessionId && m.id && this.pending.has(m.id)) {
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

// This runs INSIDE the page: read computed colors of every branded surface and
// compute WCAG contrast between each surface's text color and its own background.
const PROBE = `(() => {
  function lum(rgb){ var a=rgb.map(function(v){v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; }
  function ratio(a,b){ var L1=lum(a),L2=lum(b); var hi=Math.max(L1,L2),lo=Math.min(L1,L2); return (hi+0.05)/(lo+0.05); }
  function parse(s){ var m=String(s).match(/rgba?\\(([^)]+)\\)/); if(!m) return null; var p=m[1].split(',').map(function(x){return parseFloat(x);}); return [p[0],p[1],p[2]]; }
  function sr(){ var r=document.getElementById('emble-widget-root'); return r && r.shadowRoot; }
  function cs(sel){ var n=sr().querySelector(sel); return n? getComputedStyle(n) : null; }
  function eff(sel){ // resolve effective background walking up if transparent
    var n=sr().querySelector(sel); if(!n) return null;
    var node=n;
    while(node){ var bg=getComputedStyle(node).backgroundColor; var p=parse(bg); if(p && !(getComputedStyle(node).backgroundColor==='rgba(0, 0, 0, 0)')) return p; node=node.parentElement || (node.getRootNode&&node.getRootNode().host); }
    return [255,255,255];
  }
  var surfaces = [
    { key:'launcher',    fgSel:'.emble-launcher',       bgSel:'.emble-launcher' },
    { key:'header-name', fgSel:'.emble-header .name',   bgSel:'.emble-header' },
    { key:'user-bubble', fgSel:'.emble-msg.user',       bgSel:'.emble-msg.user' },
    { key:'send-icon',   fgSel:'.emble-send',           bgSel:'.emble-send' },
  ];
  var out = [];
  surfaces.forEach(function(s){
    var f=cs(s.fgSel); if(!f){ out.push({key:s.key, present:false}); return; }
    var fg=parse(f.color);
    var bg=eff(s.bgSel);
    out.push({ key:s.key, present:true, fg:fg, bg:bg, fgCss:f.color, contrast: Math.round(ratio(fg,bg)*100)/100, same: fg[0]===bg[0]&&fg[1]===bg[1]&&fg[2]===bg[2] });
  });
  return JSON.stringify(out);
})()`;

(async () => {
  const browserWsUrl = await getWsUrl();
  const bws = await connect(browserWsUrl);
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
  await S('Emulation.setDeviceMetricsOverride', { width: 420, height: 860, deviceScaleFactor: 2, mobile: false });

  const report = [];
  for (const b of BRANDS) {
    await S('Page.navigate', { url: HARNESS + '?brand=' + encodeURIComponent(b.brand) });
    await sleep(800);
    // open panel + send a message so the user bubble renders
    await S('Runtime.evaluate', { expression: `
      (function(){ var sr=document.getElementById('emble-widget-root').shadowRoot;
        sr.querySelector('.emble-launcher').click();
        setTimeout(function(){ var inp=sr.querySelector('.emble-input'); if(inp){ inp.value='Where is my order?'; sr.querySelector('.emble-send').click(); } }, 200);
      })();`, awaitPromise: false });
    await sleep(1400);

    const { result } = await S('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    const surfaces = JSON.parse(result.value);

    const { data } = await S('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(resolve(OUT, b.name + '.png'), Buffer.from(data, 'base64'));

    let ok = true;
    for (const s of surfaces) {
      if (!s.present) continue;
      if (s.same || s.contrast < 4.5) ok = false;
    }
    report.push({ ...b, ok, surfaces });
    console.log(`\n=== ${b.name}  (brand ${b.brand}, expect ${b.expect} text) ===`);
    for (const s of surfaces) {
      if (!s.present) { console.log(`  ${s.key.padEnd(12)} : (not present)`); continue; }
      const tone = (s.fg[0] + s.fg[1] + s.fg[2]) / 3 < 128 ? 'DARK' : 'LIGHT';
      const flag = (s.same || s.contrast < 4.5) ? '  <-- FAIL' : '';
      console.log(`  ${s.key.padEnd(12)} : text ${s.fgCss.padEnd(18)} ${tone.padEnd(5)} on bg rgb(${s.bg.join(',')})  contrast ${s.contrast}:1${flag}`);
    }
    console.log(`  RESULT: ${ok ? 'PASS' : 'FAIL'}`);
  }

  const allPass = report.every((r) => r.ok);
  console.log(`\n\nOVERALL: ${allPass ? 'PASS — all themes legible (WCAG AA), no invisible text' : 'FAIL'}`);
  writeFileSync(resolve(OUT, 'report.json'), JSON.stringify(report, null, 2));

  bws.close();
  chrome.kill();
  rmSync(USER_DIR, { recursive: true, force: true });
  process.exit(allPass ? 0 : 1);
})().catch((e) => { console.error(e); chrome.kill(); process.exit(2); });

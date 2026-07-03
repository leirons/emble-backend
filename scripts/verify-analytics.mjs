/**
 * End-to-end verification of the analytics pipeline (ACM-10).
 *
 * Drives a real "live session" against a running server + Postgres and asserts
 * that widget sendBeacon-style events persist and surface in the dashboard
 * analytics summary (funnel, leads, triggers, feedback, messages).
 *
 * Usage:
 *   1. docker compose up -d postgres redis
 *   2. npm run migrate   (idempotent)
 *   3. node src/index.js  (or npm run dev)
 *   4. node scripts/verify-analytics.mjs
 *
 * Env:  API_BASE (default http://localhost:4000)
 *
 * Exit code 0 = all assertions passed. Non-zero = a step or assertion failed.
 * This mirrors exactly what public/embed.js does: POST /widget/:slug/events with
 * {type, sessionId, conversationId?, payload?} — the payload navigator.sendBeacon ships.
 */

const API = process.env.API_BASE || 'http://localhost:4000';
const rnd = Math.random().toString(36).slice(2, 8);

let passed = 0;
let failed = 0;
function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${extra ? ' — ' + JSON.stringify(extra) : ''}`);
  }
}

async function j(method, path, { token, body, raw } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) return res;
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function main() {
  console.log(`\n== ACM-10 analytics pipeline verification against ${API} ==\n`);

  // 0. Server reachable
  const health = await j('GET', '/health');
  check('server /health ok', health.status === 200 && health.data?.ok === true, health);
  if (health.status !== 200) throw new Error('Server not reachable — start it first.');

  // 1. Fresh tenant (clean, isolated — no reliance on existing data)
  const reg = await j('POST', '/auth/register', {
    body: { orgName: `Verify ${rnd}`, email: `verify+${rnd}@example.com`, password: 'password123' },
  });
  check('register new org+owner', reg.status === 201 && !!reg.data?.accessToken, reg);
  const token = reg.data.accessToken;

  // 2. Create + publish an agent
  const created = await j('POST', '/agents', {
    token,
    body: { name: `Verify Agent ${rnd}`, type: 'support' },
  });
  check('create agent', created.status === 201 && !!created.data?.agent?.id, created);
  const agentId = created.data.agent.id;
  const slug = created.data.agent.publicSlug || created.data.agent.slug;

  const pub = await j('POST', `/agents/${agentId}/publish`, { token });
  check('publish agent', pub.status === 200 || pub.status === 201, pub);
  const publishedSlug =
    pub.data?.agent?.publicSlug || pub.data?.agent?.slug || slug;
  check('have public slug', !!publishedSlug, { slug, publishedSlug });

  // 3. Simulate the live widget session — exactly the beacon payloads embed.js sends.
  const sessionId = `v_${rnd}${Date.now().toString(36)}`;
  const beacon = (type, payload, conversationId) =>
    j('POST', `/widget/${publishedSlug}/events`, {
      body: { type, sessionId, conversationId, payload },
    });

  const loaded = await beacon('widget_loaded');
  check('beacon widget_loaded accepted (204)', loaded.status === 204, loaded);
  const opened = await beacon('widget_opened');
  check('beacon widget_opened accepted (204)', opened.status === 204, opened);
  const trig = await beacon('trigger_fired', { triggerId: 'exit_intent' });
  check('beacon trigger_fired accepted (204)', trig.status === 204, trig);
  const fb = await beacon('feedback_given', { rating: 1 });
  check('beacon feedback_given accepted (204)', fb.status === 204, fb);

  // reject spoofed server-only event types (whitelist enforced by schema)
  const spoof = await beacon('product_recommended', { name: 'Spoofed' });
  check('server-only event type rejected (400)', spoof.status === 400, spoof);

  // 4. Start a conversation + send a message (logs message_sent + chat_started).
  const conv = await j('POST', `/widget/${publishedSlug}/conversations`, {
    body: { visitorId: sessionId },
  });
  check('start conversation', conv.status === 201 && !!conv.data?.conversationId, conv);
  const conversationId = conv.data?.conversationId;

  // The SSE response body may error without an LLM key, but message_sent/chat_started
  // are logged before the model call. We only need the request to be accepted.
  const msgRes = await j('POST', `/widget/${publishedSlug}/conversations/${conversationId}/messages`, {
    body: { text: 'Здравствуйте, какая у вас доставка?' },
    raw: true,
  });
  check('send message accepted (SSE 200)', msgRes.status === 200, { status: msgRes.status });
  await msgRes.text().catch(() => {}); // drain stream

  // 5. Lead capture (source attribution path)
  const lead = await j('POST', `/widget/${publishedSlug}/leads`, {
    body: { conversationId, name: 'Тест Лид', email: `lead+${rnd}@example.com`, phone: '+70000000000' },
  });
  check('lead capture (201)', lead.status === 201 && !!lead.data?.lead, lead);

  // give async .catch(()=>{}) logEvents a moment to flush
  await new Promise((r) => setTimeout(r, 400));

  // 6. Read the dashboard analytics summary and assert the live session shows up.
  const sum = await j('GET', `/agents/${agentId}/analytics?days=1`, { token });
  check('analytics summary 200', sum.status === 200 && !!sum.data?.summary, sum);
  const s = sum.data?.summary || {};

  check('funnel.loaded >= 1', (s.funnel?.loaded || 0) >= 1, s.funnel);
  check('funnel.opened >= 1', (s.funnel?.opened || 0) >= 1, s.funnel);
  check('funnel.chatStarted >= 1', (s.funnel?.chatStarted || 0) >= 1, s.funnel);
  check('openRate computed', typeof s.funnel?.openRate === 'number', s.funnel);
  check('widgetOpened count >= 1', (s.widgetOpened || 0) >= 1, { widgetOpened: s.widgetOpened });
  check('messages count >= 1', (s.messages || 0) >= 1, { messages: s.messages });
  check('leads count >= 1', (s.leads || 0) >= 1, { leads: s.leads });
  check(
    'trigger_fired surfaced in triggers breakdown',
    Array.isArray(s.triggers) && s.triggers.some((t) => t.count >= 1),
    s.triggers
  );
  check('resolution.aiPct present', typeof s.resolution?.aiPct === 'number', s.resolution);
  check('topics array present', Array.isArray(s.topics), { topics: s.topics });
  check('topProducts array present', Array.isArray(s.topProducts), { topProducts: s.topProducts });
  check('unansweredQuestions array present', Array.isArray(s.unansweredQuestions), {
    unansweredQuestions: s.unansweredQuestions,
  });

  console.log('\n  --- live summary (days=1) ---');
  console.log(
    '  ' +
      JSON.stringify(
        {
          conversations: s.conversations,
          messages: s.messages,
          leads: s.leads,
          widgetOpened: s.widgetOpened,
          funnel: s.funnel,
          triggers: s.triggers,
          resolution: s.resolution,
        },
        null,
        2
      ).replace(/\n/g, '\n  ')
  );

  console.log(`\n== ${passed} passed, ${failed} failed ==\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nFATAL:', err);
  process.exit(2);
});

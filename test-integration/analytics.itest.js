import './helpers/env.js'; // ДОЛЖЕН быть первым импортом
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, api } from './helpers/server.js';
import { resetDb, closeAll, query } from './helpers/db.js';
import { createOrgWithUser, createPublishedAgent } from './helpers/fixtures.js';
import { getSummary } from '../src/modules/analytics/analytics.service.js';

// End-to-end приём аналитических событий: POST /widget/:slug/events → analytics_events,
// затем агрегация через analytics.service.getSummary (реальная воронка по session_id в БД).

let baseUrl;
let close;
let org;
let agent;

before(async () => {
  ({ baseUrl, close } = await startTestServer());
});

after(async () => {
  await close();
  await closeAll();
});

beforeEach(async () => {
  await resetDb();
  org = await createOrgWithUser();
  agent = await createPublishedAgent(org.orgId);
});

function trackEvent(body) {
  return api(baseUrl, 'POST', `/widget/${agent.slug}/events`, { body });
}

test('accepts a whitelisted client event and persists it', async () => {
  const { status } = await trackEvent({ type: 'widget_loaded', sessionId: 'sess-123' });
  assert.equal(status, 204);

  const { rows } = await query(
    `SELECT event_type, session_id FROM analytics_events WHERE agent_id = $1`,
    [agent.agentId]
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].event_type, 'widget_loaded');
  assert.equal(rows[0].session_id, 'sess-123');
});

test('rejects a server-only event type with 400 and stores nothing', async () => {
  // lead_captured/chat_started логируются только на сервере — виджет не может их накрутить.
  const { status } = await trackEvent({ type: 'lead_captured', sessionId: 'sess-x' });
  assert.equal(status, 400);
  const { rows } = await query('SELECT id FROM analytics_events WHERE agent_id = $1', [agent.agentId]);
  assert.equal(rows.length, 0);
});

test('rejects an event with a too-short sessionId (400)', async () => {
  const { status } = await trackEvent({ type: 'widget_opened', sessionId: 'ab' });
  assert.equal(status, 400);
});

test('ingested events aggregate into the analytics funnel summary', async () => {
  // Одна сессия проходит воронку loaded → opened.
  await trackEvent({ type: 'widget_loaded', sessionId: 'funnel-1' });
  await trackEvent({ type: 'widget_opened', sessionId: 'funnel-1' });
  // Вторая сессия только загрузилась.
  await trackEvent({ type: 'widget_loaded', sessionId: 'funnel-2' });

  const summary = await getSummary(org.orgId, agent.agentId, 30);

  assert.equal(summary.funnel.loaded, 2, 'две уникальные сессии загрузили виджет');
  assert.equal(summary.funnel.opened, 1, 'одна сессия открыла виджет');
  assert.equal(summary.widgetOpened, 1);
  // openRate ограничен диапазоном [0,100] (50% = 1/2).
  assert.equal(summary.funnel.openRate, 50);
});

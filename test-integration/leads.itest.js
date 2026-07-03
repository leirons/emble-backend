import './helpers/env.js'; // ДОЛЖЕН быть первым импортом
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, api } from './helpers/server.js';
import { resetDb, closeAll, query } from './helpers/db.js';
import { createOrgWithUser, createPublishedAgent, allowDomain } from './helpers/fixtures.js';

// End-to-end захват лида через публичный Widget API: POST /widget/:slug/leads → БД leads
// + событие lead_captured в analytics_events. Origin-контроль middleware тоже под тестом.

let baseUrl;
let close;
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
  const org = await createOrgWithUser();
  agent = await createPublishedAgent(org.orgId);
});

test('captures a lead with email and persists it with a lead_captured event', async () => {
  const { status, json } = await api(baseUrl, 'POST', `/widget/${agent.slug}/leads`, {
    body: { name: 'Иван', email: 'ivan@buyer.com', capturedFields: { source: 'manual' } },
  });

  assert.equal(status, 201);
  assert.equal(json.lead.email, 'ivan@buyer.com');
  assert.equal(json.lead.agentId, agent.agentId);

  const { rows } = await query('SELECT name, email, captured_fields FROM leads WHERE agent_id = $1', [agent.agentId]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, 'ivan@buyer.com');
  assert.equal(rows[0].captured_fields.source, 'manual');

  const { rows: events } = await query(
    `SELECT event_type FROM analytics_events WHERE agent_id = $1 AND event_type = 'lead_captured'`,
    [agent.agentId]
  );
  assert.equal(events.length, 1, 'lead_captured событие записано');
});

test('captures a lead with phone only', async () => {
  const { status } = await api(baseUrl, 'POST', `/widget/${agent.slug}/leads`, {
    body: { phone: '+79990001122' },
  });
  assert.equal(status, 201);
  const { rows } = await query('SELECT phone FROM leads WHERE agent_id = $1', [agent.agentId]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].phone, '+79990001122');
});

test('rejects a lead with neither email nor phone (400) and stores nothing', async () => {
  const { status } = await api(baseUrl, 'POST', `/widget/${agent.slug}/leads`, {
    body: { name: 'Без контактов' },
  });
  assert.equal(status, 400);
  const { rows } = await query('SELECT id FROM leads WHERE agent_id = $1', [agent.agentId]);
  assert.equal(rows.length, 0);
});

test('rejects a malformed email with a validation 400', async () => {
  const { status } = await api(baseUrl, 'POST', `/widget/${agent.slug}/leads`, {
    body: { email: 'not-an-email' },
  });
  assert.equal(status, 400);
});

test('unknown agent slug returns 404 (draft agents are not exposed)', async () => {
  const { status } = await api(baseUrl, 'POST', `/widget/no-such-agent/leads`, {
    body: { email: 'x@y.com' },
  });
  assert.equal(status, 404);
});

test('origin whitelist blocks a cross-site Origin not in the agent domains', async () => {
  await allowDomain(agent.agentId, 'trusted.example.com');
  const { status } = await api(baseUrl, 'POST', `/widget/${agent.slug}/leads`, {
    body: { email: 'x@y.com' },
    headers: { Origin: 'https://evil.example.com' },
  });
  assert.equal(status, 403);
});

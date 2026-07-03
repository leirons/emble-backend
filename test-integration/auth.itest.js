import './helpers/env.js'; // ДОЛЖЕН быть первым импортом — настраивает тестовую БД до pool.js
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, api } from './helpers/server.js';
import { resetDb, closeAll, query } from './helpers/db.js';

// End-to-end авторизация через реальный HTTP + Postgres: register → login → refresh → me → logout.
// Покрывает связку auth.routes → controller → service → users/tokens repo → БД.

let baseUrl;
let close;

before(async () => {
  ({ baseUrl, close } = await startTestServer());
});

after(async () => {
  await close();
  await closeAll();
});

beforeEach(async () => {
  await resetDb();
});

function creds(suffix = '') {
  return { orgName: 'Acme QA', email: `owner${suffix}@example.com`, password: 'sup3rsecret' };
}

test('register creates org+user+subscription and returns a token pair', async () => {
  const { status, json } = await api(baseUrl, 'POST', '/auth/register', { body: creds('-reg') });

  assert.equal(status, 201);
  assert.ok(json.accessToken, 'accessToken присутствует');
  assert.ok(json.refreshToken, 'refreshToken присутствует');
  assert.equal(json.user.email, 'owner-reg@example.com');
  assert.equal(json.user.role, 'owner');
  assert.ok(json.user.orgId);

  // Проверяем, что данные реально записаны в БД.
  const { rows: users } = await query('SELECT id, org_id FROM users WHERE email = $1', ['owner-reg@example.com']);
  assert.equal(users.length, 1);
  const { rows: subs } = await query('SELECT plan_id, status FROM subscriptions WHERE org_id = $1', [users[0].org_id]);
  assert.equal(subs.length, 1);
  assert.equal(subs[0].plan_id, 'free');
  assert.equal(subs[0].status, 'active');
  // refresh-токен персистится для ротации.
  const { rows: tokens } = await query('SELECT id FROM refresh_tokens WHERE user_id = $1', [users[0].id]);
  assert.equal(tokens.length, 1);
});

test('duplicate email registration is rejected with 409', async () => {
  await api(baseUrl, 'POST', '/auth/register', { body: creds('-dup') });
  const { status } = await api(baseUrl, 'POST', '/auth/register', { body: creds('-dup') });
  assert.equal(status, 409);
});

test('login with correct password returns tokens; wrong password is 401', async () => {
  await api(baseUrl, 'POST', '/auth/register', { body: creds('-login') });

  const ok = await api(baseUrl, 'POST', '/auth/login', {
    body: { email: 'owner-login@example.com', password: 'sup3rsecret' },
  });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.accessToken);

  const bad = await api(baseUrl, 'POST', '/auth/login', {
    body: { email: 'owner-login@example.com', password: 'wrong-password' },
  });
  assert.equal(bad.status, 401);
});

test('refresh returns a working token pair and supports a refresh chain', async () => {
  const reg = await api(baseUrl, 'POST', '/auth/register', { body: creds('-refresh') });

  const rot = await api(baseUrl, 'POST', '/auth/refresh', { body: { refreshToken: reg.json.refreshToken } });
  assert.equal(rot.status, 200);
  assert.ok(rot.json.accessToken);
  assert.ok(rot.json.refreshToken);
  // Новый access-токен реально авторизует.
  const me = await api(baseUrl, 'GET', '/auth/me', { headers: { Authorization: `Bearer ${rot.json.accessToken}` } });
  assert.equal(me.status, 200);
  // Цепочка refresh продолжается новым refresh-токеном.
  const rot2 = await api(baseUrl, 'POST', '/auth/refresh', { body: { refreshToken: rot.json.refreshToken } });
  assert.equal(rot2.status, 200);
  assert.ok(rot2.json.accessToken);

  // Persist: у пользователя остаётся валидный (не отозванный) refresh-токен после ротаций.
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM refresh_tokens t
       JOIN users u ON u.id = t.user_id
      WHERE u.email = $1 AND t.revoked_at IS NULL`,
    ['owner-refresh@example.com']
  );
  assert.ok(rows[0].n >= 1, 'хотя бы один валидный refresh-токен сохранён');
});

test('an invalid/garbage refresh token is rejected with 401', async () => {
  const bad = await api(baseUrl, 'POST', '/auth/refresh', {
    body: { refreshToken: 'not-a-real-jwt-token-value' },
  });
  assert.equal(bad.status, 401);
});

test('GET /auth/me requires a valid access token and returns the current user', async () => {
  const reg = await api(baseUrl, 'POST', '/auth/register', { body: creds('-me') });

  const noAuth = await api(baseUrl, 'GET', '/auth/me');
  assert.equal(noAuth.status, 401);

  const me = await api(baseUrl, 'GET', '/auth/me', {
    headers: { Authorization: `Bearer ${reg.json.accessToken}` },
  });
  assert.equal(me.status, 200);
  assert.equal(me.json.user.email, 'owner-me@example.com');
});

test('logout revokes the refresh token so it can no longer be used', async () => {
  const reg = await api(baseUrl, 'POST', '/auth/register', { body: creds('-logout') });
  const refreshToken = reg.json.refreshToken;

  const out = await api(baseUrl, 'POST', '/auth/logout', { body: { refreshToken } });
  assert.equal(out.status, 204);

  const afterLogout = await api(baseUrl, 'POST', '/auth/refresh', { body: { refreshToken } });
  assert.equal(afterLogout.status, 401);
});

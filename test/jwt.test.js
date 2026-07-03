import { test } from 'node:test';
import assert from 'node:assert/strict';

// Детерминированные секреты для теста — не зависим от .env окружения.
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } = await import(
  '../src/lib/jwt.js'
);

test('access token round-trips the payload', () => {
  const token = signAccessToken({ sub: 'user-1', org: 'org-1' });
  const decoded = verifyAccessToken(token);
  assert.equal(decoded.sub, 'user-1');
  assert.equal(decoded.org, 'org-1');
  assert.ok(decoded.iat, 'issued-at claim present');
  assert.ok(decoded.exp, 'expiry claim present');
});

test('refresh token round-trips the payload', () => {
  const token = signRefreshToken({ sub: 'user-2' });
  const decoded = verifyRefreshToken(token);
  assert.equal(decoded.sub, 'user-2');
});

test('access token is not verifiable with the refresh secret', () => {
  const token = signAccessToken({ sub: 'user-1' });
  assert.throws(() => verifyRefreshToken(token), /invalid signature/);
});

test('a tampered token is rejected', () => {
  const token = signAccessToken({ sub: 'user-1' });
  const tampered = `${token.slice(0, -3)}abc`;
  assert.throws(() => verifyAccessToken(tampered));
});

test('a garbage string is rejected', () => {
  assert.throws(() => verifyAccessToken('not-a-jwt'));
});

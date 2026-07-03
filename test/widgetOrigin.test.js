import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractHost, hostMatchesDomain, isOriginAllowed } from '../src/lib/widgetOrigin.js';

test('extractHost parses hostname and lowercases it', () => {
  assert.equal(extractHost('https://Shop.Example.com/page'), 'shop.example.com');
  assert.equal(extractHost('http://localhost:4000'), 'localhost');
});

test('extractHost returns null for empty or unparseable input', () => {
  assert.equal(extractHost(''), null);
  assert.equal(extractHost(null), null);
  assert.equal(extractHost('not a url'), null);
});

test('hostMatchesDomain matches exact host and subdomains, not siblings', () => {
  assert.equal(hostMatchesDomain('example.com', 'example.com'), true);
  assert.equal(hostMatchesDomain('shop.example.com', 'example.com'), true);
  assert.equal(hostMatchesDomain('evil.com', 'example.com'), false);
  // не должно матчить домен, который лишь заканчивается той же строкой без точки
  assert.equal(hostMatchesDomain('notexample.com', 'example.com'), false);
});

test('empty whitelist allows any request (integration grace period)', () => {
  assert.equal(isOriginAllowed('anything.com', []), true);
  assert.equal(isOriginAllowed(null, []), true);
});

test('non-empty whitelist blocks requests with no resolvable host', () => {
  assert.equal(isOriginAllowed(null, ['example.com']), false);
});

test('wildcard entry allows any host', () => {
  assert.equal(isOriginAllowed('anything.com', ['*']), true);
});

test('whitelist permits listed domains and their subdomains only', () => {
  const allowed = ['example.com', 'store.io'];
  assert.equal(isOriginAllowed('example.com', allowed), true);
  assert.equal(isOriginAllowed('cdn.store.io', allowed), true);
  assert.equal(isOriginAllowed('attacker.net', allowed), false);
});

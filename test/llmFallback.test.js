import { test } from 'node:test';
import assert from 'node:assert/strict';

import { streamWithFallback } from '../src/lib/llm/index.js';

// ACM-17: fallback на второго провайдера безопасен только пока клиент ничего не увидел.
// streamWithFallback — чистое ядро логики, гоняем его на фейковых генераторах без сети.

async function collect(gen) {
  const events = [];
  let threw = null;
  try {
    for await (const ev of gen) events.push(ev);
  } catch (err) {
    threw = err;
  }
  return { events, threw };
}

test('mid-stream primary failure surfaces error and does NOT fall back (ACM-17)', async () => {
  let fallbackCalled = false;
  const openPrimary = async function* () {
    yield { type: 'delta', text: 'Пол' };
    yield { type: 'delta', text: 'овина ответа' };
    throw new Error('rate limit mid-stream');
  };
  const openFallback = async function* () {
    fallbackCalled = true;
    yield { type: 'delta', text: 'ПОЛНЫЙ ЗАПАСНОЙ ОТВЕТ' };
  };

  const { events, threw } = await collect(streamWithFallback(openPrimary, openFallback, true));

  assert.deepEqual(
    events.map((e) => e.text),
    ['Пол', 'овина ответа'],
    'клиент получил только текст primary',
  );
  assert.ok(threw, 'ошибка проброшена наверх (stream-error)');
  assert.equal(fallbackCalled, false, 'fallback НЕ запускается после отданных дельт');
});

test('pre-stream primary failure falls back to the other provider', async () => {
  let fallbackCalled = false;
  const openPrimary = async function* () {
    throw new Error('auth failure before any output');
    // eslint-disable-next-line no-unreachable
    yield;
  };
  const openFallback = async function* () {
    fallbackCalled = true;
    yield { type: 'delta', text: 'запасной' };
  };

  const { events, threw } = await collect(streamWithFallback(openPrimary, openFallback, true));

  assert.equal(threw, null, 'ошибки нет — fallback отработал');
  assert.deepEqual(events.map((e) => e.text), ['запасной']);
  assert.equal(fallbackCalled, true);
});

test('allowFallback=false forbids fallback even before any delta (cross-round guard)', async () => {
  let fallbackCalled = false;
  const openPrimary = async function* () {
    throw new Error('boom before output');
    // eslint-disable-next-line no-unreachable
    yield;
  };
  const openFallback = async function* () {
    fallbackCalled = true;
    yield { type: 'delta', text: 'не должно появиться' };
  };

  const { events, threw } = await collect(streamWithFallback(openPrimary, openFallback, false));

  assert.ok(threw, 'ошибка проброшена');
  assert.deepEqual(events, [], 'ни одной дельты');
  assert.equal(fallbackCalled, false, 'fallback запрещён, т.к. текст уже шёл в прошлом раунде');
});

test('tool_call-only primary failure still allows fallback (no visible text emitted)', async () => {
  let fallbackCalled = false;
  const openPrimary = async function* () {
    yield { type: 'tool_call', id: '1', name: 'lookup', arguments: {} };
    throw new Error('drop after tool_call');
  };
  const openFallback = async function* () {
    fallbackCalled = true;
    yield { type: 'delta', text: 'ответ от fallback' };
  };

  const { events, threw } = await collect(streamWithFallback(openPrimary, openFallback, true));

  assert.equal(threw, null);
  assert.equal(fallbackCalled, true, 'tool_call не виден пользователю → fallback безопасен');
  assert.deepEqual(
    events.filter((e) => e.type === 'delta').map((e) => e.text),
    ['ответ от fallback'],
  );
});

test('no fallback available (openFallback=null) rethrows the primary error', async () => {
  const openPrimary = async function* () {
    throw new Error('no key, no fallback');
    // eslint-disable-next-line no-unreachable
    yield;
  };

  const { events, threw } = await collect(streamWithFallback(openPrimary, null, true));

  assert.ok(threw, 'без резервного провайдера ошибка пробрасывается как есть');
  assert.deepEqual(events, []);
});

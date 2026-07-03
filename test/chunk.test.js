import { test } from 'node:test';
import assert from 'node:assert/strict';

import { chunkText } from '../src/modules/knowledge/chunk.js';

test('empty / whitespace-only text yields no chunks', () => {
  assert.deepEqual(chunkText(''), []);
  assert.deepEqual(chunkText('   \n\t  '), []);
});

test('short text returns a single chunk with a token estimate', () => {
  const chunks = chunkText('Hello world.');
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].content, 'Hello world.');
  assert.ok(chunks[0].tokenCount > 0);
});

test('normalizes CRLF and collapses runs of spaces/tabs', () => {
  const [chunk] = chunkText('a\r\nb   c\t\td');
  assert.equal(chunk.content, 'a\nb c d');
});

test('long text is split into multiple overlapping chunks', () => {
  const sentence = 'This is a sentence. ';
  const text = sentence.repeat(400); // ~8000 chars, well over one chunk
  const chunks = chunkText(text, { chunkTokens: 100, overlapTokens: 20 });
  assert.ok(chunks.length > 1, 'produced multiple chunks');

  // Каждый чанк непустой и имеет корректную оценку токенов.
  for (const c of chunks) {
    assert.ok(c.content.length > 0);
    assert.equal(c.tokenCount, Math.ceil(c.content.length / 4));
  }

  // Перекрытие: конец одного чанка должен встречаться в начале следующего.
  const tail = chunks[0].content.slice(-40);
  assert.ok(chunks[1].content.includes(tail.trim().slice(-10)), 'chunks overlap');
});

test('always makes forward progress (no infinite loop) on boundary-less text', () => {
  const text = 'x'.repeat(5000); // никаких границ предложений
  const chunks = chunkText(text, { chunkTokens: 50, overlapTokens: 10 });
  assert.ok(chunks.length >= 1);
  const total = chunks.reduce((n, c) => n + c.content.length, 0);
  assert.ok(total >= 5000, 'full text covered across chunks');
});

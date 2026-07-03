import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import { formatSSEFrame, createSSEChannel } from '../src/lib/sse.js';

// Минимальный поддельный Express res, чтобы проверить каналом без реального сокета.
function makeFakeRes() {
  const res = {
    headers: null,
    statusCode: null,
    chunks: [],
    writableEnded: false,
    flushed: false,
    throwOnWrite: false,
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
      return this;
    },
    flushHeaders() {
      this.flushed = true;
    },
    write(chunk) {
      if (this.throwOnWrite) throw new Error('socket closed');
      this.chunks.push(chunk);
      return true;
    },
    end() {
      this.writableEnded = true;
    },
  };
  return res;
}

// --- formatSSEFrame: валидное кадрирование ---

test('formatSSEFrame builds an event + JSON data frame terminated by a blank line', () => {
  assert.equal(formatSSEFrame('delta', { text: 'привет' }), 'event: delta\ndata: {"text":"привет"}\n\n');
});

test('formatSSEFrame serialises undefined payload as an empty object', () => {
  assert.equal(formatSSEFrame('done'), 'event: done\ndata: {}\n\n');
});

test('formatSSEFrame escapes newlines inside the payload so the frame stays single-line', () => {
  // JSON.stringify экранирует перевод строки как \\n, поэтому в кадре нет «сырого» \n,
  // который SSE-парсер иначе принял бы за конец data-строки и потерял хвост сообщения.
  const frame = formatSSEFrame('delta', { text: 'a\nb' });
  assert.equal(frame, 'event: delta\ndata: {"text":"a\\nb"}\n\n');
  // Ровно один разделитель кадра (двойной перевод строки) в конце.
  assert.equal(frame.split('\n\n').length, 2);
});

test('every frame ends with exactly one blank-line separator', () => {
  for (const ev of ['delta', 'escalated', 'error', 'done']) {
    assert.ok(formatSSEFrame(ev, { ok: true }).endsWith('\n\n'));
  }
});

// --- createSSEChannel: заголовки, безопасная запись, закрытие ---

test('createSSEChannel writes SSE headers and flushes them', () => {
  const req = new EventEmitter();
  const res = makeFakeRes();
  createSSEChannel(req, res, { keepAliveMs: 0 });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/event-stream; charset=utf-8');
  assert.equal(res.headers['X-Accel-Buffering'], 'no');
  assert.equal(res.flushed, true);
});

test('send emits a frame while open and reports success', () => {
  const req = new EventEmitter();
  const res = makeFakeRes();
  const ch = createSSEChannel(req, res, { keepAliveMs: 0 });
  assert.equal(ch.send('delta', { text: 'hi' }), true);
  assert.deepEqual(res.chunks, ['event: delta\ndata: {"text":"hi"}\n\n']);
});

test('send becomes a no-op after the client disconnects (req close)', () => {
  const req = new EventEmitter();
  const res = makeFakeRes();
  const ch = createSSEChannel(req, res, { keepAliveMs: 0 });
  req.emit('close');
  assert.equal(ch.closed, true);
  assert.equal(ch.send('delta', { text: 'late' }), false);
  assert.equal(res.chunks.length, 0);
});

test('send swallows a write that throws (socket died mid-flight) and marks closed', () => {
  const req = new EventEmitter();
  const res = makeFakeRes();
  const ch = createSSEChannel(req, res, { keepAliveMs: 0 });
  res.throwOnWrite = true;
  assert.doesNotThrow(() => ch.send('delta', { text: 'boom' }));
  assert.equal(ch.send('delta', { text: 'boom' }), false);
  assert.equal(ch.closed, true);
});

test('close ends the response once and is idempotent', () => {
  const req = new EventEmitter();
  const res = makeFakeRes();
  const ch = createSSEChannel(req, res, { keepAliveMs: 0 });
  ch.close();
  assert.equal(res.writableEnded, true);
  assert.equal(ch.closed, true);
  ch.close(); // повторный вызов не должен падать
  assert.equal(res.writableEnded, true);
});

test('ping writes an SSE comment frame that carries no data event', () => {
  const req = new EventEmitter();
  const res = makeFakeRes();
  const ch = createSSEChannel(req, res, { keepAliveMs: 0 });
  ch.ping();
  assert.deepEqual(res.chunks, [': keep-alive\n\n']);
});

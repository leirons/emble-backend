import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

import { validate } from '../src/middleware/validate.js';
import AppError from '../src/lib/errors.js';

function run(middleware, req) {
  let nextArg;
  let called = false;
  middleware(req, {}, (arg) => {
    called = true;
    nextArg = arg;
  });
  return { called, nextArg };
}

const schema = z.object({ email: z.string().email(), age: z.number().int().optional() });

test('valid body passes through and is replaced with parsed data', () => {
  const req = { body: { email: 'a@b.com', extra: 'stripped' } };
  const { called, nextArg } = run(validate(schema), req);
  assert.equal(called, true);
  assert.equal(nextArg, undefined, 'next() called with no error');
  // zod по умолчанию отбрасывает неизвестные поля.
  assert.deepEqual(req.body, { email: 'a@b.com' });
});

test('invalid body forwards a 400 AppError with flattened details', () => {
  const req = { body: { email: 'not-an-email' } };
  const { called, nextArg } = run(validate(schema), req);
  assert.equal(called, true);
  assert.ok(nextArg instanceof AppError);
  assert.equal(nextArg.statusCode, 400);
  assert.ok(nextArg.details.fieldErrors.email, 'field error surfaced for email');
});

test('validates the requested request part (query)', () => {
  const req = { query: { email: 'q@b.com' } };
  const { nextArg } = run(validate(schema, 'query'), req);
  assert.equal(nextArg, undefined);
  assert.deepEqual(req.query, { email: 'q@b.com' });
});

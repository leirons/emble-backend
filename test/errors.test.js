import { test } from 'node:test';
import assert from 'node:assert/strict';

import AppError, {
  notFound,
  unauthorized,
  forbidden,
  badRequest,
  conflict,
  tooManyRequests,
} from '../src/lib/errors.js';

test('AppError defaults to 400 and carries message', () => {
  const err = new AppError('boom');
  assert.ok(err instanceof Error);
  assert.equal(err.statusCode, 400);
  assert.equal(err.message, 'boom');
  assert.equal(err.name, 'AppError');
  assert.equal(err.details, undefined);
});

test('AppError preserves explicit status and details', () => {
  const err = new AppError('nope', 418, { field: 'x' });
  assert.equal(err.statusCode, 418);
  assert.deepEqual(err.details, { field: 'x' });
});

test('helper factories map to the correct HTTP status codes', () => {
  assert.equal(notFound().statusCode, 404);
  assert.equal(unauthorized().statusCode, 401);
  assert.equal(forbidden().statusCode, 403);
  assert.equal(badRequest().statusCode, 400);
  assert.equal(conflict().statusCode, 409);
  assert.equal(tooManyRequests().statusCode, 429);
});

test('badRequest forwards validation details', () => {
  const details = { fieldErrors: { email: ['invalid'] } };
  const err = badRequest('Ошибка валидации', details);
  assert.equal(err.statusCode, 400);
  assert.deepEqual(err.details, details);
});

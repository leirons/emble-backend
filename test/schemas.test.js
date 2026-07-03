import { test } from 'node:test';
import assert from 'node:assert/strict';

import { captureLeadSchema } from '../src/modules/leads/leads.schema.js';
import {
  startConversationSchema,
  sendMessageSchema,
  feedbackSchema,
  trackEventSchema,
} from '../src/modules/widget/widget.schema.js';
import {
  logoutSchema,
  registerSchema,
  loginSchema,
  refreshSchema,
} from '../src/modules/auth/auth.schema.js';

// --- Leads ingest (/leads CRM) ---
test('captureLead accepts a valid lead', () => {
  const r = captureLeadSchema.safeParse({ name: 'Jane', email: 'jane@shop.com', phone: '+123' });
  assert.equal(r.success, true);
});

test('captureLead accepts an empty object (all fields optional)', () => {
  assert.equal(captureLeadSchema.safeParse({}).success, true);
});

test('captureLead rejects a malformed email', () => {
  assert.equal(captureLeadSchema.safeParse({ email: 'nope' }).success, false);
});

test('captureLead rejects a non-uuid conversationId', () => {
  assert.equal(captureLeadSchema.safeParse({ conversationId: '123' }).success, false);
});

// --- Widget contract ---
test('startConversation enforces visitorId length bounds', () => {
  assert.equal(startConversationSchema.safeParse({ visitorId: 'short' }).success, false); // < 6
  assert.equal(startConversationSchema.safeParse({ visitorId: 'visitor-123' }).success, true);
});

test('sendMessage rejects empty and over-long text', () => {
  assert.equal(sendMessageSchema.safeParse({ text: '' }).success, false);
  assert.equal(sendMessageSchema.safeParse({ text: 'x'.repeat(4001) }).success, false);
  assert.equal(sendMessageSchema.safeParse({ text: 'hi' }).success, true);
});

test('feedback only accepts +1 / -1 ratings', () => {
  assert.equal(feedbackSchema.safeParse({ rating: 1 }).success, true);
  assert.equal(feedbackSchema.safeParse({ rating: -1 }).success, true);
  assert.equal(feedbackSchema.safeParse({ rating: 0 }).success, false);
  assert.equal(feedbackSchema.safeParse({ rating: 5 }).success, false);
});

// --- Auth logout (ACM-18 L1): валидация не даёт hashToken() упасть на не-строке (500) ---
test('logout accepts an empty body (idempotent logout)', () => {
  assert.equal(logoutSchema.safeParse({}).success, true);
});

test('logout accepts a valid string refreshToken', () => {
  assert.equal(logoutSchema.safeParse({ refreshToken: 'a'.repeat(20) }).success, true);
});

test('logout rejects a non-string refreshToken', () => {
  assert.equal(logoutSchema.safeParse({ refreshToken: 12345 }).success, false);
  assert.equal(logoutSchema.safeParse({ refreshToken: { evil: true } }).success, false);
});

// --- Auth input length bounds (ACM-30): .email() checks format but not length, so a valid-looking
//     but huge email/password/token could be dumped into the DB. Cap every string input. ---
const hugeEmail = 'a'.repeat(300) + '@example.com'; // valid format, > 254 chars
const hugeToken = 'a'.repeat(2000);

test('register rejects an over-long email and an over-long password', () => {
  const ok = registerSchema.safeParse({ orgName: 'Acme', email: 'owner@shop.com', password: 'sup3rsecret' });
  assert.equal(ok.success, true);
  assert.equal(registerSchema.safeParse({ orgName: 'Acme', email: hugeEmail, password: 'sup3rsecret' }).success, false);
  assert.equal(registerSchema.safeParse({ orgName: 'Acme', email: 'owner@shop.com', password: 'x'.repeat(73) }).success, false);
});

test('login rejects an over-long email and an over-long password', () => {
  assert.equal(loginSchema.safeParse({ email: 'owner@shop.com', password: 'pw' }).success, true);
  assert.equal(loginSchema.safeParse({ email: hugeEmail, password: 'pw' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'owner@shop.com', password: 'x'.repeat(73) }).success, false);
});

test('refresh/logout reject an over-long token', () => {
  assert.equal(refreshSchema.safeParse({ refreshToken: 'a'.repeat(40) }).success, true);
  assert.equal(refreshSchema.safeParse({ refreshToken: hugeToken }).success, false);
  assert.equal(logoutSchema.safeParse({ refreshToken: hugeToken }).success, false);
});

test('captureLead rejects an over-long email', () => {
  assert.equal(captureLeadSchema.safeParse({ email: hugeEmail }).success, false);
});

test('trackEvent only accepts whitelisted client event types', () => {
  assert.equal(
    trackEventSchema.safeParse({ type: 'widget_opened', sessionId: 'sess-1' }).success,
    true,
  );
  // Серверные события нельзя присылать из виджета (защита от накрутки аналитики).
  assert.equal(
    trackEventSchema.safeParse({ type: 'product_recommended', sessionId: 'sess-1' }).success,
    false,
  );
});

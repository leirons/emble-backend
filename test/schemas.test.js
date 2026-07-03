import { test } from 'node:test';
import assert from 'node:assert/strict';

import { captureLeadSchema } from '../src/modules/leads/leads.schema.js';
import {
  startConversationSchema,
  sendMessageSchema,
  feedbackSchema,
  trackEventSchema,
} from '../src/modules/widget/widget.schema.js';

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

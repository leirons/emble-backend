import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDeletedSubscriptionOrgId } from './billing.service.js';

// Регрессия ACM-16: при customer.subscription.deleted Stripe НЕ копирует metadata сессии
// в объект Subscription, поэтому sub.metadata.orgId может отсутствовать. Хендлер обязан
// найти орг по billing_customer_id, иначе отменённые клиенты сохраняют платный доступ навсегда.

test('resolveDeletedSubscriptionOrgId: берёт orgId из metadata, если он есть', async () => {
  let called = false;
  const orgId = await resolveDeletedSubscriptionOrgId(
    { metadata: { orgId: 'org-1' }, customer: 'cus_x' },
    async () => { called = true; return { orgId: 'wrong' }; }
  );
  assert.equal(orgId, 'org-1');
  assert.equal(called, false, 'при наличии metadata lookup по customer не нужен');
});

test('resolveDeletedSubscriptionOrgId: fallback на поиск по billing_customer_id', async () => {
  const orgId = await resolveDeletedSubscriptionOrgId(
    { metadata: {}, customer: 'cus_abc' },
    async (customerId) => {
      assert.equal(customerId, 'cus_abc');
      return { orgId: 'org-42' };
    }
  );
  assert.equal(orgId, 'org-42');
});

test('resolveDeletedSubscriptionOrgId: metadata вовсе отсутствует — тоже fallback', async () => {
  const orgId = await resolveDeletedSubscriptionOrgId(
    { customer: 'cus_1' },
    async () => ({ orgId: 'org-7' })
  );
  assert.equal(orgId, 'org-7');
});

test('resolveDeletedSubscriptionOrgId: нет ни metadata, ни подписки по customer → null', async () => {
  const orgId = await resolveDeletedSubscriptionOrgId(
    { metadata: {}, customer: 'cus_missing' },
    async () => null
  );
  assert.equal(orgId, null);
});

test('resolveDeletedSubscriptionOrgId: нет customer → null без вызова lookup', async () => {
  let called = false;
  const orgId = await resolveDeletedSubscriptionOrgId(
    { metadata: {} },
    async () => { called = true; return { orgId: 'x' }; }
  );
  assert.equal(orgId, null);
  assert.equal(called, false);
});

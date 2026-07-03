import { query } from '../../db/pool.js';

export async function createSubscription({ orgId, planId = 'free' }) {
  const { rows } = await query(
    `INSERT INTO subscriptions (org_id, plan_id, status) VALUES ($1, $2, 'active')
     ON CONFLICT (org_id) DO NOTHING
     RETURNING id, org_id AS "orgId", plan_id AS "planId", status, current_period_end AS "currentPeriodEnd"`,
    [orgId, planId]
  );
  return rows[0] || null;
}

export async function getSubscriptionByOrg(orgId) {
  const { rows } = await query(
    `SELECT id, org_id AS "orgId", plan_id AS "planId", billing_provider AS "billingProvider",
            billing_customer_id AS "billingCustomerId", status, current_period_end AS "currentPeriodEnd"
     FROM subscriptions WHERE org_id = $1`,
    [orgId]
  );
  return rows[0] || null;
}

export async function getSubscriptionByCustomerId(billingCustomerId) {
  const { rows } = await query(
    `SELECT id, org_id AS "orgId", plan_id AS "planId", billing_provider AS "billingProvider",
            billing_customer_id AS "billingCustomerId", status, current_period_end AS "currentPeriodEnd"
     FROM subscriptions WHERE billing_customer_id = $1`,
    [billingCustomerId]
  );
  return rows[0] || null;
}

export async function updateSubscriptionPlan(orgId, planId) {
  const { rows } = await query(
    `UPDATE subscriptions SET plan_id = $1, updated_at = now() WHERE org_id = $2
     RETURNING id, org_id AS "orgId", plan_id AS "planId", status`,
    [planId, orgId]
  );
  return rows[0] || null;
}

export async function updateSubscriptionFromStripe({ orgId, billingCustomerId, status, currentPeriodEnd, planId }) {
  const { rows } = await query(
    `UPDATE subscriptions
     SET billing_provider = 'stripe', billing_customer_id = $2, status = $3,
         current_period_end = COALESCE($4, current_period_end), plan_id = COALESCE($5, plan_id), updated_at = now()
     WHERE org_id = $1
     RETURNING id, org_id AS "orgId", plan_id AS "planId", status`,
    [orgId, billingCustomerId, status, currentPeriodEnd, planId]
  );
  return rows[0] || null;
}

export async function getPlan(planId) {
  const { rows } = await query(
    `SELECT id, name, price_cents AS "priceCents", agent_limit AS "agentLimit",
            message_limit AS "messageLimit", kb_mb_limit AS "kbMbLimit"
     FROM plans WHERE id = $1`,
    [planId]
  );
  return rows[0] || null;
}

export async function listPlans() {
  const { rows } = await query(
    `SELECT id, name, price_cents AS "priceCents", agent_limit AS "agentLimit",
            message_limit AS "messageLimit", kb_mb_limit AS "kbMbLimit"
     FROM plans ORDER BY price_cents`
  );
  return rows;
}

export default {
  createSubscription,
  getSubscriptionByOrg,
  getSubscriptionByCustomerId,
  updateSubscriptionPlan,
  updateSubscriptionFromStripe,
  getPlan,
  listPlans,
};

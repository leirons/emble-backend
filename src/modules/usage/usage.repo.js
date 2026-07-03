import { query } from '../../db/pool.js';

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export async function incrementUsage(orgId, tokensUsed = 0) {
  const period = currentPeriod();
  const { rows } = await query(
    `INSERT INTO usage_records (org_id, period, messages_count, tokens_used)
     VALUES ($1, $2, 1, $3)
     ON CONFLICT (org_id, period) DO UPDATE SET
       messages_count = usage_records.messages_count + 1,
       tokens_used = usage_records.tokens_used + EXCLUDED.tokens_used
     RETURNING org_id AS "orgId", period, messages_count AS "messagesCount", tokens_used AS "tokensUsed"`,
    [orgId, period, tokensUsed]
  );
  return rows[0];
}

export async function getCurrentUsage(orgId) {
  const period = currentPeriod();
  const { rows } = await query(
    `SELECT org_id AS "orgId", period, messages_count AS "messagesCount", tokens_used AS "tokensUsed"
     FROM usage_records WHERE org_id = $1 AND period = $2`,
    [orgId, period]
  );
  return rows[0] || { orgId, period, messagesCount: 0, tokensUsed: 0 };
}

export default { incrementUsage, getCurrentUsage, currentPeriod };

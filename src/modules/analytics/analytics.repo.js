import { query } from '../../db/pool.js';

export async function insertEvent({ id, agentId, conversationId, sessionId, eventType, payload = {} }) {
  await query(
    `INSERT INTO analytics_events (id, agent_id, conversation_id, session_id, event_type, payload)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [id, agentId, conversationId || null, sessionId || null, eventType, JSON.stringify(payload)]
  );
}

export async function countEventsByType(agentId, since) {
  const { rows } = await query(
    `SELECT event_type AS "eventType", COUNT(*)::int AS count
     FROM analytics_events WHERE agent_id = $1 AND created_at >= $2
     GROUP BY event_type`,
    [agentId, since]
  );
  return rows;
}

export async function countConversations(agentId, since) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM conversations WHERE agent_id = $1 AND created_at >= $2`,
    [agentId, since]
  );
  return rows[0].count;
}

export async function countLeads(agentId, since) {
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM leads WHERE agent_id = $1 AND created_at >= $2`, [
    agentId,
    since,
  ]);
  return rows[0].count;
}

export async function countMessages(agentId, since) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE c.agent_id = $1 AND m.created_at >= $2 AND m.role = 'user'`,
    [agentId, since]
  );
  return rows[0].count;
}

export async function countFeedback(agentId, since) {
  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE m.feedback = 1)::int AS positive,
       COUNT(*) FILTER (WHERE m.feedback = -1)::int AS negative
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE c.agent_id = $1 AND m.created_at >= $2 AND m.feedback IS NOT NULL`,
    [agentId, since]
  );
  return rows[0] || { positive: 0, negative: 0 };
}

export async function listUnansweredQuestions(agentId, since, limit = 20) {
  const { rows } = await query(
    `SELECT payload->>'question' AS question, COUNT(*)::int AS count, MAX(created_at) AS "lastAskedAt"
     FROM analytics_events
     WHERE agent_id = $1 AND event_type = 'unanswered_question' AND created_at >= $2
     GROUP BY payload->>'question'
     ORDER BY count DESC, "lastAskedAt" DESC
     LIMIT $3`,
    [agentId, since, limit]
  );
  return rows;
}

// --- Уникальные сессии по типам событий (воронка) ---
export async function funnelBySession(agentId, since) {
  const { rows } = await query(
    `SELECT
       COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'widget_loaded') AS loaded,
       COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'widget_opened') AS opened,
       COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'chat_started') AS "chatStarted",
       COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'escalation_requested') AS escalated
     FROM analytics_events
     WHERE agent_id = $1 AND created_at >= $2 AND session_id IS NOT NULL`,
    [agentId, since]
  );
  const r = rows[0] || {};
  return {
    loaded: Number(r.loaded || 0),
    opened: Number(r.opened || 0),
    chatStarted: Number(r.chatStarted || 0),
    escalated: Number(r.escalated || 0),
  };
}

export async function countEventType(agentId, since, eventType) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM analytics_events WHERE agent_id = $1 AND created_at >= $2 AND event_type = $3`,
    [agentId, since, eventType]
  );
  return rows[0].count;
}

export async function triggersBreakdown(agentId, since) {
  const { rows } = await query(
    `SELECT COALESCE(payload->>'triggerId', 'unknown') AS id, COUNT(*)::int AS count
     FROM analytics_events
     WHERE agent_id = $1 AND created_at >= $2 AND event_type = 'trigger_fired'
     GROUP BY 1 ORDER BY count DESC`,
    [agentId, since]
  );
  return rows;
}

export async function topRecommendedProducts(agentId, since, limit = 5) {
  const { rows } = await query(
    `SELECT COALESCE(payload->>'name', payload->>'productId', payload->>'url') AS name, COUNT(*)::int AS count
     FROM analytics_events
     WHERE agent_id = $1 AND created_at >= $2 AND event_type = 'product_recommended'
       AND COALESCE(payload->>'name', payload->>'productId', payload->>'url') IS NOT NULL
     GROUP BY 1 ORDER BY count DESC LIMIT $3`,
    [agentId, since, limit]
  );
  return rows;
}

/** Тексты вопросов пользователей за период — для тематического анализа без LLM. */
export async function listUserMessageTexts(agentId, since, limit = 2000) {
  const { rows } = await query(
    `SELECT m.content FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE c.agent_id = $1 AND m.role = 'user' AND m.created_at >= $2
     ORDER BY m.created_at DESC LIMIT $3`,
    [agentId, since, limit]
  );
  return rows.map((r) => r.content || '');
}

// --- Неотвеченные вопросы (таблица) ---
export async function insertUnanswered({ id, agentId, question, conversationId }) {
  await query(
    `INSERT INTO unanswered_questions (id, agent_id, question, conversation_id) VALUES ($1, $2, $3, $4)`,
    [id, agentId, question, conversationId || null]
  );
}

export async function listOpenUnanswered(agentId, limit = 30) {
  const { rows } = await query(
    `SELECT id, question, conversation_id AS "conversationId", created_at AS "createdAt"
     FROM unanswered_questions
     WHERE agent_id = $1 AND status = 'open'
     ORDER BY created_at DESC LIMIT $2`,
    [agentId, limit]
  );
  return rows;
}

export async function resolveUnanswered(id, agentId) {
  const { rowCount } = await query(
    `UPDATE unanswered_questions SET status = 'resolved', resolved_at = now() WHERE id = $1 AND agent_id = $2 AND status = 'open'`,
    [id, agentId]
  );
  return rowCount;
}

export default {
  insertEvent,
  countEventsByType,
  countConversations,
  countLeads,
  countMessages,
  countFeedback,
  listUnansweredQuestions,
  funnelBySession,
  countEventType,
  triggersBreakdown,
  topRecommendedProducts,
  insertUnanswered,
  listOpenUnanswered,
  resolveUnanswered,
};

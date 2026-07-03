import { query } from '../../db/pool.js';

const MSG_COLUMNS = `
  id, conversation_id AS "conversationId", role, content, tokens_used AS "tokensUsed",
  created_at AS "createdAt"
`;

export async function insertMessage({ id, conversationId, role, content, tokensUsed = 0 }) {
  const { rows } = await query(
    `INSERT INTO messages (id, conversation_id, role, content, tokens_used)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${MSG_COLUMNS}`,
    [id, conversationId, role, content, tokensUsed]
  );
  return rows[0];
}

export async function listMessages(conversationId, limit = 200) {
  const { rows } = await query(
    `SELECT ${MSG_COLUMNS} FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2`,
    [conversationId, limit]
  );
  return rows;
}

export async function listRecentMessages(conversationId, limit = 10) {
  const { rows } = await query(
    `SELECT ${MSG_COLUMNS} FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [conversationId, limit]
  );
  return rows.reverse();
}

export async function countUserMessages(conversationId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM messages WHERE conversation_id = $1 AND role = 'user'`,
    [conversationId]
  );
  return rows[0].count;
}

export async function setFeedback(id, conversationId, rating) {
  const { rows } = await query(
    `UPDATE messages SET feedback = $1 WHERE id = $2 AND conversation_id = $3 RETURNING ${MSG_COLUMNS}, feedback`,
    [rating, id, conversationId]
  );
  return rows[0] || null;
}

export default { insertMessage, listMessages, listRecentMessages, countUserMessages, setFeedback };

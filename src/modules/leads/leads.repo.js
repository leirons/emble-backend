import { query } from '../../db/pool.js';

const LEAD_COLUMNS = `
  id, conversation_id AS "conversationId", agent_id AS "agentId", name, email, phone,
  captured_fields AS "capturedFields", created_at AS "createdAt"
`;

export async function insertLead({ id, conversationId, agentId, name, email, phone, capturedFields = {} }) {
  const { rows } = await query(
    `INSERT INTO leads (id, conversation_id, agent_id, name, email, phone, captured_fields)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING ${LEAD_COLUMNS}`,
    [id, conversationId || null, agentId, name || null, email || null, phone || null, JSON.stringify(capturedFields)]
  );
  return rows[0];
}

export async function listLeadsByAgent(agentId, { limit = 100, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT ${LEAD_COLUMNS} FROM leads WHERE agent_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [agentId, limit, offset]
  );
  return rows;
}

export default { insertLead, listLeadsByAgent };

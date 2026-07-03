import { query } from '../../db/pool.js';

const CONV_COLUMNS = `
  id, agent_id AS "agentId", visitor_id AS "visitorId", channel, status,
  active_flow_id AS "activeFlowId", flow_step_id AS "flowStepId",
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

export async function insertConversation({ id, agentId, visitorId, channel = 'widget' }) {
  const { rows } = await query(
    `INSERT INTO conversations (id, agent_id, visitor_id, channel) VALUES ($1, $2, $3, $4)
     RETURNING ${CONV_COLUMNS}`,
    [id, agentId, visitorId, channel]
  );
  return rows[0];
}

export async function findOpenConversation(agentId, visitorId) {
  const { rows } = await query(
    `SELECT ${CONV_COLUMNS} FROM conversations
     WHERE agent_id = $1 AND visitor_id = $2 AND status = 'open'
     ORDER BY created_at DESC LIMIT 1`,
    [agentId, visitorId]
  );
  return rows[0] || null;
}

export async function getConversationForAgent(id, agentId) {
  const { rows } = await query(`SELECT ${CONV_COLUMNS} FROM conversations WHERE id = $1 AND agent_id = $2`, [
    id,
    agentId,
  ]);
  return rows[0] || null;
}

export async function listConversationsByAgent(agentId, { limit = 50, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT ${CONV_COLUMNS} FROM conversations WHERE agent_id = $1
     ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
    [agentId, limit, offset]
  );
  return rows;
}

export async function touchConversation(id) {
  await query(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [id]);
}

export async function setConversationStatus(id, agentId, status) {
  const { rows } = await query(
    `UPDATE conversations SET status = $1, updated_at = now() WHERE id = $2 AND agent_id = $3
     RETURNING ${CONV_COLUMNS}`,
    [status, id, agentId]
  );
  return rows[0] || null;
}

export async function setFlowState(id, agentId, flowId, stepId) {
  const { rows } = await query(
    `UPDATE conversations SET active_flow_id = $1, flow_step_id = $2, updated_at = now()
     WHERE id = $3 AND agent_id = $4 RETURNING ${CONV_COLUMNS}`,
    [flowId, stepId, id, agentId]
  );
  return rows[0] || null;
}

export default {
  insertConversation,
  findOpenConversation,
  getConversationForAgent,
  listConversationsByAgent,
  touchConversation,
  setConversationStatus,
  setFlowState,
};

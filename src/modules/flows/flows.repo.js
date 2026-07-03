import { query, withTransaction } from '../../db/pool.js';

const FLOW_COLUMNS = `
  id, agent_id AS "agentId", name, is_active AS "isActive", definition,
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

export async function insertFlow({ id, agentId, name, definition }) {
  const { rows } = await query(
    `INSERT INTO agent_flows (id, agent_id, name, definition) VALUES ($1, $2, $3, $4::jsonb) RETURNING ${FLOW_COLUMNS}`,
    [id, agentId, name, JSON.stringify(definition)]
  );
  return rows[0];
}

export async function listFlowsByAgent(agentId) {
  const { rows } = await query(`SELECT ${FLOW_COLUMNS} FROM agent_flows WHERE agent_id = $1 ORDER BY created_at DESC`, [
    agentId,
  ]);
  return rows;
}

export async function getFlowById(id, agentId) {
  const { rows } = await query(`SELECT ${FLOW_COLUMNS} FROM agent_flows WHERE id = $1 AND agent_id = $2`, [
    id,
    agentId,
  ]);
  return rows[0] || null;
}

export async function getActiveFlow(agentId) {
  const { rows } = await query(
    `SELECT ${FLOW_COLUMNS} FROM agent_flows WHERE agent_id = $1 AND is_active = true LIMIT 1`,
    [agentId]
  );
  return rows[0] || null;
}

export async function updateFlow(id, agentId, fields) {
  const sets = [];
  const values = [];
  let i = 1;
  if (fields.name !== undefined) {
    sets.push(`name = $${i}`);
    values.push(fields.name);
    i += 1;
  }
  if (fields.definition !== undefined) {
    sets.push(`definition = $${i}::jsonb`);
    values.push(JSON.stringify(fields.definition));
    i += 1;
  }
  if (sets.length === 0) return getFlowById(id, agentId);

  sets.push(`updated_at = now()`);
  values.push(id, agentId);
  const { rows } = await query(
    `UPDATE agent_flows SET ${sets.join(', ')} WHERE id = $${i} AND agent_id = $${i + 1} RETURNING ${FLOW_COLUMNS}`,
    values
  );
  return rows[0] || null;
}

export async function deleteFlow(id, agentId) {
  await query(`DELETE FROM agent_flows WHERE id = $1 AND agent_id = $2`, [id, agentId]);
}

/** Активирует flow и деактивирует все остальные flow агента — атомарно, в транзакции. */
export async function activateFlow(id, agentId) {
  return withTransaction(async (client) => {
    await client.query(
      `UPDATE agent_flows SET is_active = false, updated_at = now() WHERE agent_id = $1 AND is_active = true`,
      [agentId]
    );
    const { rows } = await client.query(
      `UPDATE agent_flows SET is_active = true, updated_at = now() WHERE id = $1 AND agent_id = $2 RETURNING ${FLOW_COLUMNS}`,
      [id, agentId]
    );
    return rows[0] || null;
  });
}

export async function deactivateFlow(id, agentId) {
  const { rows } = await query(
    `UPDATE agent_flows SET is_active = false, updated_at = now() WHERE id = $1 AND agent_id = $2 RETURNING ${FLOW_COLUMNS}`,
    [id, agentId]
  );
  return rows[0] || null;
}

export default {
  insertFlow,
  listFlowsByAgent,
  getFlowById,
  getActiveFlow,
  updateFlow,
  deleteFlow,
  activateFlow,
  deactivateFlow,
};

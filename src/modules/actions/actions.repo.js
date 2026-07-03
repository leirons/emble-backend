import { query } from '../../db/pool.js';

const ACTION_COLUMNS = `
  id, agent_id AS "agentId", name, description, method, url, headers,
  body_template AS "bodyTemplate", param_schema AS "paramSchema",
  trigger_type AS "triggerType", event_name AS "eventName", enabled,
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

export async function insertAction({
  id,
  agentId,
  name,
  description,
  method,
  url,
  headers,
  bodyTemplate,
  paramSchema,
  triggerType,
  eventName,
  enabled,
}) {
  const { rows } = await query(
    `INSERT INTO agent_actions
      (id, agent_id, name, description, method, url, headers, body_template, param_schema, trigger_type, event_name, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12)
     RETURNING ${ACTION_COLUMNS}`,
    [
      id,
      agentId,
      name,
      description,
      method || 'POST',
      url,
      JSON.stringify(headers || {}),
      JSON.stringify(bodyTemplate || {}),
      JSON.stringify(paramSchema || {}),
      triggerType,
      eventName || null,
      enabled !== false,
    ]
  );
  return rows[0];
}

export async function listActionsByAgent(agentId) {
  const { rows } = await query(
    `SELECT ${ACTION_COLUMNS} FROM agent_actions WHERE agent_id = $1 ORDER BY created_at DESC`,
    [agentId]
  );
  return rows;
}

export async function listActionsForLlmTools(agentId) {
  const { rows } = await query(
    `SELECT ${ACTION_COLUMNS} FROM agent_actions WHERE agent_id = $1 AND trigger_type = 'llm_tool' AND enabled = true`,
    [agentId]
  );
  return rows;
}

export async function listActionsForEvent(agentId, eventName) {
  const { rows } = await query(
    `SELECT ${ACTION_COLUMNS} FROM agent_actions
     WHERE agent_id = $1 AND trigger_type = 'event' AND event_name = $2 AND enabled = true`,
    [agentId, eventName]
  );
  return rows;
}

export async function getActionById(id, agentId) {
  const { rows } = await query(`SELECT ${ACTION_COLUMNS} FROM agent_actions WHERE id = $1 AND agent_id = $2`, [
    id,
    agentId,
  ]);
  return rows[0] || null;
}

export async function updateAction(id, agentId, fields) {
  const allowed = [
    'name',
    'description',
    'method',
    'url',
    'headers',
    'body_template',
    'param_schema',
    'trigger_type',
    'event_name',
    'enabled',
  ];
  const map = {
    name: fields.name,
    description: fields.description,
    method: fields.method,
    url: fields.url,
    headers: fields.headers !== undefined ? JSON.stringify(fields.headers) : undefined,
    body_template: fields.bodyTemplate !== undefined ? JSON.stringify(fields.bodyTemplate) : undefined,
    param_schema: fields.paramSchema !== undefined ? JSON.stringify(fields.paramSchema) : undefined,
    trigger_type: fields.triggerType,
    event_name: fields.eventName,
    enabled: fields.enabled,
  };
  const sets = [];
  const values = [];
  let i = 1;
  for (const col of allowed) {
    if (map[col] !== undefined) {
      sets.push(`${col} = $${i}`);
      values.push(map[col]);
      i += 1;
    }
  }
  if (sets.length === 0) return getActionById(id, agentId);

  sets.push(`updated_at = now()`);
  values.push(id, agentId);
  const { rows } = await query(
    `UPDATE agent_actions SET ${sets.join(', ')} WHERE id = $${i} AND agent_id = $${i + 1} RETURNING ${ACTION_COLUMNS}`,
    values
  );
  return rows[0] || null;
}

export async function deleteAction(id, agentId) {
  await query(`DELETE FROM agent_actions WHERE id = $1 AND agent_id = $2`, [id, agentId]);
}

export async function insertActionLog({ id, actionId, conversationId, requestBody, responseStatus, responseSnippet, success }) {
  await query(
    `INSERT INTO agent_action_logs (id, action_id, conversation_id, request_body, response_status, response_snippet, success)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
    [id, actionId, conversationId || null, JSON.stringify(requestBody || {}), responseStatus ?? null, responseSnippet || null, success]
  );
}

export async function listActionLogs(actionId, limit = 20) {
  const { rows } = await query(
    `SELECT id, action_id AS "actionId", conversation_id AS "conversationId", request_body AS "requestBody",
       response_status AS "responseStatus", response_snippet AS "responseSnippet", success, created_at AS "createdAt"
     FROM agent_action_logs WHERE action_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [actionId, limit]
  );
  return rows;
}

export default {
  insertAction,
  listActionsByAgent,
  listActionsForLlmTools,
  listActionsForEvent,
  getActionById,
  updateAction,
  deleteAction,
  insertActionLog,
  listActionLogs,
};

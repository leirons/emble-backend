import { query } from '../../db/pool.js';

const AGENT_COLUMNS = `
  id, org_id AS "orgId", name, type, status, public_slug AS "publicSlug",
  model_provider AS "modelProvider", model_name AS "modelName", system_prompt AS "systemPrompt",
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

export async function insertAgent({ id, orgId, name, type, publicSlug, modelProvider, modelName, systemPrompt }) {
  const { rows } = await query(
    `INSERT INTO agents (id, org_id, name, type, public_slug, model_provider, model_name, system_prompt)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${AGENT_COLUMNS}`,
    [id, orgId, name, type, publicSlug, modelProvider, modelName, systemPrompt]
  );
  return rows[0];
}

export async function listAgentsByOrg(orgId) {
  const { rows } = await query(
    `SELECT ${AGENT_COLUMNS} FROM agents WHERE org_id = $1 ORDER BY created_at DESC`,
    [orgId]
  );
  return rows;
}

export async function getAgentByIdForOrg(id, orgId) {
  const { rows } = await query(`SELECT ${AGENT_COLUMNS} FROM agents WHERE id = $1 AND org_id = $2`, [id, orgId]);
  return rows[0] || null;
}

export async function getAgentById(id) {
  const { rows } = await query(`SELECT ${AGENT_COLUMNS} FROM agents WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function getAgentBySlug(slug) {
  const { rows } = await query(`SELECT ${AGENT_COLUMNS} FROM agents WHERE public_slug = $1`, [slug]);
  return rows[0] || null;
}

export async function updateAgent(id, orgId, fields) {
  const allowed = ['name', 'type', 'model_provider', 'model_name', 'system_prompt'];
  const map = {
    name: fields.name,
    type: fields.type,
    model_provider: fields.modelProvider,
    model_name: fields.modelName,
    system_prompt: fields.systemPrompt,
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
  if (sets.length === 0) return getAgentByIdForOrg(id, orgId);

  sets.push(`updated_at = now()`);
  values.push(id, orgId);
  const { rows } = await query(
    `UPDATE agents SET ${sets.join(', ')} WHERE id = $${i} AND org_id = $${i + 1} RETURNING ${AGENT_COLUMNS}`,
    values
  );
  return rows[0] || null;
}

export async function setAgentStatus(id, orgId, status) {
  const { rows } = await query(
    `UPDATE agents SET status = $1, updated_at = now() WHERE id = $2 AND org_id = $3 RETURNING ${AGENT_COLUMNS}`,
    [status, id, orgId]
  );
  return rows[0] || null;
}

export async function deleteAgent(id, orgId) {
  await query(`DELETE FROM agents WHERE id = $1 AND org_id = $2`, [id, orgId]);
}

export async function countAgentsByOrg(orgId) {
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM agents WHERE org_id = $1`, [orgId]);
  return rows[0].count;
}

// --- Branding ---

const BRANDING_COLUMNS = `
  agent_id AS "agentId", avatar_url AS "avatarUrl", brand_color AS "brandColor", greeting,
  quick_replies AS "quickReplies", widget_form_factor AS "widgetFormFactor", position,
  start_menu AS "startMenu", product_card_style AS "productCardStyle", updated_at AS "updatedAt"
`;

export async function getBranding(agentId) {
  const { rows } = await query(`SELECT ${BRANDING_COLUMNS} FROM agent_branding WHERE agent_id = $1`, [agentId]);
  return rows[0] || null;
}

/**
 * Частичное обновление брендинга. Сначала гарантируем строку (с табличными
 * дефолтами), затем обновляем ТОЛЬКО переданные поля — чтобы, например, смена
 * цвета не затирала приветствие и быстрые ответы.
 */
export async function upsertBranding(agentId, branding) {
  await query(`INSERT INTO agent_branding (agent_id) VALUES ($1) ON CONFLICT (agent_id) DO NOTHING`, [agentId]);

  const map = {
    avatar_url: branding.avatarUrl,
    brand_color: branding.brandColor,
    greeting: branding.greeting,
    quick_replies: branding.quickReplies !== undefined ? JSON.stringify(branding.quickReplies) : undefined,
    widget_form_factor: branding.widgetFormFactor,
    position: branding.position,
    start_menu: branding.startMenu !== undefined ? JSON.stringify(branding.startMenu) : undefined,
    product_card_style: branding.productCardStyle,
  };
  const jsonbCols = new Set(['quick_replies', 'start_menu']);
  const sets = [];
  const values = [];
  let i = 1;
  for (const [col, val] of Object.entries(map)) {
    if (val !== undefined) {
      sets.push(jsonbCols.has(col) ? `${col} = $${i}::jsonb` : `${col} = $${i}`);
      values.push(val);
      i += 1;
    }
  }
  if (sets.length === 0) return getBranding(agentId);

  sets.push(`updated_at = now()`);
  values.push(agentId);
  const { rows } = await query(
    `UPDATE agent_branding SET ${sets.join(', ')} WHERE agent_id = $${i} RETURNING ${BRANDING_COLUMNS}`,
    values
  );
  return rows[0];
}

// --- Widget domains ---

export async function listWidgetDomains(agentId) {
  const { rows } = await query(
    `SELECT id, domain, created_at AS "createdAt" FROM widget_domains WHERE agent_id = $1 ORDER BY created_at`,
    [agentId]
  );
  return rows;
}

export async function addWidgetDomain(agentId, domain) {
  const { rows } = await query(
    `INSERT INTO widget_domains (agent_id, domain) VALUES ($1, $2)
     ON CONFLICT (agent_id, domain) DO NOTHING
     RETURNING id, domain, created_at AS "createdAt"`,
    [agentId, domain.toLowerCase().trim()]
  );
  return rows[0] || null;
}

export async function removeWidgetDomain(agentId, domainId) {
  await query(`DELETE FROM widget_domains WHERE agent_id = $1 AND id = $2`, [agentId, domainId]);
}

// --- Настройки поведения (proactive / exit-intent / эскалация / язык / email-fallback) ---

const SETTINGS_COLUMNS = `
  agent_id AS "agentId", proactive_enabled AS "proactiveEnabled", proactive_message AS "proactiveMessage",
  proactive_delay_seconds AS "proactiveDelaySeconds", exit_intent_enabled AS "exitIntentEnabled",
  exit_intent_message AS "exitIntentMessage", escalation_enabled AS "escalationEnabled",
  escalation_keywords AS "escalationKeywords", auto_language AS "autoLanguage",
  email_fallback_enabled AS "emailFallbackEnabled", lead_contact_type AS "leadContactType",
  openai_api_key AS "openaiApiKey",
  enable_email_on_escalation AS "enableEmailOnEscalation", escalation_email_message AS "escalationEmailMessage",
  enable_returning_greeting AS "enableReturningGreeting", greeting_new AS "greetingNew",
  greeting_returning AS "greetingReturning", updated_at AS "updatedAt"
`;

/** Возвращает настройки агента, лениво создавая дефолтную строку при первом обращении. */
export async function getOrCreateSettings(agentId) {
  const { rows } = await query(
    `INSERT INTO agent_settings (agent_id) VALUES ($1)
     ON CONFLICT (agent_id) DO UPDATE SET agent_id = agent_settings.agent_id
     RETURNING ${SETTINGS_COLUMNS}`,
    [agentId]
  );
  return rows[0];
}

export async function updateSettings(agentId, fields) {
  await getOrCreateSettings(agentId);

  const allowed = [
    'proactive_enabled',
    'proactive_message',
    'proactive_delay_seconds',
    'exit_intent_enabled',
    'exit_intent_message',
    'escalation_enabled',
    'escalation_keywords',
    'auto_language',
    'email_fallback_enabled',
    'lead_contact_type',
    'openai_api_key',
    'enable_email_on_escalation',
    'escalation_email_message',
    'enable_returning_greeting',
    'greeting_new',
    'greeting_returning',
  ];
  const map = {
    proactive_enabled: fields.proactiveEnabled,
    proactive_message: fields.proactiveMessage,
    proactive_delay_seconds: fields.proactiveDelaySeconds,
    exit_intent_enabled: fields.exitIntentEnabled,
    exit_intent_message: fields.exitIntentMessage,
    escalation_enabled: fields.escalationEnabled,
    escalation_keywords: fields.escalationKeywords,
    auto_language: fields.autoLanguage,
    email_fallback_enabled: fields.emailFallbackEnabled,
    lead_contact_type: fields.leadContactType,
    // пустую строку трактуем как сброс ключа (NULL)
    openai_api_key: fields.openaiApiKey === '' ? null : fields.openaiApiKey,
    enable_email_on_escalation: fields.enableEmailOnEscalation,
    escalation_email_message: fields.escalationEmailMessage,
    enable_returning_greeting: fields.enableReturningGreeting,
    greeting_new: fields.greetingNew,
    greeting_returning: fields.greetingReturning,
  };
  const sets = [];
  const values = [];
  let i = 1;
  for (const col of allowed) {
    if (map[col] !== undefined) {
      sets.push(col === 'escalation_keywords' ? `${col} = $${i}::text[]` : `${col} = $${i}`);
      values.push(map[col]);
      i += 1;
    }
  }
  if (sets.length === 0) return getOrCreateSettings(agentId);

  sets.push(`updated_at = now()`);
  values.push(agentId);
  const { rows } = await query(
    `UPDATE agent_settings SET ${sets.join(', ')} WHERE agent_id = $${i} RETURNING ${SETTINGS_COLUMNS}`,
    values
  );
  return rows[0];
}

export default {
  insertAgent,
  listAgentsByOrg,
  getAgentByIdForOrg,
  getAgentById,
  getAgentBySlug,
  updateAgent,
  setAgentStatus,
  deleteAgent,
  countAgentsByOrg,
  getBranding,
  upsertBranding,
  listWidgetDomains,
  addWidgetDomain,
  removeWidgetDomain,
  getOrCreateSettings,
  updateSettings,
};

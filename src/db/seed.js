// Опциональный сид: демо-организация + демо-агент типа "support".
// Запуск: npm run seed
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { pool } from './pool.js';
import { logger } from '../lib/logger.js';
import { AGENT_TEMPLATES } from '../modules/agents/templates.js';
import { generateAgentSlug } from '../modules/agents/agents.service.js';

async function run() {
  const orgId = uuid();
  const userId = uuid();
  const passwordHash = await bcrypt.hash('password123', 10);

  await pool.query(
    `INSERT INTO organizations (id, name, plan_id) VALUES ($1, $2, 'free')`,
    [orgId, 'Demo Company']
  );
  await pool.query(
    `INSERT INTO users (id, org_id, email, password_hash, role) VALUES ($1, $2, $3, $4, 'owner')`,
    [userId, orgId, 'demo@emble.ai', passwordHash]
  );
  await pool.query(
    `INSERT INTO subscriptions (org_id, plan_id, status) VALUES ($1, 'free', 'active')`,
    [orgId]
  );

  const agentId = uuid();
  const slug = generateAgentSlug();
  const template = AGENT_TEMPLATES.support;

  await pool.query(
    `INSERT INTO agents (id, org_id, name, type, status, public_slug, model_provider, model_name, system_prompt)
     VALUES ($1, $2, $3, 'support', 'published', $4, 'openai', 'gpt-4o-mini', $5)`,
    [agentId, orgId, template.name, slug, template.systemPrompt]
  );
  await pool.query(
    `INSERT INTO agent_branding (agent_id, brand_color, greeting, quick_replies, widget_form_factor)
     VALUES ($1, $2, $3, $4::jsonb, 'floating_chat')`,
    [agentId, '#6366F1', template.greeting, JSON.stringify(template.quickReplies)]
  );
  await pool.query(
    `INSERT INTO widget_domains (agent_id, domain) VALUES ($1, 'localhost')`,
    [agentId]
  );

  logger.info({ orgId, userId, agentId, slug }, 'Сид-дані створені');
  logger.info('Логін: demo@emble.ai / password123');
  logger.info(`Embed-код: <script src="https://cdn.emble.ai/embed.js" data-agent="${slug}" async></script>`);

  await pool.end();
}

run().catch((err) => {
  logger.error({ err }, 'Помилка сида');
  process.exit(1);
});

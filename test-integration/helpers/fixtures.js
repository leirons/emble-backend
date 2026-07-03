import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { pool } from '../../src/db/pool.js';

/**
 * Создаёт организацию + владельца + free-подписку напрямую в БД (минуя HTTP register),
 * когда тесту нужен уже существующий тенант.
 */
export async function createOrgWithUser({ email, password = 'password123', orgName = 'Test Co' } = {}) {
  const orgId = uuid();
  const userId = uuid();
  const userEmail = email || `user-${userId}@test.local`;
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(`INSERT INTO organizations (id, name, plan_id) VALUES ($1, $2, 'free')`, [orgId, orgName]);
  await pool.query(
    `INSERT INTO users (id, org_id, email, password_hash, role) VALUES ($1, $2, $3, $4, 'owner')`,
    [userId, orgId, userEmail, passwordHash]
  );
  await pool.query(`INSERT INTO subscriptions (org_id, plan_id, status) VALUES ($1, 'free', 'active')`, [orgId]);

  return { orgId, userId, email: userEmail, password };
}

/**
 * Создаёт опубликованного агента (+ branding) для организации.
 * По умолчанию НЕ добавляет widget_domains — пустой whitelist разрешает запросы без Origin
 * (grace-period), что удобно для серверного fetch в тестах.
 */
export async function createPublishedAgent(orgId, { name = 'Test Agent', type = 'support' } = {}) {
  const agentId = uuid();
  const slug = `test-${uuid()}`;
  await pool.query(
    `INSERT INTO agents (id, org_id, name, type, status, public_slug, model_provider, model_name, system_prompt)
     VALUES ($1, $2, $3, $4, 'published', $5, 'openai', 'gpt-4o-mini', 'You are a helpful assistant.')`,
    [agentId, orgId, name, type, slug]
  );
  await pool.query(
    `INSERT INTO agent_branding (agent_id, brand_color, greeting, quick_replies, widget_form_factor)
     VALUES ($1, '#6366F1', 'Привет!', '[]'::jsonb, 'floating_chat')`,
    [agentId]
  );
  return { agentId, slug };
}

/** Разрешает домен в whitelist агента (для проверки origin-контроля). */
export async function allowDomain(agentId, domain) {
  await pool.query(`INSERT INTO widget_domains (agent_id, domain) VALUES ($1, $2)`, [agentId, domain]);
}

import crypto from 'node:crypto';
import { v4 as uuid } from 'uuid';
import * as agentsRepo from './agents.repo.js';
import * as subsRepo from '../billing/subscriptions.repo.js';
import { getTemplate } from './templates.js';
import { notFound, forbidden } from '../../lib/errors.js';

export function generateAgentSlug() {
  // Пример из лендинга: agent-x9f2c
  const suffix = crypto.randomBytes(4).toString('hex').slice(0, 5);
  return `agent-${suffix}`;
}

async function assertAgentLimit(orgId) {
  const subscription = await subsRepo.getSubscriptionByOrg(orgId);
  const plan = await subsRepo.getPlan(subscription?.planId || 'free');
  const count = await agentsRepo.countAgentsByOrg(orgId);
  if (plan && count >= plan.agentLimit) {
    throw forbidden(`Достигнут лимит агентов по тарифу "${plan.name}" (${plan.agentLimit}). Обновите тариф.`);
  }
}

export async function createAgent(orgId, input) {
  await assertAgentLimit(orgId);

  const template = getTemplate(input.type || 'support');
  let slug = generateAgentSlug();
  // На случай коллизии (крайне маловероятно) — пробуем ещё раз.
  while (await agentsRepo.getAgentBySlug(slug)) {
    slug = generateAgentSlug();
  }

  const agent = await agentsRepo.insertAgent({
    id: uuid(),
    orgId,
    name: input.name,
    type: input.type || 'support',
    publicSlug: slug,
    modelProvider: input.modelProvider || 'openai',
    modelName: input.modelName || null,
    systemPrompt: input.systemPrompt || template.systemPrompt,
  });

  const branding = await agentsRepo.upsertBranding(agent.id, {
    greeting: template.greeting,
    quickReplies: template.quickReplies,
    brandColor: '#6366F1',
    widgetFormFactor: 'floating_chat',
    position: 'bottom-right',
  });

  return { ...agent, branding };
}

export async function listAgents(orgId) {
  return agentsRepo.listAgentsByOrg(orgId);
}

export async function getAgent(orgId, agentId) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  const branding = await agentsRepo.getBranding(agentId);
  const domains = await agentsRepo.listWidgetDomains(agentId);
  return { ...agent, branding, domains };
}

export async function updateAgent(orgId, agentId, input) {
  const agent = await agentsRepo.updateAgent(agentId, orgId, input);
  if (!agent) throw notFound('Агент не найден');
  return agent;
}

export async function publishAgent(orgId, agentId) {
  const agent = await agentsRepo.setAgentStatus(agentId, orgId, 'published');
  if (!agent) throw notFound('Агент не найден');
  return agent;
}

export async function unpublishAgent(orgId, agentId) {
  const agent = await agentsRepo.setAgentStatus(agentId, orgId, 'draft');
  if (!agent) throw notFound('Агент не найден');
  return agent;
}

export async function deleteAgent(orgId, agentId) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  await agentsRepo.deleteAgent(agentId, orgId);
}

export async function updateBranding(orgId, agentId, input) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  return agentsRepo.upsertBranding(agentId, input);
}

export async function addDomain(orgId, agentId, domain) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  return agentsRepo.addWidgetDomain(agentId, domain);
}

export async function listDomains(orgId, agentId) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  return agentsRepo.listWidgetDomains(agentId);
}

export async function removeDomain(orgId, agentId, domainId) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  await agentsRepo.removeWidgetDomain(agentId, domainId);
}

/** Готовый embed-сниппет для вкладки "Интеграция" в дашборде. */
export function buildEmbedSnippet(agent, cdnBaseUrl) {
  return `<script src="${cdnBaseUrl}/embed.js" data-agent="${agent.publicSlug}" async></script>`;
}

export async function getSettings(orgId, agentId) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  return agentsRepo.getOrCreateSettings(agentId);
}

export async function updateSettings(orgId, agentId, input) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  return agentsRepo.updateSettings(agentId, input);
}

export default {
  generateAgentSlug,
  createAgent,
  listAgents,
  getAgent,
  updateAgent,
  publishAgent,
  unpublishAgent,
  deleteAgent,
  updateBranding,
  addDomain,
  listDomains,
  removeDomain,
  buildEmbedSnippet,
  getSettings,
  updateSettings,
};

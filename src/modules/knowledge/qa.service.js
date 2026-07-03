import { v4 as uuid } from 'uuid';
import * as qaRepo from './qa.repo.js';
import * as agentsRepo from '../agents/agents.repo.js';
import { embedTexts } from '../../lib/llm/index.js';
import { notFound } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

async function assertAgentOwnership(orgId, agentId) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  return agent;
}

/**
 * Считает эмбеддинг вопроса, но не падает, если LLM недоступна (нет ключа и т.п.).
 * Без эмбеддинга Q&A всё равно работает через точное текстовое совпадение.
 */
async function tryEmbed(agentId, text) {
  try {
    const settings = await agentsRepo.getOrCreateSettings(agentId).catch(() => null);
    const apiKey = settings?.openaiApiKey || undefined;
    const [embedding] = await embedTexts([text], apiKey);
    return embedding;
  } catch (err) {
    logger.warn({ err, agentId }, '[qa] не удалось посчитать эмбеддинг вопроса, сохраняем без него (доступно точное совпадение)');
    return null;
  }
}

export async function createQaPair(orgId, agentId, { question, answer }) {
  await assertAgentOwnership(orgId, agentId);
  const embedding = await tryEmbed(agentId, question);
  return qaRepo.insertQaPair({ id: uuid(), agentId, question, answer, embedding });
}

export async function listQaPairs(orgId, agentId) {
  await assertAgentOwnership(orgId, agentId);
  return qaRepo.listQaPairsByAgent(agentId);
}

export async function updateQaPair(orgId, agentId, qaId, { question, answer }) {
  await assertAgentOwnership(orgId, agentId);
  let embedding;
  if (question !== undefined) {
    embedding = await tryEmbed(agentId, question);
  }
  const qa = await qaRepo.updateQaPair(qaId, agentId, { question, answer, embedding });
  if (!qa) throw notFound('Q&A пара не найдена');
  return qa;
}

export async function deleteQaPair(orgId, agentId, qaId) {
  await assertAgentOwnership(orgId, agentId);
  await qaRepo.deleteQaPair(qaId, agentId);
}

export default { createQaPair, listQaPairs, updateQaPair, deleteQaPair };

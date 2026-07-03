import { v4 as uuid } from 'uuid';
import * as knowledgeRepo from './knowledge.repo.js';
import * as agentsRepo from '../agents/agents.repo.js';
import { uploadKnowledgeFile, deleteObject } from '../../lib/s3.js';
import { enqueueKnowledgeIngestion } from '../../lib/queue.js';
import { notFound, badRequest } from '../../lib/errors.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
]);

async function assertAgentOwnership(orgId, agentId) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  return agent;
}

export async function addFileSource(orgId, agentId, file) {
  await assertAgentOwnership(orgId, agentId);
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw badRequest(`Неподдерживаемый тип файла: ${file.mimetype}. Разрешены PDF, DOCX, TXT, MD.`);
  }

  const { key } = await uploadKnowledgeFile({
    agentId,
    originalName: file.originalname,
    buffer: file.buffer,
    mimeType: file.mimetype,
  });

  const source = await knowledgeRepo.insertSource({
    id: uuid(),
    agentId,
    type: 'file',
    title: file.originalname,
    fileKey: key,
  });

  await enqueueKnowledgeIngestion({ sourceId: source.id, agentId });
  return source;
}

export async function addUrlSource(orgId, agentId, { url, title, tags, syncIntervalMinutes, headers }) {
  await assertAgentOwnership(orgId, agentId);
  const source = await knowledgeRepo.insertSource({
    id: uuid(),
    agentId,
    type: 'url',
    title,
    sourceUrl: url,
    tags,
    syncIntervalMinutes,
    headers,
  });
  await enqueueKnowledgeIngestion({ sourceId: source.id, agentId });
  return source;
}

export async function addTextSource(orgId, agentId, { title, text, tags }) {
  await assertAgentOwnership(orgId, agentId);
  const source = await knowledgeRepo.insertSource({ id: uuid(), agentId, type: 'text', title, rawText: text, tags });
  await enqueueKnowledgeIngestion({ sourceId: source.id, agentId });
  return source;
}

export async function updateSource(orgId, agentId, sourceId, input) {
  await assertAgentOwnership(orgId, agentId);
  const source = await knowledgeRepo.updateSourceMeta(sourceId, agentId, input);
  if (!source) throw notFound('Источник знаний не найден');
  return source;
}

export async function resyncSource(orgId, agentId, sourceId) {
  await assertAgentOwnership(orgId, agentId);
  const source = await knowledgeRepo.getSourceById(sourceId, agentId);
  if (!source) throw notFound('Источник знаний не найден');
  await enqueueKnowledgeIngestion({ sourceId: source.id, agentId });
  return source;
}

export async function listSources(orgId, agentId) {
  await assertAgentOwnership(orgId, agentId);
  return knowledgeRepo.listSourcesByAgent(agentId);
}

export async function getSource(orgId, agentId, sourceId) {
  await assertAgentOwnership(orgId, agentId);
  const source = await knowledgeRepo.getSourceById(sourceId, agentId);
  if (!source) throw notFound('Источник знаний не найден');
  return source;
}

export async function deleteSource(orgId, agentId, sourceId) {
  await assertAgentOwnership(orgId, agentId);
  const source = await knowledgeRepo.getSourceById(sourceId, agentId);
  if (!source) throw notFound('Источник знаний не найден');

  await knowledgeRepo.deleteChunksForSource(sourceId);
  await knowledgeRepo.deleteSource(sourceId, agentId);
  if (source.fileKey) {
    await deleteObject(source.fileKey).catch(() => {});
  }
}

export default { addFileSource, addUrlSource, addTextSource, updateSource, resyncSource, listSources, getSource, deleteSource };

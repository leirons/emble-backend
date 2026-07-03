import * as knowledgeRepo from './knowledge.repo.js';
import * as agentsRepo from '../agents/agents.repo.js';
import { getObjectBuffer } from '../../lib/s3.js';
import { extractFromFile, extractFromUrl } from './extract.js';
import { chunkText } from './chunk.js';
import { embedTexts } from '../../lib/llm/index.js';
import { logger } from '../../lib/logger.js';

const EMBEDDING_BATCH_SIZE = 100;
const MIME_BY_EXT = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
};

function guessMimeFromKey(key) {
  const ext = key.split('.').pop()?.toLowerCase();
  return MIME_BY_EXT[ext] || 'text/plain';
}

async function resolveSourceText(source) {
  if (source.type === 'text') {
    return { text: source.rawText || '', title: source.title };
  }
  if (source.type === 'url') {
    const { text, title } = await extractFromUrl(source.sourceUrl, source.requestHeaders || {});
    return { text, title: source.title || title };
  }
  if (source.type === 'file') {
    const buffer = await getObjectBuffer(source.fileKey);
    const text = await extractFromFile(buffer, guessMimeFromKey(source.fileKey));
    return { text, title: source.title };
  }
  throw new Error(`Неизвестный тип источника: ${source.type}`);
}

/**
 * Обрабатывает один источник знаний: извлекает текст → чанкует → считает embeddings → сохраняет.
 * Идемпотентно по отношению к повторному запуску: старые чанки источника перед этим удаляются.
 * @param {{ sourceId: string, agentId: string }} payload
 */
export async function processKnowledgeSource({ sourceId, agentId }) {
  const source = await knowledgeRepo.getSourceRaw(sourceId);
  if (!source) {
    logger.warn({ sourceId }, '[ingestion] источник не найден, пропуск');
    return;
  }

  await knowledgeRepo.setSourceStatus(sourceId, 'processing');

  try {
    const settings = await agentsRepo.getOrCreateSettings(agentId).catch((err) => {
      logger.warn({ err, agentId }, '[ingestion] agent_settings unavailable, using server OpenAI API key');
      return null;
    });
    const apiKey = settings?.openaiApiKey || undefined;

    const { text, title } = await resolveSourceText(source);
    if (title && title !== source.title) await knowledgeRepo.setSourceTitle(sourceId, title);

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      await knowledgeRepo.setSourceStatus(sourceId, 'error', 'Не удалось извлечь текст из источника');
      return;
    }

    // Считаем ВСЕ embeddings ДО удаления старых чанков: если embedding упадёт (и повторы BullMQ
    // исчерпаются) — старая, рабочая версия базы знаний останется нетронутой. Раньше чанки удалялись
    // до re-embedding, и сбой оставлял источник вообще без данных (ACM-18 M1).
    const enriched = [];
    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const embeddings = await embedTexts(batch.map((c) => c.content), apiKey);
      batch.forEach((c, idx) => enriched.push({ ...c, embedding: embeddings[idx] }));
    }

    // Атомарный swap: удаление старых + вставка новых чанков в одной транзакции.
    await knowledgeRepo.replaceChunksForSource(sourceId, agentId, enriched);

    await knowledgeRepo.setSourceStatus(sourceId, 'ready');
    await knowledgeRepo.markSourceSynced(sourceId);
    logger.info({ sourceId, agentId, chunks: chunks.length }, '[ingestion] источник обработан');
  } catch (err) {
    logger.error({ err, sourceId }, '[ingestion] ошибка обработки источника');
    await knowledgeRepo.setSourceStatus(sourceId, 'error', err.message?.slice(0, 500));
    throw err; // даём BullMQ повторить попытку согласно attempts/backoff
  }
}

export default { processKnowledgeSource };

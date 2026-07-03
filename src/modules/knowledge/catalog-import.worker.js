import * as catalogRepo from './catalog.repo.js';
import * as agentsRepo from '../agents/agents.repo.js';
import { embedTexts } from '../../lib/llm/index.js';
import { logger } from '../../lib/logger.js';

const BATCH_SIZE = 50;

function toVectorLiteral(embedding) {
  return `[${embedding.join(',')}]`;
}

async function embedBatch(texts, apiKey) {
  try {
    return await embedTexts(texts, apiKey);
  } catch (err) {
    logger.warn({ err }, '[catalog-import] не удалось посчитать эмбеддинги, сохраняем товары без вектора');
    return texts.map(() => null);
  }
}

function embeddingText(p) {
  return `${p.name}. ${p.description || ''}`.trim();
}

export async function processCatalogImport({ jobId, agentId }) {
  const job = await catalogRepo.getImportJobWithData(jobId);
  if (!job) {
    logger.warn({ jobId }, '[catalog-import] задача не найдена, пропуск');
    return;
  }
  if (job.status !== 'pending') {
    logger.warn({ jobId, status: job.status }, '[catalog-import] задача не в статусе pending, пропуск');
    return;
  }

  await catalogRepo.updateImportJobStatus(jobId, 'processing');

  try {
    const settings = await agentsRepo.getOrCreateSettings(agentId).catch(() => null);
    const apiKey = settings?.openaiApiKey || undefined;
    const rows = job.rowsData || [];
    let totalProcessed = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const embeddings = await embedBatch(batch.map(embeddingText), apiKey);
      batch.forEach((p, idx) => { p.embedding = embeddings[idx]; });
      await catalogRepo.insertProductsBulk(agentId, batch);
      totalProcessed += batch.length;
      await catalogRepo.updateImportJobProgress(jobId, totalProcessed);
    }

    await catalogRepo.updateImportJobStatus(jobId, 'completed');
    await catalogRepo.clearImportJobData(jobId);
    logger.info({ jobId, agentId, total: rows.length }, '[catalog-import] импорт завершён');
  } catch (err) {
    logger.error({ err, jobId }, '[catalog-import] ошибка импорта каталога');
    await catalogRepo.updateImportJobStatus(jobId, 'error', err.message?.slice(0, 500));
    throw err;
  }
}

export default { processCatalogImport };

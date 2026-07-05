import * as catalogRepo from './catalog.repo.js';
import * as agentsRepo from '../agents/agents.repo.js';
import { embedTexts } from '../../lib/llm/index.js';
import { enqueueCatalogImport } from '../../lib/queue.js';
import { logger } from '../../lib/logger.js';

// За один вызов обрабатываем ограниченный чанк товаров и дозапускаем себя через очередь —
// чтобы уложиться в лимит времени serverless-функции на больших фидах (десятки тысяч позиций).
const CHUNK_SIZE = 300;
const BATCH_SIZE = 50; // размер батча эмбеддингов внутри чанка

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

/**
 * Обрабатывает ОДИН чанк задачи импорта (CHUNK_SIZE товаров начиная с processed_rows),
 * затем — если остались строки — дозапускает себя в очередь на следующий чанк. Так большой
 * каталог импортируется по частям, каждый вызов укладывается в лимит времени функции.
 * Идемпотентно: повторная доставка того же чанка не ломает импорт (ON CONFLICT DO NOTHING).
 */
export async function processCatalogImport({ jobId, agentId }) {
  const job = await catalogRepo.getImportJobMeta(jobId);
  if (!job) {
    logger.warn({ jobId }, '[catalog-import] задача не найдена, пропуск');
    return;
  }
  if (job.status === 'completed' || job.status === 'error') {
    logger.info({ jobId, status: job.status }, '[catalog-import] задача уже финализирована, пропуск');
    return;
  }
  if (job.status === 'pending') await catalogRepo.updateImportJobStatus(jobId, 'processing');

  try {
    const settings = await agentsRepo.getOrCreateSettings(agentId).catch(() => null);
    const apiKey = settings?.openaiApiKey || undefined;

    const total = job.totalRows || 0;
    const offset = job.processedRows || 0;
    const slice = await catalogRepo.getImportJobRowsSlice(jobId, offset, CHUNK_SIZE);

    for (let i = 0; i < slice.length; i += BATCH_SIZE) {
      const batch = slice.slice(i, i + BATCH_SIZE);
      const embeddings = await embedBatch(batch.map(embeddingText), apiKey);
      batch.forEach((p, idx) => { p.embedding = embeddings[idx]; });
      await catalogRepo.insertProductsBulk(agentId, batch);
    }

    const processed = offset + slice.length;
    await catalogRepo.updateImportJobProgress(jobId, processed);

    if (slice.length > 0 && processed < total) {
      // Ещё есть строки — планируем следующий чанк (cursor делает сообщение уникальным).
      await enqueueCatalogImport({ jobId, agentId, cursor: processed });
      logger.info({ jobId, processed, total }, '[catalog-import] чанк обработан, запланирован следующий');
    } else {
      await catalogRepo.updateImportJobStatus(jobId, 'completed');
      await catalogRepo.clearImportJobData(jobId);
      logger.info({ jobId, agentId, total: processed }, '[catalog-import] импорт завершён');
    }
  } catch (err) {
    logger.error({ err, jobId }, '[catalog-import] ошибка импорта каталога');
    await catalogRepo.updateImportJobStatus(jobId, 'error', err.message?.slice(0, 500));
    throw err;
  }
}

export default { processCatalogImport };

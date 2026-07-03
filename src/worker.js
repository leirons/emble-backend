import { Worker } from 'bullmq';
import { redis, createRedisConnection } from './lib/redis.js';
import { QUEUE_NAMES, enqueueKnowledgeIngestion, closeQueues } from './lib/queue.js';
import { processKnowledgeSource } from './modules/knowledge/ingestion.worker.js';
import { processCatalogImport } from './modules/knowledge/catalog-import.worker.js';
import * as knowledgeRepo from './modules/knowledge/knowledge.repo.js';
import { logger } from './lib/logger.js';

const SYNC_SCAN_INTERVAL_MS = 5 * 60 * 1000; // каждые 5 минут проверяем источники с настроенным sync_interval_minutes

const CONCURRENCY = parseInt(process.env.INGESTION_CONCURRENCY || '4', 10);

const worker = new Worker(
  QUEUE_NAMES.INGESTION,
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, '[worker] обрабатываю источник знаний');
    await processKnowledgeSource(job.data);
  },
  { connection: createRedisConnection(), concurrency: CONCURRENCY }
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, '[worker] задача выполнена');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, '[worker] задача провалена');
});

const catalogWorker = new Worker(
  QUEUE_NAMES.CATALOG_IMPORT,
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, '[worker] обрабатываю импорт каталога');
    await processCatalogImport(job.data);
  },
  { connection: createRedisConnection(), concurrency: 2 }
);

catalogWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, '[worker] импорт каталога завершён');
});

catalogWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, '[worker] импорт каталога провален');
});

logger.info(`Emble ingestion worker запущен (concurrency=${CONCURRENCY})`);

/**
 * Периодический сканер источников с настроенной автосинхронизацией (sync_interval_minutes).
 * Без отдельных BullMQ repeatable job'ов на источник — проще и надёжнее для MVP.
 */
async function scanDueSources() {
  try {
    const due = await knowledgeRepo.findSourcesDueForSync();
    for (const source of due) {
      await enqueueKnowledgeIngestion({ sourceId: source.id, agentId: source.agentId });
    }
    if (due.length > 0) {
      logger.info({ count: due.length }, '[worker] поставлено на пересинхронизацию источников');
    }
  } catch (err) {
    logger.error({ err }, '[worker] ошибка сканирования источников на синхронизацию');
  }
}

async function enqueuePendingSources() {
  try {
    const pending = await knowledgeRepo.findPendingSourcesForIngestion();
    for (const source of pending) {
      await enqueueKnowledgeIngestion({ sourceId: source.id, agentId: source.agentId });
    }
    if (pending.length > 0) {
      logger.info({ count: pending.length }, '[worker] pending knowledge sources re-queued');
    }
  } catch (err) {
    logger.error({ err }, '[worker] failed to re-queue pending knowledge sources');
  }
}

const syncScanTimer = setInterval(scanDueSources, SYNC_SCAN_INTERVAL_MS);
enqueuePendingSources();
scanDueSources();

// Раньше SIGTERM закрывал только воркеров, оставляя открытыми соединения очередей и общего Redis
// (ACM-18 L4) — процесс не завершался чисто. Теперь закрываем всё: воркеры → очереди → общий Redis.
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, '[worker] graceful shutdown');
  clearInterval(syncScanTimer);
  try {
    await Promise.all([worker.close(), catalogWorker.close()]);
    await closeQueues();
    await redis.quit();
  } catch (err) {
    logger.error({ err }, '[worker] ошибка при остановке, форсируем выход');
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

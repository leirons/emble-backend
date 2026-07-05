import { Queue } from 'bullmq';
import { createRedisConnection } from './redis.js';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const QUEUE_NAMES = {
  INGESTION: 'knowledge-ingestion',
  CATALOG_IMPORT: 'catalog-import',
};

// Serverless-режим: если задан токен QStash, задачи ставятся в него, а не в BullMQ.
const USE_QSTASH = !!env.qstash.token;

/**
 * Публикует задачу в Upstash QStash: он с гарантией доставки и ретраями вызовет наш
 * HTTP-эндпоинт `${APP_URL}/internal/jobs/${topic}` с этим телом. Секрет пробрасывается
 * заголовком x-job-secret (Upstash-Forward-*), дедупликация — по dedupId.
 */
async function publishToQStash(topic, payload, dedupId) {
  const target = `${(env.appUrl || '').replace(/\/$/, '')}/internal/jobs/${topic}`;
  const headers = {
    Authorization: `Bearer ${env.qstash.token}`,
    'Content-Type': 'application/json',
    'Upstash-Retries': '3',
  };
  if (env.jobSecret) headers['Upstash-Forward-x-job-secret'] = env.jobSecret;
  if (dedupId) headers['Upstash-Deduplication-Id'] = dedupId;

  const res = await fetch(`${env.qstash.url}/v2/publish/${encodeURIComponent(target)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error({ status: res.status, body: body.slice(0, 300), topic }, 'QStash publish failed');
    throw new Error(`QStash publish failed: HTTP ${res.status}`);
  }
  return res.json().catch(() => ({}));
}

let ingestionQueue;
let catalogImportQueue;

export function getIngestionQueue() {
  if (!ingestionQueue) {
    ingestionQueue = new Queue(QUEUE_NAMES.INGESTION, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 500,
        removeOnFail: 1000,
      },
    });
  }
  return ingestionQueue;
}

export function getCatalogImportQueue() {
  if (!catalogImportQueue) {
    catalogImportQueue = new Queue(QUEUE_NAMES.CATALOG_IMPORT, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 500,
        removeOnFail: 1000,
      },
    });
  }
  return catalogImportQueue;
}

/**
 * Поставить источник знаний в очередь на обработку.
 * @param {{ sourceId: string, agentId: string }} payload
 */
export async function enqueueKnowledgeIngestion(payload) {
  if (USE_QSTASH) return publishToQStash('ingestion', payload, `ingest-${payload.sourceId}`);
  const queue = getIngestionQueue();
  return queue.add('process-source', payload, { jobId: `ingest-${payload.sourceId}` });
}

/**
 * Поставить задачу импорта каталога в очередь.
 * @param {{ jobId: string, agentId: string }} payload
 */
export async function enqueueCatalogImport(payload) {
  // Дедуп включает фазу/cursor: prepare-сообщение и каждый чанк — отдельные сообщения,
  // иначе дозапуск следующего шага (тот же jobId) был бы отброшен как дубликат.
  const dedup = `catalog-import-${payload.jobId}-${payload.phase ?? payload.cursor ?? 0}`;
  if (USE_QSTASH) return publishToQStash('catalog-import', payload, dedup);
  const queue = getCatalogImportQueue();
  return queue.add('import-products', payload, { jobId: dedup });
}

/**
 * Закрывает открытые очереди (и их выделенные Redis-соединения). Идемпотентно —
 * безопасно вызывать при graceful shutdown воркера/сервера (ACM-18 L4).
 */
export async function closeQueues() {
  const queues = [ingestionQueue, catalogImportQueue].filter(Boolean);
  ingestionQueue = undefined;
  catalogImportQueue = undefined;
  await Promise.all(queues.map((q) => q.close()));
}

export default {
  QUEUE_NAMES,
  getIngestionQueue,
  getCatalogImportQueue,
  enqueueKnowledgeIngestion,
  enqueueCatalogImport,
  closeQueues,
};

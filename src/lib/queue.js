import { Queue } from 'bullmq';
import { createRedisConnection } from './redis.js';

export const QUEUE_NAMES = {
  INGESTION: 'knowledge-ingestion',
  CATALOG_IMPORT: 'catalog-import',
};

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
  const queue = getIngestionQueue();
  return queue.add('process-source', payload, { jobId: `ingest-${payload.sourceId}` });
}

/**
 * Поставить задачу импорта каталога в очередь.
 * @param {{ jobId: string, agentId: string }} payload
 */
export async function enqueueCatalogImport(payload) {
  const queue = getCatalogImportQueue();
  return queue.add('import-products', payload, { jobId: `catalog-import-${payload.jobId}` });
}

export default { QUEUE_NAMES, getIngestionQueue, getCatalogImportQueue, enqueueKnowledgeIngestion, enqueueCatalogImport };

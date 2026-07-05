import { Router } from 'express';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { logger } from '../../lib/logger.js';
import { processKnowledgeSource } from '../knowledge/ingestion.worker.js';
import { processCatalogImport } from '../knowledge/catalog-import.worker.js';

/**
 * Внутренние эндпоинты фоновой обработки для serverless-режима (Upstash QStash).
 * QStash с гарантией доставки и ретраями вызывает их, пробрасывая общий секрет в
 * заголовке x-job-secret. При ошибке отдаём 5xx — QStash повторит по своей политике.
 */
const router = Router();

// Machine-to-machine: доступ только с корректным общим секретом (задаётся JOB_SECRET).
router.use((req, res, next) => {
  if (!env.jobSecret) {
    logger.error('JOB_SECRET не задан — внутренние job-эндпоинты отключены');
    return res.status(503).json({ error: 'jobs disabled' });
  }
  if (req.get('x-job-secret') !== env.jobSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
});

router.post(
  '/ingestion',
  asyncHandler(async (req, res) => {
    logger.info({ data: req.body }, '[jobs] обрабатываю источник знаний (qstash)');
    await processKnowledgeSource(req.body || {});
    res.json({ ok: true });
  })
);

router.post(
  '/catalog-import',
  asyncHandler(async (req, res) => {
    logger.info({ data: req.body }, '[jobs] обрабатываю импорт каталога (qstash)');
    await processCatalogImport(req.body || {});
    res.json({ ok: true });
  })
);

export default router;

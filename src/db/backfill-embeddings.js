import { pool } from './pool.js';
import { embedTexts } from '../lib/llm/index.js';
import { enqueueKnowledgeIngestion } from '../lib/queue.js';
import { logger } from '../lib/logger.js';

function toVectorLiteral(embedding) {
  return `[${embedding.join(',')}]`;
}

async function getAgentApiKey(agentId) {
  const { rows } = await pool.query(
    'SELECT openai_api_key FROM agent_settings WHERE agent_id = $1',
    [agentId]
  );
  return rows[0]?.openai_api_key || null;
}

async function run() {
  logger.info('[backfill] Начинаю процесс восстановления эмбеддингов...');

  // === 1. Обработка Q&A ===
  logger.info('[backfill] Поиск Q&A пар без эмбеддингов...');
  const { rows: qaPairs } = await pool.query(
    'SELECT id, agent_id, question FROM agent_qa_pairs WHERE embedding IS NULL'
  );
  logger.info(`[backfill] Найдено Q&A пар без эмбеддингов: ${qaPairs.length}`);

  let qaSuccessCount = 0;
  for (const qa of qaPairs) {
    try {
      const apiKey = await getAgentApiKey(qa.agent_id);
      if (!apiKey) {
        logger.warn(`[backfill] [Q&A ${qa.id}] Для агента ${qa.agent_id} не настроен openai_api_key, пропускаю`);
        continue;
      }
      logger.info(`[backfill] [Q&A ${qa.id}] Генерация эмбеддинга для: "${qa.question.slice(0, 40)}..."`);
      const [embedding] = await embedTexts([qa.question], apiKey);
      await pool.query(
        'UPDATE agent_qa_pairs SET embedding = $1::vector, updated_at = now() WHERE id = $2',
        [toVectorLiteral(embedding), qa.id]
      );
      qaSuccessCount++;
    } catch (err) {
      logger.error({ err, qaId: qa.id }, `[backfill] Ошибка при обработке Q&A пары`);
    }
  }

  // === 2. Обработка товаров ===
  logger.info('[backfill] Поиск товаров из каталога без эмбеддингов...');
  const { rows: products } = await pool.query(
    'SELECT id, agent_id, name, description FROM agent_products WHERE embedding IS NULL'
  );
  logger.info(`[backfill] Найдено товаров без эмбеддингов: ${products.length}`);

  let productSuccessCount = 0;
  for (const prod of products) {
    try {
      const apiKey = await getAgentApiKey(prod.agent_id);
      if (!apiKey) {
        logger.warn(`[backfill] [Product ${prod.id}] Для агента ${prod.agent_id} не настроен openai_api_key, пропускаю`);
        continue;
      }
      logger.info(`[backfill] [Product ${prod.id}] Генерация эмбеддинга для: "${prod.name.slice(0, 40)}..."`);
      const textToEmbed = `${prod.name}. ${prod.description || ''}`.trim();
      const [embedding] = await embedTexts([textToEmbed], apiKey);
      await pool.query(
        'UPDATE agent_products SET embedding = $1::vector, updated_at = now() WHERE id = $2',
        [toVectorLiteral(embedding), prod.id]
      );
      productSuccessCount++;
    } catch (err) {
      logger.error({ err, productId: prod.id }, `[backfill] Ошибка при обработке товара`);
    }
  }

  // === 3. Обработка источников в статусе error ===
  logger.info('[backfill] Поиск упавших источников базы знаний...');
  const { rows: sources } = await pool.query(
    "SELECT id, agent_id, title FROM knowledge_sources WHERE status = 'error'"
  );
  logger.info(`[backfill] Найдено упавших источников: ${sources.length}`);

  let sourceSuccessCount = 0;
  for (const source of sources) {
    try {
      const apiKey = await getAgentApiKey(source.agent_id);
      if (!apiKey) {
        logger.warn(`[backfill] [Source ${source.id}] Для агента ${source.agent_id} не настроен openai_api_key, пропускаю`);
        continue;
      }
      logger.info(`[backfill] [Source ${source.id}] Сброс статуса в 'pending' для источника "${source.title}"`);
      await pool.query(
        "UPDATE knowledge_sources SET status = 'pending', error_message = NULL, updated_at = now() WHERE id = $1",
        [source.id]
      );

      try {
        await enqueueKnowledgeIngestion({ sourceId: source.id, agentId: source.agent_id });
        logger.info(`[backfill] [Source ${source.id}] Успешно добавлен в очередь на переобработку`);
      } catch (queueErr) {
        logger.warn({ err: queueErr }, `[backfill] [Source ${source.id}] Не удалось поставить в очередь BullMQ (возможно, Redis недоступен), статус 'pending' сохранён для следующего запуска воркера`);
      }
      sourceSuccessCount++;
    } catch (err) {
      logger.error({ err, sourceId: source.id }, `[backfill] Ошибка при обработке источника базы знаний`);
    }
  }

  logger.info(`[backfill] Процесс завершен! Результаты:
  - Успешно обновлено Q&A пар: ${qaSuccessCount}/${qaPairs.length}
  - Успешно обновлено товаров: ${productSuccessCount}/${products.length}
  - Сброшено и перезапущено источников знаний: ${sourceSuccessCount}/${sources.length}
  `);

  await pool.end();
}

run().catch((err) => {
  logger.error({ err }, '[backfill] Выполнение остановлено из-за ошибки');
  process.exit(1);
});

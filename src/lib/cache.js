import crypto from 'node:crypto';
import { redis } from './redis.js';
import { logger } from './logger.js';

const ANSWER_TTL_SECONDS = 60 * 60; // 1 час — как долго держим кэш ответа на повторяющийся вопрос

/**
 * Нормализация вопроса для семантического кэша: убираем регистр, пунктуацию и
 * повторяющиеся пробелы. Так «Сколько стоит доставка?» и «сколько стоит доставка»
 * дают один ключ и второй запрос отвечается из кэша (0 токенов на выход).
 */
function normalizeQuestion(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cacheKey(agentId, text) {
  const hash = crypto.createHash('sha1').update(normalizeQuestion(text)).digest('hex');
  return `qcache:${agentId}:${hash}`;
}

/** Возвращает закэшированный ответ ассистента на этот вопрос или null. */
export async function getCachedAnswer(agentId, text) {
  try {
    return await redis.get(cacheKey(agentId, text));
  } catch (err) {
    logger.warn({ err }, '[cache] чтение из Redis не удалось');
    return null;
  }
}

/** Кладёт ответ ассистента в кэш под нормализованный вопрос. */
export async function setCachedAnswer(agentId, text, answer) {
  if (!answer) return;
  try {
    await redis.set(cacheKey(agentId, text), answer, 'EX', ANSWER_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err }, '[cache] запись в Redis не удалась');
  }
}

export default { getCachedAnswer, setCachedAnswer };

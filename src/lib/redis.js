import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

// Общий клиент для кэша и rate-limit.
export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null,
});

redis.on('error', (err) => {
  logger.error({ err }, 'Ошибка подключения к Redis');
});

/**
 * BullMQ требует отдельное соединение с maxRetriesPerRequest: null для каждого Queue/Worker.
 * Используем фабрику, чтобы не шарить один и тот же клиент между Queue и обычным кэшем.
 */
export function createRedisConnection() {
  return new Redis(env.redisUrl, { maxRetriesPerRequest: null });
}

export default redis;

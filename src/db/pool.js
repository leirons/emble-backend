import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const { Pool } = pg;

// Managed-Postgres (Neon, Supabase, RDS и т.п.) требует TLS. Локальный docker-Postgres — нет.
// Включаем SSL для всех хостов, кроме localhost. rejectUnauthorized:false — провайдеры используют
// собственные CA, проверять цепочку в MVP не обязательно (соединение всё равно шифруется).
const isLocalDb = /@(localhost|127\.0\.0\.1)[:/]/.test(env.databaseUrl);

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  logger.error({ err }, 'Неожиданная ошибка в пуле подключений Postgres');
});

/**
 * Выполнить запрос через общий пул.
 * @param {string} text
 * @param {any[]} params
 */
export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 200) {
    logger.warn({ duration, text }, 'Медленный SQL-запрос');
  }
  return result;
}

/**
 * Выполнить серию запросов в транзакции.
 * @param {(client: pg.PoolClient) => Promise<any>} fn
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default { pool, query, withTransaction };

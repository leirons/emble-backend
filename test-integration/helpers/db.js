import { pool } from '../../src/db/pool.js';
import { redis } from '../../src/lib/redis.js';

// Разделяемый пул из приложения (сконфигурирован на тестовую БД через helpers/env.js).
export { pool };

export async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Очищает все данные между тестами. TRUNCATE organizations CASCADE каскадно вычищает
 * users, agents, agent_branding, widget_domains, conversations, messages, leads,
 * analytics_events, subscriptions и т.д. Справочная таблица plans (seed из миграции 001)
 * НЕ ссылается на organizations и переживает очистку — её данные нужны для регистрации.
 */
export async function resetDb() {
  await pool.query('TRUNCATE organizations RESTART IDENTITY CASCADE;');
}

export async function closeDb() {
  await pool.end();
}

/**
 * Закрывает все внешние соединения (Postgres pool + shared Redis client),
 * чтобы процесс тестового файла завершался чисто. Вызывать в after() каждого файла:
 * node --test запускает каждый файл в отдельном процессе, поэтому это безопасно.
 */
export async function closeAll() {
  await Promise.allSettled([pool.end(), redis.quit()]);
}

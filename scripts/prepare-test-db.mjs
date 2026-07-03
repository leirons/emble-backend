// Готовит эфемерную тестовую БД для интеграционных тестов:
//   1) DROP + CREATE базы (по умолчанию emble_test) на том же сервере Postgres;
//   2) применяет миграции через `node src/db/migrate.js`.
//
// Управляется переменной TEST_DATABASE_URL (по умолчанию postgres://emble:emble@localhost:5432/emble_test).
// НЕ использует ambient DATABASE_URL, чтобы случайно не пересоздать dev/prod базу.
//
// Запуск: node scripts/prepare-test-db.mjs   (вызывается из npm run test:integration)
import { spawnSync } from 'node:child_process';
import pg from 'pg';

const { Client } = pg;

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://emble:emble@localhost:5432/emble_test';

function parseDbName(url) {
  const u = new URL(url);
  return decodeURIComponent(u.pathname.replace(/^\//, ''));
}

function adminUrl(url) {
  // Подключаемся к служебной базе `postgres`, чтобы иметь право DROP/CREATE целевой БД.
  const u = new URL(url);
  u.pathname = '/postgres';
  return u.toString();
}

async function recreateDatabase() {
  const dbName = parseDbName(TEST_DATABASE_URL);
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error(`Небезопасное имя тестовой БД: ${dbName}`);
  }
  const client = new Client({ connectionString: adminUrl(TEST_DATABASE_URL) });
  await client.connect();
  try {
    // WITH (FORCE) обрывает активные подключения (Postgres 13+).
    await client.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE);`);
    await client.query(`CREATE DATABASE ${dbName};`);
    console.log(`[prepare-test-db] пересоздана база ${dbName}`);
  } finally {
    await client.end();
  }
}

function migrate() {
  console.log('[prepare-test-db] применяю миграции...');
  const res = spawnSync(process.execPath, ['src/db/migrate.js'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
  if (res.status !== 0) {
    throw new Error(`Миграции завершились с кодом ${res.status}`);
  }
}

try {
  await recreateDatabase();
  migrate();
  console.log('[prepare-test-db] тестовая БД готова');
} catch (err) {
  console.error('[prepare-test-db] ошибка:', err.message);
  process.exit(1);
}

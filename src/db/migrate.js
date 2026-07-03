import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { logger } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations() {
  const { rows } = await pool.query('SELECT name FROM _migrations ORDER BY name;');
  return new Set(rows.map((r) => r.name));
}

async function run() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      logger.info(`[migrate] пропуск ${file} (уже применена)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    logger.info(`[migrate] применяю ${file}...`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1);', [file]);
      await client.query('COMMIT');
      logger.info(`[migrate] ${file} применена`);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ err }, `[migrate] ошибка в ${file}`);
      throw err;
    } finally {
      client.release();
    }
  }

  logger.info('[migrate] все миграции применены');
  await pool.end();
}

run().catch((err) => {
  logger.error({ err }, '[migrate] выполнение остановлено из-за ошибки');
  process.exit(1);
});

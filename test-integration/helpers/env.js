// Устанавливает окружение ДО импорта любого модуля, читающего src/config/env.js
// (в первую очередь src/db/pool.js). Каждый интеграционный тест ОБЯЗАН импортировать
// этот файл ПЕРВОЙ строкой, иначе pool создастся с ambient DATABASE_URL.
//
// Намеренно НЕ наследуем ambient DATABASE_URL: тесты вызывают TRUNCATE, и указание на
// dev/prod базу привело бы к потере данных. Только TEST_DATABASE_URL или локальный emble_test.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://emble:emble@localhost:5432/emble_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
// Отключаем шумные логи в тестовом прогоне.
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';

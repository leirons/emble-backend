import app from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

// Точка входа процесса API. Конфигурация приложения живёт в app.js,
// чтобы её можно было импортировать в тестах без запуска listen().
app.listen(env.port, () => {
  logger.info(`Emble API запущен на порту ${env.port} (${env.nodeEnv})`);
});

export default app;

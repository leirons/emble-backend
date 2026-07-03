import pino from 'pino';
import { env } from '../config/env.js';

const isTest = env.nodeEnv === 'test';

export const logger = pino({
  // В тестах глушим логи (level: 'silent') и не поднимаем pino-pretty transport —
  // иначе worker-поток транспорта шумит в выводе и может держать процесс открытым.
  level: isTest ? 'silent' : env.nodeEnv === 'production' ? 'info' : 'debug',
  transport:
    env.nodeEnv === 'production' || isTest
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
});

export default logger;

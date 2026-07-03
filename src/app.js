import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { dashboardRateLimit } from './middleware/rateLimit.js';

import authRoutes from './modules/auth/auth.routes.js';
import organizationsRoutes from './modules/organizations/organizations.routes.js';
import agentsRoutes from './modules/agents/agents.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import webhooksRoutes from './modules/billing/webhooks.routes.js';
import widgetRoutes from './modules/widget/widget.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Собирает и настраивает Express-приложение без вызова listen().
 * Вынесено из index.js, чтобы интеграционные тесты могли поднять сервер
 * на эфемерном порту (см. test/integration/helpers/server.js) без сайд-эффектов.
 */
export function createApp() {
  const app = express();

  // За обратным прокси (Vercel/Cloudflare/nginx) реальный IP клиента приходит в X-Forwarded-For.
  // Доверяем одному ближайшему прокси, чтобы express-rate-limit корректно определял пользователя по IP.
  // '1' (а не 'true') — намеренно: 'true' доверяет всей цепочке и позволяет подделать IP через заголовок.
  app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: false })); // false — embed.js должен грузиться с любого домена клиента
  app.use(pinoHttp({ logger }));

  // Stripe webhook требует raw body — регистрируем ДО express.json().
  app.use('/webhooks', webhooksRoutes);

  app.use(express.json({ limit: '1mb' }));

  // Статика: embed.js и демо-страница отдаются публично, без CORS-ограничений (это <script src>, не fetch/XHR).
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/health', (req, res) => res.json({ ok: true, env: env.nodeEnv }));

  // --- Dashboard API (приложение управления, отдельный фронтенд) ---
  const dashboardCors = cors({ origin: env.dashboardOrigin, credentials: false });
  app.use('/auth', dashboardCors, dashboardRateLimit, authRoutes);
  app.use('/organizations', dashboardCors, dashboardRateLimit, organizationsRoutes);
  app.use('/agents', dashboardCors, dashboardRateLimit, agentsRoutes);
  app.use('/billing', dashboardCors, dashboardRateLimit, billingRoutes);

  // --- Public Widget API (встраивается на сайты клиентов, CORS проверяется по whitelist агента) ---
  app.use('/widget', widgetRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// Готовое приложение — используется index.js (listen) и интеграционными тестами (импорт без listen).
const app = createApp();

export default app;

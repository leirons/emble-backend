import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../lib/redis.js';

function redisStore(prefix) {
  return new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: `rl:${prefix}:`,
  });
}

// Дашборд API (авторизованные пользователи) — щадящий общий лимит от брутфорса/абьюза.
export const dashboardRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('dashboard'),
});

// Логин/регистрация — жёстче, чтобы затруднить перебор паролей.
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('auth'),
  // Нормализуем email (lowercase+trim), иначе `User@x.com` и `user@x.com` дают разные ключи —
  // перебор пароля по одному аккаунту обходил бы лимит вариацией регистра (ACM-18 L2).
  keyGenerator: (req) => `${req.ip}:${(req.body?.email || '').toLowerCase().trim()}`,
});

// Публичный Widget API — лимит на агента, чтобы один встроенный виджет
// не мог исчерпать бюджет LLM-токенов организации спамом.
export const widgetRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('widget'),
  keyGenerator: (req) => `${req.params.agentSlug}:${req.ip}`,
});

export default { dashboardRateLimit, authRateLimit, widgetRateLimit };

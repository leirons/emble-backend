import { verifyAccessToken } from '../lib/jwt.js';
import { unauthorized, forbidden } from '../lib/errors.js';

/**
 * Требует валидный access-токен в заголовке Authorization: Bearer <token>.
 * Кладёт в req.auth = { userId, orgId, role }.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(unauthorized('Отсутствует или некорректный токен авторизации'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = { userId: payload.sub, orgId: payload.orgId, role: payload.role };
    next();
  } catch (err) {
    next(unauthorized('Недействительный или истёкший токен'));
  }
}

/**
 * Ограничивает доступ по ролям. Использовать после requireAuth.
 * @param  {...('owner'|'admin'|'member')} roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.role)) return next(forbidden('Недостаточно прав'));
    next();
  };
}

export default { requireAuth, requireRole };

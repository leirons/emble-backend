import { getAgentBySlug, listWidgetDomains } from '../modules/agents/agents.repo.js';
import { notFound, forbidden } from '../lib/errors.js';
import { extractHost, isOriginAllowed } from '../lib/widgetOrigin.js';

/**
 * Резолвит агента по :agentSlug из URL и кладёт в req.agent.
 * Публикация должна быть выполнена (status = published), иначе 404 —
 * чтобы не палить существование черновиков наружу.
 */
export async function resolveAgentBySlug(req, res, next) {
  try {
    const agent = await getAgentBySlug(req.params.agentSlug);
    if (!agent || agent.status !== 'published') {
      return next(notFound('Агент не найден или не опубликован'));
    }
    req.agent = agent;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Проверяет, что Origin/Referer запроса входит в whitelist доменов агента,
 * и выставляет CORS-заголовки под этот origin (виджет работает с любого домена клиента,
 * но только из разрешённого списка — а не '*').
 * Если whitelist пуст — считаем, что агент ещё не привязан к домену, и разрешаем
 * запросы без Origin (например, curl/Postman при тестировании) но не браузерные cross-site.
 */
export async function checkWidgetOrigin(req, res, next) {
  try {
    const origin = req.headers.origin;
    const host = extractHost(origin) || extractHost(req.headers.referer);

    const domains = await listWidgetDomains(req.agent.id);
    const allowed = domains.map((d) => d.domain);

    if (!isOriginAllowed(host, allowed)) {
      return next(forbidden('Домен не входит в список разрешённых для этого агента'));
    }

    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'false');
    }
    next();
  } catch (err) {
    next(err);
  }
}

export default { resolveAgentBySlug, checkWidgetOrigin };

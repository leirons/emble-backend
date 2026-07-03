// Чистые (без БД) хелперы для проверки Origin/Referer виджета по whitelist доменов.
// Вынесены из middleware/widgetContext.js, чтобы логику сопоставления доменов
// можно было покрыть юнит-тестами без обращения к базе.

/**
 * Достаёт hostname из строки Origin/Referer. Возвращает null, если строку
 * нельзя разобрать как URL (или она пустая).
 * @param {string|undefined|null} originOrReferer
 * @returns {string|null}
 */
export function extractHost(originOrReferer) {
  if (!originOrReferer) return null;
  try {
    return new URL(originOrReferer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Совпадает ли host с доменом из whitelist. Домен покрывает сам себя и все
 * поддомены (example.com → shop.example.com), но не другие домены.
 * @param {string|null} host
 * @param {string|null} domain
 * @returns {boolean}
 */
export function hostMatchesDomain(host, domain) {
  if (!host || !domain) return false;
  const d = domain.toLowerCase();
  return host === d || host.endsWith(`.${d}`);
}

/**
 * Разрешён ли запрос виджета с данного host по списку доменов агента.
 * Пустой whitelist трактуется как «домен ещё не настроен» — разрешаем на время
 * интеграции. '*' в списке разрешает любой домен.
 * @param {string|null} host
 * @param {string[]} allowedDomains
 * @returns {boolean}
 */
export function isOriginAllowed(host, allowedDomains) {
  if (!Array.isArray(allowedDomains) || allowedDomains.length === 0) return true;
  if (!host) return false;
  return allowedDomains.includes('*') || allowedDomains.some((d) => hostMatchesDomain(host, d));
}

export default { extractHost, hostMatchesDomain, isOriginAllowed };

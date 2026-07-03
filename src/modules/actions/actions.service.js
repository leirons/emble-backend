import { v4 as uuid } from 'uuid';
import * as actionsRepo from './actions.repo.js';
import * as agentsRepo from '../agents/agents.repo.js';
import { notFound } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

const TIMEOUT_MS = 8000;
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

async function assertAgentOwnership(orgId, agentId) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  return agent;
}

// --- Dashboard CRUD ---

export async function createAction(orgId, agentId, input) {
  await assertAgentOwnership(orgId, agentId);
  return actionsRepo.insertAction({ id: uuid(), agentId, ...input });
}

export async function listActions(orgId, agentId) {
  await assertAgentOwnership(orgId, agentId);
  return actionsRepo.listActionsByAgent(agentId);
}

export async function updateAction(orgId, agentId, actionId, input) {
  await assertAgentOwnership(orgId, agentId);
  const action = await actionsRepo.updateAction(actionId, agentId, input);
  if (!action) throw notFound('Действие не найдено');
  return action;
}

export async function deleteAction(orgId, agentId, actionId) {
  await assertAgentOwnership(orgId, agentId);
  await actionsRepo.deleteAction(actionId, agentId);
}

export async function listActionLogs(orgId, agentId, actionId) {
  await assertAgentOwnership(orgId, agentId);
  const action = await actionsRepo.getActionById(actionId, agentId);
  if (!action) throw notFound('Действие не найдено');
  return actionsRepo.listActionLogs(actionId, 20);
}

/**
 * Пробный запуск действия из дашборда: рендерит тело шаблоном (с тестовыми переменными),
 * реально бьёт по URL и возвращает статус/тело ответа. Логи агента не засоряет.
 */
export async function testAction(orgId, agentId, input) {
  await assertAgentOwnership(orgId, agentId);
  const spec = {
    id: 'test',
    method: input.method || 'POST',
    url: input.url,
    headers: input.headers || {},
    bodyTemplate: input.bodyTemplate || {},
  };
  if (!spec.url) throw notFound('Не указан URL для теста');

  const body = renderTemplate(spec.bodyTemplate, input.variables || {});
  let status = null;
  let ok = false;
  let responseText = '';
  const startedAt = Date.now();
  try {
    const res = await fetch(spec.url, {
      method: spec.method,
      headers: { 'Content-Type': 'application/json', ...spec.headers },
      body: spec.method === 'GET' ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    status = res.status;
    ok = res.ok;
    responseText = (await res.text().catch(() => '')).slice(0, 2000);
  } catch (err) {
    responseText = `Ошибка запроса: ${err instanceof Error ? err.message : String(err)}`;
  }
  return { ok, status, sentBody: body, response: responseText, durationMs: Date.now() - startedAt };
}

// --- Выполнение (внутренний путь, вызывается из chat.service.js / leads.service.js) ---

function resolvePath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function renderTemplate(value, vars) {
  if (typeof value === 'string') {
    return value.replace(PLACEHOLDER_RE, (_, path) => {
      const v = resolvePath(vars, path);
      return v === undefined || v === null ? '' : String(v);
    });
  }
  if (Array.isArray(value)) return value.map((v) => renderTemplate(v, vars));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = renderTemplate(v, vars);
    return out;
  }
  return value;
}

/**
 * Выполняет вебхук custom action: рендерит body_template плейсхолдерами {{path.to.value}},
 * шлёт HTTP-запрос с таймаутом, логирует результат в agent_action_logs.
 * Никогда не бросает исключение наружу — падение клиентского вебхука не должно ронять чат.
 * @param {object} action - строка agent_actions
 * @param {object} vars - переменные для подстановки в body_template
 * @param {{ conversationId?: string }} ctx
 * @returns {Promise<{ok: boolean, status: number|null, snippet: string|null}>}
 */
export async function executeCustomAction(action, vars, { conversationId } = {}) {
  const body = renderTemplate(action.bodyTemplate || {}, vars || {});
  let responseStatus = null;
  let responseSnippet = null;
  let success = false;

  try {
    const res = await fetch(action.url, {
      method: action.method || 'POST',
      headers: { 'Content-Type': 'application/json', ...(action.headers || {}) },
      body: action.method === 'GET' ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    responseStatus = res.status;
    success = res.ok;
    const text = await res.text().catch(() => '');
    responseSnippet = text.slice(0, 500);
  } catch (err) {
    responseSnippet = `Ошибка запроса: ${err instanceof Error ? err.message : String(err)}`;
    logger.warn({ err, actionId: action.id }, '[actions] custom action завершилось с ошибкой');
  }

  await actionsRepo
    .insertActionLog({
      id: uuid(),
      actionId: action.id,
      conversationId,
      requestBody: body,
      responseStatus,
      responseSnippet,
      success,
    })
    .catch((err) => logger.error({ err }, '[actions] не удалось записать лог действия'));

  return { ok: success, status: responseStatus, snippet: responseSnippet };
}

/**
 * Находит и запускает все event-triggered actions агента для данного события.
 * Специально не бросает исключения и рассчитан на fire-and-forget вызов
 * (вызывающий код не обязан await'ить, чтобы не задерживать ответ пользователю).
 */
export async function dispatchEventActions(agentId, eventName, payload) {
  let actions = [];
  try {
    actions = await actionsRepo.listActionsForEvent(agentId, eventName);
  } catch (err) {
    logger.error({ err, agentId, eventName }, '[actions] не удалось получить список event-actions');
    return;
  }
  await Promise.all(
    actions.map((action) => executeCustomAction(action, { event: eventName, ...payload }, {}).catch(() => {}))
  );
}

export default {
  createAction,
  listActions,
  updateAction,
  deleteAction,
  listActionLogs,
  testAction,
  executeCustomAction,
  dispatchEventActions,
};

import { getBranding, getOrCreateSettings } from '../agents/agents.repo.js';
import { getOrStartConversation, handleUserMessage } from '../chat/chat.service.js';
import { getActiveFlow } from '../flows/flows.repo.js';
import { advanceConversationFlow } from '../flows/flows.service.js';
import { setFeedback } from '../chat/messages.repo.js';
import { getConversationForAgent } from '../chat/conversations.repo.js';
import { listQaPairsByAgent } from '../knowledge/qa.repo.js';
import { captureLead } from '../leads/leads.service.js';
import { logEvent, EVENT_TYPES } from '../analytics/analytics.service.js';
import { assertWithinMessageLimit } from '../usage/usage.service.js';
import { captureLeadSchema } from '../leads/leads.schema.js';
import { AppError } from '../../lib/errors.js';
import { createSSEChannel } from '../../lib/sse.js';
import { logger } from '../../lib/logger.js';

const FAQ_LIMIT = 20;

export async function getConfig(req, res) {
  const agent = req.agent;
  const [branding, settings, activeFlow] = await Promise.all([
    getBranding(agent.id),
    getOrCreateSettings(agent.id).catch(() => null),
    getActiveFlow(agent.id).catch(() => null),
  ]);
  await logEvent(agent.id, EVENT_TYPES.WIDGET_LOADED, {});

  const startMenu = (branding && branding.startMenu) || { enabled: false, items: [] };

  // Если в стартовом меню есть элемент FAQ — отдаём Q&A пары (вопрос+ответ) для мгновенного показа.
  let faq = [];
  const hasFaqItem = startMenu.enabled && (startMenu.items || []).some((it) => it.type === 'faq');
  if (hasFaqItem) {
    const pairs = await listQaPairsByAgent(agent.id).catch(() => []);
    faq = pairs.slice(0, FAQ_LIMIT).map((p) => ({ question: p.question, answer: p.answer }));
  }

  res.json({
    agent: { slug: agent.publicSlug, name: agent.name, type: agent.type },
    branding: branding || {},
    hasStartFlow: !!activeFlow,
    startMenu,
    faq,
    settings: settings
      ? {
          proactiveEnabled: settings.proactiveEnabled,
          proactiveMessage: settings.proactiveMessage,
          proactiveDelaySeconds: settings.proactiveDelaySeconds,
          emailFallbackEnabled: settings.emailFallbackEnabled,
          // Тип контакта для формы захвата лида: 'email' | 'phone'.
          leadContactType: settings.leadContactType,
          // Сбор email при эскалации на оператора.
          enableEmailOnEscalation: settings.enableEmailOnEscalation,
          escalationEmailMessage: settings.escalationEmailMessage,
          // Персонализация приветствия (решение принимается на стороне браузера по localStorage).
          enableReturningGreeting: settings.enableReturningGreeting,
          greetingNew: settings.greetingNew,
          greetingReturning: settings.greetingReturning,
        }
      : {},
  });
}

export async function startConversation(req, res) {
  const conversation = await getOrStartConversation(req.agent, req.body.visitorId);
  res.status(201).json({ conversationId: conversation.id, status: conversation.status });
}

/**
 * Отправка сообщения со стримингом ответа через Server-Sent Events.
 * Клиент (embed.js) открывает соединение и рендерит текст по мере поступления дельт.
 */
export async function sendMessage(req, res) {
  const agent = req.agent;

  // Проверка лимита тарифа. Настоящее превышение (AppError 429) блокирует ответ.
  // Но сбой самой проверки (например, кратковременная недоступность Б-биллинга) НЕ должен
  // ронять чат на сайте клиента — в этом случае «фейлим открыто» и пропускаем сообщение,
  // чтобы бэкенд-сбой никогда не ломал host-страницу. Перерасход по краю логируем для ревью.
  try {
    await assertWithinMessageLimit(agent.orgId);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode || 429).json({ error: { message: err.message } });
      return;
    }
    logger.error({ err, orgId: agent.orgId }, 'Проверка лимита сообщений упала — пропускаем сообщение (fail-open)');
  }

  const channel = createSSEChannel(req, res);

  try {
    const { assistantMessage, escalated, products } = await handleUserMessage({
      agent,
      orgId: agent.orgId,
      conversationId: req.params.conversationId,
      userText: req.body.text,
      onDelta: (delta) => channel.send('delta', { text: delta }),
    });
    if (escalated) channel.send('escalated', {});
    // Товары-рекомендации: виджет отрисует их карточками под ответом ассистента.
    if (products && products.length) channel.send('products', { products });
    channel.send('done', { messageId: assistantMessage.id });
  } catch (err) {
    logger.error({ err }, 'Ошибка при обработке сообщения виджета');
    channel.send('error', { message: 'Не удалось получить ответ ассистента. Попробуйте ещё раз.' });
  } finally {
    channel.close();
  }
}

/** Пошаговое прохождение активного сценария (веток) — без обращения к LLM. */
export async function advanceFlow(req, res) {
  const result = await advanceConversationFlow(req.agent, req.params.conversationId, req.body.stepId);
  res.json(result);
}

export async function submitFeedback(req, res) {
  // Проверяем, что диалог принадлежит агенту из контекста запроса (как в sendMessage): без этого
  // валидный виджет одного агента мог бы проставлять feedback на сообщения чужого диалога (ACM-18 M3).
  const conversation = await getConversationForAgent(req.params.conversationId, req.agent.id);
  if (!conversation) {
    return res.status(404).json({ error: { message: 'Диалог не найден' } });
  }
  const message = await setFeedback(req.params.messageId, req.params.conversationId, req.body.rating);
  if (!message) {
    return res.status(404).json({ error: { message: 'Сообщение не найдено' } });
  }
  res.json({ message });
}

/** Публичный приём клиентских событий виджета (widget_loaded/opened, trigger_fired, feedback_given). */
export async function trackEvent(req, res) {
  const { type, sessionId, conversationId, payload } = req.body;
  await logEvent(req.agent.id, type, { conversationId, sessionId, payload }).catch(() => {});
  res.status(204).send();
}

export async function submitLead(req, res) {
  const parsed = captureLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { message: 'Ошибка валидации', details: parsed.error.flatten() } });
  }
  const lead = await captureLead(req.agent.id, parsed.data);
  res.status(201).json({ lead });
}

export default { getConfig, startConversation, sendMessage, advanceFlow, submitFeedback, trackEvent, submitLead };

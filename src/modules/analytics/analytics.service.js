import { v4 as uuid } from 'uuid';
import * as analyticsRepo from './analytics.repo.js';
import * as agentsRepo from '../agents/agents.repo.js';
import { notFound } from '../../lib/errors.js';

export const EVENT_TYPES = {
  WIDGET_LOADED: 'widget_loaded',
  WIDGET_OPENED: 'widget_opened',
  CHAT_STARTED: 'chat_started',
  MESSAGE_SENT: 'message_sent',
  QUICK_REPLY_CLICKED: 'quick_reply_clicked',
  TRIGGER_FIRED: 'trigger_fired',
  LEAD_CAPTURED: 'lead_captured',
  UNANSWERED_QUESTION: 'unanswered_question',
  CONVERSATION_ESCALATED: 'conversation_escalated',
  ESCALATION_REQUESTED: 'escalation_requested',
  EMAIL_FALLBACK_CAPTURED: 'email_fallback_captured',
  FEEDBACK_GIVEN: 'feedback_given',
  PRODUCT_RECOMMENDED: 'product_recommended',
  FLOW_STARTED: 'flow_started',
  ACTION_TRIGGERED: 'action_triggered',
};

export async function logEvent(agentId, eventType, { conversationId, sessionId, payload } = {}) {
  await analyticsRepo.insertEvent({ id: uuid(), agentId, conversationId, sessionId, eventType, payload });
}

/** Фиксирует неотвеченный вопрос: событие для метрик + строку в таблицу для управления. */
export async function recordUnanswered(agentId, question, conversationId) {
  await logEvent(agentId, EVENT_TYPES.UNANSWERED_QUESTION, { conversationId, payload: { question } }).catch(() => {});
  await analyticsRepo.insertUnanswered({ id: uuid(), agentId, question, conversationId }).catch(() => {});
}

const MINUTES_PER_DIALOG = 5; // среднее время обработки диалога живым оператором

const TRIGGER_LABELS = {
  manual_click: 'Кликнули вручную',
  exit_intent: 'Exit-Intent (Удержание)',
  timer_20m: 'Проактивное сообщение',
  unknown: 'Другое',
};

// Тематические категории вопросов (без LLM): сообщение относится к теме, если содержит
// одно из ключевых слов. Так блок «О чём спрашивают» наполняется по частоте тем.
const TOPIC_CATEGORIES = [
  { name: 'Доставка', kw: ['достав', 'отправк', 'отправ', 'курьер', 'почт', 'самовывоз', 'привез', 'приедет', 'логист', 'посылк'] },
  { name: 'Оплата', kw: ['оплат', 'платёж', 'платеж', 'картой', 'налич', 'рассрочк', 'кредит', 'счёт', 'счет', 'предоплат'] },
  { name: 'Возврат и обмен', kw: ['возврат', 'вернуть', 'верну', 'обмен', 'поменя', 'гаранти', 'брак', 'не подош'] },
  { name: 'Цена и скидки', kw: ['цена', 'цены', 'стоит', 'стоимост', 'сколько', 'скидк', 'акци', 'дешевле', 'дорого', 'прайс'] },
  { name: 'Размеры и характеристики', kw: ['размер', 'пошив', 'ткан', 'материал', 'состав', 'цвет', 'оттен', 'габарит', 'вес', 'длин', 'ширин'] },
  { name: 'Наличие', kw: ['налич', 'в наличии', 'есть ли', 'осталось', 'остал', 'закончил', 'когда будет', 'под заказ'] },
  { name: 'Ассортимент', kw: ['каталог', 'ассортимент', 'модел', 'какие есть', 'что есть', 'выбор', 'посовет', 'порекоменд', 'подобрать'] },
  { name: 'О компании', kw: ['компани', 'о вас', 'кто вы', 'адрес', 'где вы', 'график', 'режим работы', 'контакт', 'телефон'] },
  { name: 'Уход за изделием', kw: ['уход', 'стирк', 'стирать', 'глад', 'чист', 'хранен'] },
];

/** Тематический анализ вопросов пользователей без LLM: топ-5 тем в процентах. */
function computeTopics(texts) {
  const counts = new Map();
  for (const raw of texts) {
    const t = String(raw || '').toLowerCase();
    if (!t.trim()) continue;
    for (const cat of TOPIC_CATEGORIES) {
      if (cat.kw.some((k) => t.includes(k))) {
        counts.set(cat.name, (counts.get(cat.name) || 0) + 1);
      }
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const total = sorted.reduce((s, [, c]) => s + c, 0);
  if (total === 0) return [];
  return sorted.map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }));
}

export async function getSummary(orgId, agentId, days = 30) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [funnel, widgetOpened, leadsCount, messages, feedback, triggers, topProducts, unanswered, questionTexts] =
    await Promise.all([
      analyticsRepo.funnelBySession(agentId, since),
      analyticsRepo.countEventType(agentId, since, EVENT_TYPES.WIDGET_OPENED),
      analyticsRepo.countLeads(agentId, since),
      analyticsRepo.countMessages(agentId, since),
      analyticsRepo.countFeedback(agentId, since),
      analyticsRepo.triggersBreakdown(agentId, since),
      analyticsRepo.topRecommendedProducts(agentId, since, 5),
      analyticsRepo.listOpenUnanswered(agentId, 30),
      analyticsRepo.listUserMessageTexts(agentId, since, 2000),
    ]);
  const topics = computeTopics(questionTexts);

  // «Диалог» = каждое открытие чата (событие widget_opened), а не только диалоги с сообщением.
  const dialogs = widgetOpened;
  const escalated = funnel.escalated;
  const closedByAi = Math.max(0, dialogs - escalated);

  // Блок 2 — сэкономленное время
  const savedMinutes = closedByAi * MINUTES_PER_DIALOG;
  const savedHours = Math.round(savedMinutes / 60);
  const savedText =
    savedMinutes > 60
      ? `ИИ сэкономил вашим операторам ${savedHours} ${plural(savedHours, 'час', 'часа', 'часов')} работы за период`
      : `ИИ обработал ${closedByAi} ${plural(closedByAi, 'диалог', 'диалога', 'диалогов')} без участия оператора`;

  // Блок 4 — resolution rate
  const aiPct = dialogs > 0 ? Math.round((closedByAi / dialogs) * 100) : 0;

  return {
    periodDays: days,
    // Блок 1
    conversations: dialogs, // «Диалогов»
    messages,
    leads: leadsCount,
    widgetOpened,
    feedback,
    // Блок 2
    savedTime: { closedByAi, minutes: savedMinutes, hours: savedHours, text: savedText },
    // Блок 3
    funnel: {
      loaded: funnel.loaded,
      opened: funnel.opened,
      chatStarted: funnel.chatStarted,
      openRate: funnel.loaded > 0 ? +((funnel.opened / funnel.loaded) * 100).toFixed(1) : 0,
      chatRate: funnel.opened > 0 ? +((funnel.chatStarted / funnel.opened) * 100).toFixed(1) : 0,
    },
    triggers: triggers.map((t) => ({ id: t.id, label: TRIGGER_LABELS[t.id] || t.id, count: t.count })),
    // Блок 4
    resolution: { aiPct, transferPct: 100 - aiPct },
    // Блок 5 — темы вопросов (по ключевым словам) + топ товаров
    topics,
    topProducts: topProducts.map((p) => ({ name: p.name, count: p.count })),
    // Блок 7
    unansweredQuestions: unanswered,
  };
}

function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export async function resolveUnansweredQuestion(orgId, agentId, questionId) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  const updated = await analyticsRepo.resolveUnanswered(questionId, agentId);
  return { resolved: updated > 0 };
}

export default { EVENT_TYPES, logEvent, recordUnanswered, getSummary, resolveUnansweredQuestion };

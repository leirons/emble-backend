import { v4 as uuid } from 'uuid';
import * as conversationsRepo from './conversations.repo.js';
import * as messagesRepo from './messages.repo.js';
import * as knowledgeRepo from '../knowledge/knowledge.repo.js';
import * as qaRepo from '../knowledge/qa.repo.js';
import * as catalogRepo from '../knowledge/catalog.repo.js';
import * as actionsRepo from '../actions/actions.repo.js';
import * as actionsService from '../actions/actions.service.js';
import * as agentsRepo from '../agents/agents.repo.js';
import { embedTexts, streamChatCompletion } from '../../lib/llm/index.js';
import { getCachedAnswer, setCachedAnswer } from '../../lib/cache.js';
import { recordMessageUsage } from '../usage/usage.service.js';
import { logEvent, EVENT_TYPES, recordUnanswered } from '../analytics/analytics.service.js';
import { notFound } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';
import {
  estimateTokens,
  parsePriceConstraint,
  filterByPrice,
  formatProductRecommendation,
  buildSystemPrompt,
  checkEscalation,
} from './chat.logic.js';

// Есть ли на сервере хоть какой-то LLM-провайдер (кроме BYOK-ключа агента).
const SERVER_HAS_LLM = !!(env.llm.openai.apiKey || env.llm.anthropic.apiKey);

// Оптимизация стоимости токенов: не более 4 самых релевантных чанков во входном контексте.
const RAG_TOP_K = 4;
const QA_TOP_K = 3;
const PRODUCT_TOP_K = 3;
const RAG_LOW_CONFIDENCE_THRESHOLD = 0.55;
const QA_CONTEXT_THRESHOLD = 0.75; // ниже — Q&A не считается релевантной, не подмешиваем в промпт
const QA_SHORTCUT_THRESHOLD = 0.95; // >0.95 — отдаём готовый ответ, полностью минуя генерацию LLM
const PRODUCT_CONTEXT_THRESHOLD = 0.5; // товары советуем охотнее: порог мягче, чтобы каталог реально подсказывал
const HISTORY_LIMIT = 10;
const MAX_TOOL_ITERATIONS = 3; // защита от зацикливания function calling

/** Находит открытый диалог посетителя или создаёт новый. */
export async function getOrStartConversation(agent, visitorId) {
  const existing = await conversationsRepo.findOpenConversation(agent.id, visitorId);
  if (existing) return existing;
  const conversation = await conversationsRepo.insertConversation({ id: uuid(), agentId: agent.id, visitorId });
  void actionsService.dispatchEventActions(agent.id, 'conversation_started', { visitorId, conversationId: conversation.id });
  return conversation;
}

/**
 * Агентный цикл со стримингом: гоняет streamChatCompletion, пока модель вызывает function calling
 * (custom actions), исполняет каждый вызов через executeCustomAction и скармливает результат обратно
 * модели как обычное сообщение (упрощённо, без родных tool_calls/tool_result блоков провайдеров —
 * этого достаточно, чтобы модель могла корректно продолжить ответ пользователю).
 */
async function runToolLoop({ agent, systemPrompt, history, tools, conversationId, apiKey, onDelta }) {
  let fullText = '';
  let workingHistory = history;
  let iterations = 0;
  let toolWasCalled = false;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations += 1;
    const toolCalls = [];
    let roundText = '';

    for await (const event of streamChatCompletion({
      provider: agent.modelProvider,
      model: agent.modelName,
      systemPrompt,
      history: workingHistory,
      tools: tools.length ? tools : undefined,
      apiKey,
      // Как только клиент увидел любой текст (в этом или прошлом раунде tool-loop),
      // fallback на второго провайдера склеил бы ответы — запрещаем его (ACM-17).
      allowFallback: fullText.length === 0,
    })) {
      if (event.type === 'delta') {
        roundText += event.text;
        fullText += event.text;
        onDelta(event.text);
      } else if (event.type === 'tool_call') {
        toolCalls.push(event);
      }
    }

    if (toolCalls.length === 0) break;
    toolWasCalled = true;

    workingHistory = [
      ...workingHistory,
      { role: 'assistant', content: roundText || `Вызываю: ${toolCalls.map((t) => t.name).join(', ')}` },
    ];

    for (const call of toolCalls) {
      const tool = tools.find((t) => t.name === call.name);
      let resultText;
      if (!tool) {
        resultText = `Функция "${call.name}" не найдена.`;
      } else {
        const result = await actionsService.executeCustomAction(tool._action, call.arguments, { conversationId });
        resultText = result.ok
          ? `Запрос выполнен успешно (HTTP ${result.status}).`
          : `Запрос завершился ошибкой (HTTP ${result.status ?? '—'}): ${result.snippet || 'нет деталей'}.`;
        await logEvent(agent.id, EVENT_TYPES.ACTION_TRIGGERED, {
          conversationId,
          payload: { actionName: call.name, ok: result.ok },
        }).catch(() => {});
      }
      workingHistory = [...workingHistory, { role: 'user', content: `[Результат вызова ${call.name}]: ${resultText}` }];
    }
  }

  return { fullText, toolWasCalled };
}

/**
 * Обрабатывает входящее сообщение пользователя: короткий путь через Q&A, RAG-поиск (знания +
 * каталог товаров), стриминг ответа LLM с function calling, эскалация на человека, персистентность
 * сообщений и учёт расхода (usage). Пишет текстовые дельты через onDelta.
 *
 * @param {object} params
 * @param {object} params.agent - агент (из req.agent, публичный API)
 * @param {string} params.orgId - org_id владельца агента, для метеринга биллинга
 * @param {string} params.conversationId
 * @param {string} params.userText
 * @param {(delta: string) => void} params.onDelta
 * @returns {Promise<{ assistantMessage: object, userMessage: object, escalated: boolean }>}
 */
export async function handleUserMessage({ agent, orgId, conversationId, userText, onDelta: emitDelta }) {
  // Отмечаем, что клиенту уже ушёл хоть один кусок текста. После этого нельзя
  // дописывать резервный ответ (каталог/эскалация/другой провайдер) — он склеится
  // с показанным и получится дублированный/битый ответ (ACM-17).
  let streamedAny = false;
  const onDelta = (text) => {
    streamedAny = true;
    emitDelta(text);
  };

  const conversation = await conversationsRepo.getConversationForAgent(conversationId, agent.id);
  if (!conversation) throw notFound('Диалог не найден');

  const userMessage = await messagesRepo.insertMessage({
    id: uuid(),
    conversationId,
    role: 'user',
    content: userText,
    tokensUsed: estimateTokens(userText),
  });

  const sessionId = conversation.visitorId;
  await logEvent(agent.id, EVENT_TYPES.MESSAGE_SENT, { conversationId, sessionId, payload: { role: 'user' } });

  // Первое сообщение пользователя = старт диалога (для воронки/метрик).
  const userMsgCount = await messagesRepo.countUserMessages(conversationId).catch(() => 0);
  if (userMsgCount === 1) {
    await logEvent(agent.id, EVENT_TYPES.CHAT_STARTED, { conversationId, sessionId }).catch(() => {});
  }

  const settings = await agentsRepo.getOrCreateSettings(agent.id).catch((err) => {
    logger.warn({ err, agentId: agent.id }, 'не удалось загрузить agent_settings, используются дефолты чата');
    return null;
  });

  const apiKey = settings?.openaiApiKey || undefined; // BYOK: ключ агента, если задан

  // === Шаг 1 (иерархия retrieval): точное совпадение Q&A — минуем и эмбеддинг, и LLM ===
  const exactQa = await qaRepo.findExactQa(agent.id, userText).catch(() => null);

  let fullText;
  let usedShortcut = false;
  let contextChunks = [];
  let qaMatches = [];
  let productMatches = [];

  if (exactQa) {
    usedShortcut = true;
    fullText = exactQa.answer;
    onDelta(fullText);
  }

  // === Семантический кэш: повторный вопрос отвечается из Redis (0 токенов) ===
  // Только когда у агента нет LLM-инструментов (иначе кэш подменил бы побочные эффекты вызова API).
  const llmActions = usedShortcut ? [] : await actionsRepo.listActionsForLlmTools(agent.id).catch(() => []);
  const cacheable = !usedShortcut && llmActions.length === 0;

  if (!usedShortcut && cacheable) {
    const cached = await getCachedAnswer(agent.id, userText);
    if (cached) {
      usedShortcut = true; // отвечаем из кэша, не тратя токены на генерацию
      fullText = cached;
      onDelta(fullText);
    }
  }

  // === Шаг 2 (эмбеддинг) + Шаг 3 (векторный поиск): Q&A-приоритет и база знаний ===
  let toolWasCalled = false;
  if (!usedShortcut) {
    let embeddingFailed = false;
    try {
      const [queryEmbedding] = await embedTexts([userText], apiKey);
      [contextChunks, qaMatches, productMatches] = await Promise.all([
        knowledgeRepo.searchSimilarChunks(agent.id, queryEmbedding, RAG_TOP_K),
        qaRepo.searchSimilarQA(agent.id, queryEmbedding, QA_TOP_K),
        catalogRepo.searchSimilarProducts(agent.id, queryEmbedding, PRODUCT_TOP_K),
      ]);
    } catch (err) {
      embeddingFailed = true;
      logger.warn({ err, agentId: agent.id }, 'RAG retrieval недоступен, отвечаем без векторного контекста');
    }

    qaMatches = qaMatches.filter((q) => q.similarity >= QA_CONTEXT_THRESHOLD);
    productMatches = productMatches.filter((p) => p.similarity >= PRODUCT_CONTEXT_THRESHOLD);

    // Бюджет из запроса («до 1000», «дешевле 1500», «от 500») — фильтруем векторные совпадения.
    const priceFilter = parsePriceConstraint(userText);
    productMatches = filterByPrice(productMatches, priceFilter);

    // Текстовый фолбэк по каталогу: понимает морфологию и бюджет. Запускаем, когда векторных
    // совпадений нет (в т.ч. после отсечения по цене) или эмбеддинги недоступны.
    if (embeddingFailed || productMatches.length === 0) {
      const textProducts = await catalogRepo
        .searchProductsByText(agent.id, userText, PRODUCT_TOP_K, priceFilter)
        .catch(() => []);
      if (textProducts.length > 0) productMatches = textProducts;
    }

    const bestChunkSimilarity = Number(contextChunks[0]?.similarity || 0);
    if (embeddingFailed || contextChunks.length === 0 || bestChunkSimilarity < RAG_LOW_CONFIDENCE_THRESHOLD) {
      const textChunks = await knowledgeRepo.searchChunksByText(agent.id, userText, RAG_TOP_K).catch(() => []);
      if (textChunks.length > 0) {
        const seenChunkIds = new Set();
        contextChunks = [...textChunks, ...contextChunks]
          .filter((chunk) => {
            if (seenChunkIds.has(chunk.id)) return false;
            seenChunkIds.add(chunk.id);
            return true;
          })
          .slice(0, RAG_TOP_K);
      }
    }

    const hasLlm = !!apiKey || SERVER_HAS_LLM;

    // Q&A-приоритет: очень высокое семантическое сходство → готовый ответ мимо LLM.
    if (qaMatches.length > 0 && qaMatches[0].similarity >= QA_SHORTCUT_THRESHOLD) {
      usedShortcut = true;
      fullText = qaMatches[0].answer;
      onDelta(fullText);
    } else if (!hasLlm && productMatches.length > 0) {
      // Нет доступной LLM, но вопрос совпал с товарами из каталога → рекомендуем их напрямую.
      usedShortcut = true;
      fullText = formatProductRecommendation(productMatches);
      onDelta(fullText);
    } else {
      const systemPrompt = buildSystemPrompt(agent, { contextChunks, qaMatches, productMatches, settings, userText });
      const recentMessages = await messagesRepo.listRecentMessages(conversationId, HISTORY_LIMIT);
      const history = recentMessages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));

      const tools = llmActions.map((action) => ({
        name: action.name,
        description: action.description,
        parameters: action.paramSchema,
        _action: action,
      }));

      try {
        const result = await runToolLoop({ agent, systemPrompt, history, tools, conversationId, apiKey, onDelta });
        fullText = result.fullText;
        toolWasCalled = result.toolWasCalled;

        // Кэшируем только «чистые» ответы без побочных эффектов function calling.
        if (cacheable && !toolWasCalled && fullText) {
          void setCachedAnswer(agent.id, userText, fullText);
        }
      } catch (err) {
        // LLM недоступна (нет/невалидный ключ, лимит). Если вопрос совпал с товарами —
        // отдаём рекомендацию из каталога напрямую, иначе пробрасываем ошибку виджету.
        logger.warn({ err, agentId: agent.id }, 'LLM недоступна при генерации ответа');
        // Ошибка в середине стрима (часть текста уже у клиента): любой резервный
        // ответ дописался бы к показанному → пробрасываем как stream-error (ACM-17).
        if (streamedAny) {
          throw err;
        }
        if (!fullText && productMatches.length > 0) {
          fullText = formatProductRecommendation(productMatches);
          onDelta(fullText);
        } else if (!fullText && checkEscalation(userText, settings)) {
          // Пользователь явно просит оператора — эскалация не должна зависеть от доступности LLM.
          fullText = 'Перевожу ваш запрос на оператора.';
          onDelta(fullText);
        } else if (!fullText) {
          throw err;
        }
      }
    }
  }

  if (!usedShortcut && contextChunks.length === 0 && qaMatches.length === 0 && productMatches.length === 0) {
    await recordUnanswered(agent.id, userText, conversationId);
  }

  // Товары, участвовавшие в ответе, — событие рекомендации (для блока «Топ рекомендаций ИИ»).
  if (productMatches.length > 0) {
    for (const p of productMatches.slice(0, 3)) {
      void logEvent(agent.id, EVENT_TYPES.PRODUCT_RECOMMENDED, {
        conversationId,
        sessionId,
        payload: { productId: p.id, name: p.name, url: p.url },
      });
    }
  }

  const assistantTokens = estimateTokens(fullText);
  const assistantMessage = await messagesRepo.insertMessage({
    id: uuid(),
    conversationId,
    role: 'assistant',
    content: fullText,
    tokensUsed: assistantTokens,
  });

  await conversationsRepo.touchConversation(conversationId);
  await recordMessageUsage(orgId, userMessage.tokensUsed + assistantTokens);

  // --- Эскалация на человека (по ключевым словам в сообщении пользователя) ---
  let escalated = false;
  if (checkEscalation(userText, settings)) {
    escalated = true;
    await conversationsRepo.setConversationStatus(conversationId, agent.id, 'escalated').catch(() => {});
    await logEvent(agent.id, EVENT_TYPES.CONVERSATION_ESCALATED, { conversationId, sessionId, payload: { question: userText } }).catch(() => {});
    await logEvent(agent.id, EVENT_TYPES.ESCALATION_REQUESTED, { conversationId, sessionId }).catch(() => {});
    void actionsService.dispatchEventActions(agent.id, 'conversation_escalated', { conversationId, question: userText });
  }

  // Товары для карточек-рекомендаций в виджете (top-3 из уже отфильтрованных по релевантности/цене).
  // Старой цены и бейджа в схеме пока нет — фронт рендерит их опционально, когда поля появятся.
  const products = productMatches.slice(0, 3).map((p) => ({
    name: p.name,
    price: p.price != null ? Number(p.price) : null,
    currency: p.currency || null,
    url: p.url || null,
    imageUrl: p.imageUrl || null,
  }));

  return { userMessage, assistantMessage, escalated, products };
}

// --- Дашборд: просмотр диалогов ---

export async function listConversations(orgId, agentId, pagination) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  return conversationsRepo.listConversationsByAgent(agentId, pagination);
}

export async function getConversationMessages(orgId, agentId, conversationId) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  const conversation = await conversationsRepo.getConversationForAgent(conversationId, agentId);
  if (!conversation) throw notFound('Диалог не найден');
  const messages = await messagesRepo.listMessages(conversationId);
  return { conversation, messages };
}

export default { getOrStartConversation, handleUserMessage, listConversations, getConversationMessages };

import * as openaiProvider from './openai.js';
import * as anthropicProvider from './anthropic.js';
import { env } from '../../config/env.js';

const providers = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
};

/**
 * Унифицированный стриминг ответа LLM с fallback на альтернативного провайдера
 * при ошибке (недоступность API, rate limit и т.п.). Поддерживает function calling:
 * yield'ит либо { type: 'delta', text }, либо { type: 'tool_call', id, name, arguments }.
 * @param {{ provider: 'openai'|'anthropic', model?: string, systemPrompt: string, history: any[], tools?: {name: string, description: string, parameters?: object}[] }} params
 * @returns {AsyncGenerator<{type: 'delta', text: string} | {type: 'tool_call', id: string, name: string, arguments: object}>}
 */
export async function* streamChatCompletion({ provider, model, systemPrompt, history, tools, apiKey, allowFallback = true }) {
  const primaryName = providers[provider] ? provider : env.llm.defaultProvider;
  const primary = providers[primaryName];
  const fallbackName = primaryName === 'openai' ? 'anthropic' : 'openai';
  const fallback = providers[fallbackName];
  // Fallback имеет смысл только если у альтернативного провайдера есть ключ,
  // иначе получаем невнятную ошибку авторизации вместо исходной причины.
  const fallbackHasKey =
    fallbackName === 'openai' ? !!(apiKey || env.llm.openai.apiKey) : !!env.llm.anthropic.apiKey;

  // Считаем текстовые дельты, уже отданные клиенту. Fallback безопасен только пока
  // ничего не отрисовано: иначе свежий полный ответ второго провайдера допишется к
  // уже показанному частичному тексту → склеенный/дублированный ответ (ACM-17).
  let emitted = 0;
  try {
    for await (const event of primary.streamChat({ model, systemPrompt, history, tools, apiKey })) {
      if (event.type === 'delta') emitted += 1;
      yield event;
    }
  } catch (err) {
    // Fallback запрещён, если что-то уже отрисовано клиентом — либо в этом же вызове
    // (emitted > 0), либо в предыдущих раундах tool-loop (allowFallback === false).
    // Иначе свежий полный ответ второго провайдера допишется к показанному тексту (ACM-17).
    if (emitted > 0 || !allowFallback) {
      // Пробрасываем ошибку, чтобы вызывающий код закрыл поток корректной stream-ошибкой.
      throw err;
    }
    if (!fallback || !fallbackHasKey) throw err;
    // BYOK-ключ специфичен для OpenAI — на fallback-провайдера его не передаём.
    yield* fallback.streamChat({ model: undefined, systemPrompt, history, tools });
  }
}

/**
 * Embeddings всегда идут через OpenAI (у Anthropic нет embeddings API).
 * @param {string[]} texts
 * @param {string} [apiKey] BYOK-ключ агента
 */
export async function embedTexts(texts, apiKey) {
  return openaiProvider.embedTexts(texts, apiKey);
}

export default { streamChatCompletion, embedTexts };

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
export async function* streamChatCompletion({ provider, model, systemPrompt, history, tools, apiKey }) {
  const primaryName = providers[provider] ? provider : env.llm.defaultProvider;
  const primary = providers[primaryName];
  const fallbackName = primaryName === 'openai' ? 'anthropic' : 'openai';
  const fallback = providers[fallbackName];
  // Fallback имеет смысл только если у альтернативного провайдера есть ключ,
  // иначе получаем невнятную ошибку авторизации вместо исходной причины.
  const fallbackHasKey =
    fallbackName === 'openai' ? !!(apiKey || env.llm.openai.apiKey) : !!env.llm.anthropic.apiKey;

  try {
    yield* primary.streamChat({ model, systemPrompt, history, tools, apiKey });
  } catch (err) {
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

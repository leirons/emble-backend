import * as openaiProvider from './openai.js';
import * as anthropicProvider from './anthropic.js';
import { env } from '../../config/env.js';

const providers = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
};

/**
 * Ядро стриминга с безопасным fallback. Вынесено отдельной чистой функцией (без
 * знания о конкретных провайдерах/env), чтобы поведение можно было юнит-тестировать
 * без сетевых вызовов и мокинга модулей. См. streamChatCompletion для боевой обвязки.
 *
 * Инвариант ACM-17: fallback на второго провайдера допустим ТОЛЬКО пока клиент не
 * увидел ни одного текстового delta — ни в этом вызове (emitted > 0), ни в предыдущих
 * раундах tool-loop (allowFallback === false). Иначе свежий полный ответ fallback'а
 * допишется к уже отрисованному частичному тексту → склеенный/дублированный ответ.
 *
 * @param {() => AsyncGenerator} openPrimary  запуск стрима основного провайдера
 * @param {(() => AsyncGenerator)|null} openFallback  запуск стрима резервного провайдера (null — нет)
 * @param {boolean} allowFallback  разрешён ли fallback (false — текст уже шёл раньше)
 */
export async function* streamWithFallback(openPrimary, openFallback, allowFallback) {
  let emitted = 0;
  try {
    for await (const event of openPrimary()) {
      if (event.type === 'delta') emitted += 1;
      yield event;
    }
  } catch (err) {
    // Что-то уже отрисовано клиентом (сейчас или раньше) — перезапуск исказил бы ответ.
    // Пробрасываем ошибку, чтобы вызывающий код закрыл поток корректной stream-ошибкой.
    if (emitted > 0 || !allowFallback || !openFallback) throw err;
    yield* openFallback();
  }
}

/**
 * Унифицированный стриминг ответа LLM с fallback на альтернативного провайдера
 * при ошибке (недоступность API, rate limit и т.п.). Поддерживает function calling:
 * yield'ит либо { type: 'delta', text }, либо { type: 'tool_call', id, name, arguments }.
 * @param {{ provider: 'openai'|'anthropic', model?: string, systemPrompt: string, history: any[], tools?: {name: string, description: string, parameters?: object}[], allowFallback?: boolean }} params
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

  const openFallback =
    fallback && fallbackHasKey
      ? // BYOK-ключ специфичен для OpenAI — на fallback-провайдера его не передаём.
        () => fallback.streamChat({ model: undefined, systemPrompt, history, tools })
      : null;

  yield* streamWithFallback(
    () => primary.streamChat({ model, systemPrompt, history, tools, apiKey }),
    openFallback,
    allowFallback,
  );
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

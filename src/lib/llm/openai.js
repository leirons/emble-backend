import OpenAI from 'openai';
import { env } from '../../config/env.js';

let client;
/**
 * Возвращает OpenAI-клиент. Если передан apiKey (BYOK — ключ конкретного агента),
 * создаётся отдельный клиент под этот ключ; иначе используется общий серверный.
 */
function getClient(apiKey) {
  if (apiKey) return new OpenAI({ apiKey });
  if (!client) {
    client = new OpenAI({ apiKey: env.llm.openai.apiKey });
  }
  return client;
}

function toOpenAiTool(tool) {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters && Object.keys(tool.parameters).length ? tool.parameters : { type: 'object', properties: {} },
    },
  };
}

/**
 * Стриминг чат-комплишена от OpenAI. Поддерживает function calling (tools):
 * если модель решает вызвать функцию, дельты аргументов приходят кусками по
 * одному и тому же tool_calls[].index — аккумулируем их и yield'им единым
 * событием tool_call после завершения стрима.
 * @param {{ model?: string, systemPrompt: string, history: {role: string, content: string}[], tools?: {name: string, description: string, parameters?: object}[] }} params
 * @returns {AsyncGenerator<{type: 'delta', text: string} | {type: 'tool_call', id: string, name: string, arguments: object}>}
 */
export async function* streamChat({ model, systemPrompt, history, tools, apiKey }) {
  const openai = getClient(apiKey);
  const messages = [{ role: 'system', content: systemPrompt }, ...history];

  const stream = await openai.chat.completions.create({
    model: model || env.llm.openai.chatModel,
    messages,
    stream: true,
    temperature: 0.4,
    ...(tools && tools.length ? { tools: tools.map(toOpenAiTool), tool_choice: 'auto' } : {}),
  });

  const toolCallsAcc = new Map(); // index -> { id, name, arguments }

  for await (const part of stream) {
    const delta = part.choices?.[0]?.delta;
    if (delta?.content) yield { type: 'delta', text: delta.content };

    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index ?? 0;
        const acc = toolCallsAcc.get(idx) || { id: undefined, name: '', arguments: '' };
        if (tc.id) acc.id = tc.id;
        if (tc.function?.name) acc.name += tc.function.name;
        if (tc.function?.arguments) acc.arguments += tc.function.arguments;
        toolCallsAcc.set(idx, acc);
      }
    }
  }

  for (const acc of toolCallsAcc.values()) {
    let args = {};
    try {
      args = acc.arguments ? JSON.parse(acc.arguments) : {};
    } catch {
      args = {};
    }
    yield { type: 'tool_call', id: acc.id, name: acc.name, arguments: args };
  }
}

/**
 * Получить embeddings для массива текстов.
 * @param {string[]} texts
 * @param {string} [apiKey] BYOK-ключ агента (если задан)
 * @returns {Promise<number[][]>}
 */
export async function embedTexts(texts, apiKey) {
  const openai = getClient(apiKey);
  const res = await openai.embeddings.create({
    model: env.llm.openai.embeddingModel,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

export default { streamChat, embedTexts };

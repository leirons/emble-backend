import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';

let client;
function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: env.llm.anthropic.apiKey });
  }
  return client;
}

function toAnthropicTool(tool) {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters && Object.keys(tool.parameters).length ? tool.parameters : { type: 'object', properties: {} },
  };
}

/**
 * Стриминг чат-комплишена от Anthropic (Claude). Поддерживает function calling (tools):
 * аргументы tool_use блока приходят кусками JSON-текста (input_json_delta) —
 * аккумулируем по content_block index и парсим на content_block_stop.
 * @param {{ model?: string, systemPrompt: string, history: {role: string, content: string}[], tools?: {name: string, description: string, parameters?: object}[] }} params
 * @returns {AsyncGenerator<{type: 'delta', text: string} | {type: 'tool_call', id: string, name: string, arguments: object}>}
 */
export async function* streamChat({ model, systemPrompt, history, tools }) {
  const anthropic = getClient();

  // Anthropic поддерживает только роли user/assistant в messages, system — отдельным полем.
  const messages = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));

  const stream = anthropic.messages.stream({
    model: model || env.llm.anthropic.chatModel,
    system: systemPrompt,
    max_tokens: 1024,
    messages,
    ...(tools && tools.length ? { tools: tools.map(toAnthropicTool) } : {}),
  });

  const toolBlocks = new Map(); // content_block index -> { id, name, jsonBuf }

  for await (const event of stream) {
    if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
      toolBlocks.set(event.index, { id: event.content_block.id, name: event.content_block.name, jsonBuf: '' });
    } else if (event.type === 'content_block_delta') {
      if (event.delta?.type === 'text_delta') {
        yield { type: 'delta', text: event.delta.text };
      } else if (event.delta?.type === 'input_json_delta') {
        const acc = toolBlocks.get(event.index);
        if (acc) acc.jsonBuf += event.delta.partial_json || '';
      }
    } else if (event.type === 'content_block_stop') {
      const acc = toolBlocks.get(event.index);
      if (acc) {
        let args = {};
        try {
          args = acc.jsonBuf ? JSON.parse(acc.jsonBuf) : {};
        } catch {
          args = {};
        }
        yield { type: 'tool_call', id: acc.id, name: acc.name, arguments: args };
        toolBlocks.delete(event.index);
      }
    }
  }
}

export default { streamChat };

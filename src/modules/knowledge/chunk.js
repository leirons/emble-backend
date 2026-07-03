// Простой чанкер по символам с перекрытием. Без внешнего токенизатора —
// используем грубую оценку "~4 символа на токен" (общепринятая эвристика для англ./рус. текста).
const CHARS_PER_TOKEN = 4;
const DEFAULT_CHUNK_TOKENS = 600;
const DEFAULT_OVERLAP_TOKENS = 80;

function estimateTokens(text) {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Режет текст на чанки примерно по chunkTokens токенов с перекрытием overlapTokens,
 * стараясь не рвать предложения посередине.
 * @param {string} text
 * @param {{ chunkTokens?: number, overlapTokens?: number }} [opts]
 * @returns {{ content: string, tokenCount: number }[]}
 */
export function chunkText(text, opts = {}) {
  const chunkChars = (opts.chunkTokens || DEFAULT_CHUNK_TOKENS) * CHARS_PER_TOKEN;
  const overlapChars = (opts.overlapTokens || DEFAULT_OVERLAP_TOKENS) * CHARS_PER_TOKEN;

  const clean = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  if (!clean) return [];

  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + chunkChars, clean.length);

    if (end < clean.length) {
      // Стараемся закончить чанк на границе предложения/абзаца в пределах небольшого окна.
      const window = clean.slice(end, Math.min(end + 200, clean.length));
      const boundary = window.search(/[.!?\n]\s/);
      if (boundary !== -1) end += boundary + 1;
    }

    const content = clean.slice(start, end).trim();
    if (content) chunks.push({ content, tokenCount: estimateTokens(content) });

    if (end >= clean.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }

  return chunks;
}

export default { chunkText };

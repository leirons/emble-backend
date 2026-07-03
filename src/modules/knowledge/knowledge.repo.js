import { query } from '../../db/pool.js';

const SOURCE_COLUMNS = `
  id, agent_id AS "agentId", type, status, title, source_url AS "sourceUrl",
  file_key AS "fileKey", raw_text AS "rawText", error_message AS "errorMessage",
  tags, sync_interval_minutes AS "syncIntervalMinutes", last_synced_at AS "lastSyncedAt",
  request_headers AS "requestHeaders",
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

export async function insertSource({ id, agentId, type, title, sourceUrl, fileKey, rawText, tags, syncIntervalMinutes, headers }) {
  const { rows } = await query(
    `INSERT INTO knowledge_sources (id, agent_id, type, title, source_url, file_key, raw_text, tags, sync_interval_minutes, request_headers)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10::jsonb)
     RETURNING ${SOURCE_COLUMNS}`,
    [id, agentId, type, title || null, sourceUrl || null, fileKey || null, rawText || null, tags || [], syncIntervalMinutes || null, JSON.stringify(headers || {})]
  );
  return rows[0];
}

export async function updateSourceMeta(id, agentId, { tags, syncIntervalMinutes, headers }) {
  const sets = [];
  const values = [];
  let i = 1;
  if (tags !== undefined) {
    sets.push(`tags = $${i}::text[]`);
    values.push(tags);
    i += 1;
  }
  if (syncIntervalMinutes !== undefined) {
    sets.push(`sync_interval_minutes = $${i}`);
    values.push(syncIntervalMinutes);
    i += 1;
  }
  if (headers !== undefined) {
    sets.push(`request_headers = $${i}::jsonb`);
    values.push(JSON.stringify(headers));
    i += 1;
  }
  if (sets.length === 0) return getSourceById(id, agentId);

  sets.push(`updated_at = now()`);
  values.push(id, agentId);
  const { rows } = await query(
    `UPDATE knowledge_sources SET ${sets.join(', ')} WHERE id = $${i} AND agent_id = $${i + 1} RETURNING ${SOURCE_COLUMNS}`,
    values
  );
  return rows[0] || null;
}

export async function markSourceSynced(id) {
  await query(`UPDATE knowledge_sources SET last_synced_at = now() WHERE id = $1`, [id]);
}

/** Источники типа 'url' с настроенным интервалом, которым пора обновиться. */
export async function findSourcesDueForSync() {
  const { rows } = await query(
    `SELECT id, agent_id AS "agentId" FROM knowledge_sources
     WHERE type = 'url' AND sync_interval_minutes IS NOT NULL AND status != 'processing'
       AND (last_synced_at IS NULL OR last_synced_at < now() - (sync_interval_minutes || ' minutes')::interval)`
  );
  return rows;
}

export async function findPendingSourcesForIngestion(limit = 100) {
  const { rows } = await query(
    `SELECT id, agent_id AS "agentId" FROM knowledge_sources
     WHERE status IN ('pending', 'processing')
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function setSourceTitle(id, title) {
  await query(`UPDATE knowledge_sources SET title = $1, updated_at = now() WHERE id = $2`, [title, id]);
}

export async function listSourcesByAgent(agentId) {
  const { rows } = await query(
    `SELECT ${SOURCE_COLUMNS} FROM knowledge_sources WHERE agent_id = $1 ORDER BY created_at DESC`,
    [agentId]
  );
  return rows;
}

export async function getSourceById(id, agentId) {
  const { rows } = await query(`SELECT ${SOURCE_COLUMNS} FROM knowledge_sources WHERE id = $1 AND agent_id = $2`, [
    id,
    agentId,
  ]);
  return rows[0] || null;
}

export async function getSourceRaw(id) {
  const { rows } = await query(`SELECT ${SOURCE_COLUMNS} FROM knowledge_sources WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function setSourceStatus(id, status, errorMessage = null) {
  await query(
    `UPDATE knowledge_sources SET status = $1, error_message = $2, updated_at = now() WHERE id = $3`,
    [status, errorMessage, id]
  );
}

export async function deleteSource(id, agentId) {
  await query(`DELETE FROM knowledge_sources WHERE id = $1 AND agent_id = $2`, [id, agentId]);
}

export async function deleteChunksForSource(sourceId) {
  await query(`DELETE FROM knowledge_chunks WHERE source_id = $1`, [sourceId]);
}

function toVectorLiteral(embedding) {
  return `[${embedding.join(',')}]`;
}

/**
 * Массовая вставка чанков с embeddings. Выполняется построчно в рамках одного запроса
 * через unnest — быстрее, чем N отдельных INSERT.
 */
export async function insertChunks(sourceId, agentId, chunks) {
  if (chunks.length === 0) return;
  const values = [];
  const params = [];
  let i = 1;
  for (const chunk of chunks) {
    values.push(`($${i}, $${i + 1}, $${i + 2}, $${i + 3}::vector, $${i + 4})`);
    params.push(sourceId, agentId, chunk.content, toVectorLiteral(chunk.embedding), chunk.tokenCount);
    i += 5;
  }
  await query(
    `INSERT INTO knowledge_chunks (source_id, agent_id, content, embedding, token_count) VALUES ${values.join(', ')}`,
    params
  );
}

/**
 * Поиск top-k ближайших чанков по косинусному расстоянию (RAG retrieval).
 * @param {string} agentId
 * @param {number[]} queryEmbedding
 * @param {number} limit
 */
export async function searchSimilarChunks(agentId, queryEmbedding, limit = 5) {
  const vector = toVectorLiteral(queryEmbedding);
  const { rows } = await query(
    `SELECT id, source_id AS "sourceId", content, 1 - (embedding <=> $1::vector) AS similarity
     FROM knowledge_chunks
     WHERE agent_id = $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vector, agentId, limit]
  );
  return rows;
}

export async function searchChunksByText(agentId, text, limit = 5) {
  const terms = String(text || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3)
    .slice(0, 8);

  if (terms.length === 0) return [];

  const where = terms.map((_, idx) => `content ILIKE $${idx + 2}`).join(' OR ');
  const limitParam = terms.length + 2;
  const params = [agentId, ...terms.map((term) => `%${term}%`), limit];

  const { rows } = await query(
    `SELECT id, source_id AS "sourceId", content, 0 AS similarity
     FROM knowledge_chunks
     WHERE agent_id = $1 AND (${where})
     ORDER BY created_at DESC
     LIMIT $${limitParam}`,
    params
  );
  return rows;
}

export async function countChunksByAgent(agentId) {
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM knowledge_chunks WHERE agent_id = $1`, [agentId]);
  return rows[0].count;
}

export default {
  insertSource,
  updateSourceMeta,
  markSourceSynced,
  findSourcesDueForSync,
  findPendingSourcesForIngestion,
  setSourceTitle,
  listSourcesByAgent,
  getSourceById,
  getSourceRaw,
  setSourceStatus,
  deleteSource,
  deleteChunksForSource,
  insertChunks,
  searchSimilarChunks,
  searchChunksByText,
  countChunksByAgent,
};

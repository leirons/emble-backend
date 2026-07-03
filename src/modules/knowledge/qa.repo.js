import { query } from '../../db/pool.js';

const QA_COLUMNS = `
  id, agent_id AS "agentId", question, answer, created_at AS "createdAt", updated_at AS "updatedAt"
`;

function toVectorLiteral(embedding) {
  return `[${embedding.join(',')}]`;
}

export async function insertQaPair({ id, agentId, question, answer, embedding }) {
  const hasEmb = embedding != null;
  const { rows } = await query(
    `INSERT INTO agent_qa_pairs (id, agent_id, question, answer, embedding)
     VALUES ($1, $2, $3, $4, ${hasEmb ? '$5::vector' : 'NULL'})
     RETURNING ${QA_COLUMNS}`,
    hasEmb ? [id, agentId, question, answer, toVectorLiteral(embedding)] : [id, agentId, question, answer]
  );
  return rows[0];
}

/** Точное совпадение вопроса (регистро- и пробел-независимое) — работает без эмбеддингов. */
export async function findExactQa(agentId, question) {
  const { rows } = await query(
    `SELECT id, question, answer FROM agent_qa_pairs
     WHERE agent_id = $1 AND lower(btrim(question)) = lower(btrim($2)) LIMIT 1`,
    [agentId, question]
  );
  return rows[0] || null;
}

export async function listQaPairsByAgent(agentId) {
  const { rows } = await query(
    `SELECT ${QA_COLUMNS} FROM agent_qa_pairs WHERE agent_id = $1 ORDER BY created_at DESC`,
    [agentId]
  );
  return rows;
}

export async function getQaPairById(id, agentId) {
  const { rows } = await query(`SELECT ${QA_COLUMNS} FROM agent_qa_pairs WHERE id = $1 AND agent_id = $2`, [
    id,
    agentId,
  ]);
  return rows[0] || null;
}

export async function updateQaPair(id, agentId, { question, answer, embedding }) {
  const sets = [];
  const values = [];
  let i = 1;
  if (question !== undefined) {
    sets.push(`question = $${i}`);
    values.push(question);
    i += 1;
  }
  if (answer !== undefined) {
    sets.push(`answer = $${i}`);
    values.push(answer);
    i += 1;
  }
  if (embedding !== undefined) {
    if (embedding === null) {
      sets.push(`embedding = NULL`);
    } else {
      sets.push(`embedding = $${i}::vector`);
      values.push(toVectorLiteral(embedding));
      i += 1;
    }
  }
  if (sets.length === 0) return getQaPairById(id, agentId);

  sets.push(`updated_at = now()`);
  values.push(id, agentId);
  const { rows } = await query(
    `UPDATE agent_qa_pairs SET ${sets.join(', ')} WHERE id = $${i} AND agent_id = $${i + 1} RETURNING ${QA_COLUMNS}`,
    values
  );
  return rows[0] || null;
}

export async function deleteQaPair(id, agentId) {
  await query(`DELETE FROM agent_qa_pairs WHERE id = $1 AND agent_id = $2`, [id, agentId]);
}

/** Поиск top-k ближайших Q&A по косинусному расстоянию. */
export async function searchSimilarQA(agentId, queryEmbedding, limit = 3) {
  const vector = toVectorLiteral(queryEmbedding);
  const { rows } = await query(
    `SELECT id, question, answer, 1 - (embedding <=> $1::vector) AS similarity
     FROM agent_qa_pairs
     WHERE agent_id = $2 AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vector, agentId, limit]
  );
  return rows;
}

export default { insertQaPair, findExactQa, listQaPairsByAgent, getQaPairById, updateQaPair, deleteQaPair, searchSimilarQA };

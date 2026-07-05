import { query } from '../../db/pool.js';

const PRODUCT_COLUMNS = `
  id, agent_id AS "agentId", sku, name, description, price, currency, url,
  image_url AS "imageUrl", category, created_at AS "createdAt", updated_at AS "updatedAt"
`;

function toVectorLiteral(embedding) {
  return embedding ? `[${embedding.join(',')}]` : null;
}

export async function insertProduct({ id, agentId, sku, name, description, price, currency, url, imageUrl, category, embedding }) {
  const { rows } = await query(
    `INSERT INTO agent_products (id, agent_id, sku, name, description, price, currency, url, image_url, category, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector)
     RETURNING ${PRODUCT_COLUMNS}`,
    [
      id,
      agentId,
      sku || null,
      name,
      description || '',
      price ?? null,
      currency || 'UAH',
      url || null,
      imageUrl || null,
      category || null,
      toVectorLiteral(embedding),
    ]
  );
  return rows[0];
}

export async function insertProductsBulk(agentId, products) {
  if (products.length === 0) return [];
  const values = [];
  const params = [];
  let i = 1;
  for (const p of products) {
    values.push(
      `($${i}, $${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6}, $${i + 7}, $${i + 8}, $${i + 9}, $${i + 10}::vector)`
    );
    params.push(
      p.id,
      agentId,
      p.sku || null,
      p.name,
      p.description || '',
      p.price ?? null,
      p.currency || 'UAH',
      p.url || null,
      p.imageUrl || null,
      p.category || null,
      toVectorLiteral(p.embedding)
    );
    i += 11;
  }
  const { rows } = await query(
    `INSERT INTO agent_products (id, agent_id, sku, name, description, price, currency, url, image_url, category, embedding)
     VALUES ${values.join(', ')}
     ON CONFLICT (id) DO NOTHING
     RETURNING ${PRODUCT_COLUMNS}`,
    params
  );
  return rows;
}

export async function listProductsByAgent(agentId) {
  const { rows } = await query(
    `SELECT ${PRODUCT_COLUMNS} FROM agent_products WHERE agent_id = $1 ORDER BY created_at DESC`,
    [agentId]
  );
  return rows;
}

export async function getProductById(id, agentId) {
  const { rows } = await query(`SELECT ${PRODUCT_COLUMNS} FROM agent_products WHERE id = $1 AND agent_id = $2`, [
    id,
    agentId,
  ]);
  return rows[0] || null;
}

export async function updateProduct(id, agentId, fields) {
  const allowed = ['sku', 'name', 'description', 'price', 'currency', 'url', 'image_url', 'category', 'embedding'];
  const map = {
    sku: fields.sku,
    name: fields.name,
    description: fields.description,
    price: fields.price,
    currency: fields.currency,
    url: fields.url,
    image_url: fields.imageUrl,
    category: fields.category,
    embedding: fields.embedding !== undefined ? toVectorLiteral(fields.embedding) : undefined,
  };
  const sets = [];
  const values = [];
  let i = 1;
  for (const col of allowed) {
    if (map[col] !== undefined) {
      sets.push(col === 'embedding' ? `embedding = $${i}::vector` : `${col} = $${i}`);
      values.push(map[col]);
      i += 1;
    }
  }
  if (sets.length === 0) return getProductById(id, agentId);

  sets.push(`updated_at = now()`);
  values.push(id, agentId);
  const { rows } = await query(
    `UPDATE agent_products SET ${sets.join(', ')} WHERE id = $${i} AND agent_id = $${i + 1} RETURNING ${PRODUCT_COLUMNS}`,
    values
  );
  return rows[0] || null;
}

export async function deleteProduct(id, agentId) {
  await query(`DELETE FROM agent_products WHERE id = $1 AND agent_id = $2`, [id, agentId]);
}

/** Полностью очищает каталог агента, возвращает число удалённых строк. */
export async function deleteAllProducts(agentId) {
  const { rowCount } = await query(`DELETE FROM agent_products WHERE agent_id = $1`, [agentId]);
  return rowCount;
}

export async function countProductsByAgent(agentId) {
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM agent_products WHERE agent_id = $1`, [agentId]);
  return rows[0].count;
}

/** Поиск top-k ближайших товаров по косинусному расстоянию. */
export async function searchSimilarProducts(agentId, queryEmbedding, limit = 3) {
  const vector = toVectorLiteral(queryEmbedding);
  const { rows } = await query(
    `SELECT id, sku, name, description, price, currency, url, image_url AS "imageUrl", category,
       1 - (embedding <=> $1::vector) AS similarity
     FROM agent_products
     WHERE agent_id = $2 AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vector, agentId, limit]
  );
  return rows;
}

// Стоп-слова: намерение/вопрос/цена, а не название товара — не участвуют в поиске.
const PRODUCT_STOP_WORDS = new Set([
  'посоветуйте', 'посоветуй', 'порекомендуйте', 'порекомендуй', 'рекомендация', 'рекомендуй',
  'подскажите', 'подскажи', 'пожалуйста', 'хочу', 'хотел', 'хотела', 'нужен', 'нужна', 'нужно', 'ищу',
  'купить', 'выбрать', 'подобрать', 'который', 'которые', 'какой', 'какие', 'какая', 'есть', 'для', 'про',
  'что', 'чтото', 'нибудь', 'либо', 'мне', 'вы', 'товар', 'товары', 'вариант', 'варианты', 'примерно',
  // цена / бюджет — обрабатываются отдельно, как ключевые слова не годятся
  'дешевле', 'дороже', 'менее', 'меньше', 'больше', 'пределах', 'максимум', 'минимум', 'бюджет',
  'рублей', 'рубля', 'руб', 'грн', 'тенге', 'около', 'порядка', 'тысяч', 'тысячи', 'цена', 'цену', 'цены',
  'ценой', 'стоит', 'стоимость',
  'recommend', 'suggest', 'please', 'want', 'need', 'something', 'under', 'below', 'price', 'budget', 'cheap',
]);

// Частые русские окончания (сначала длинные) — лёгкий стеммер, чтобы «белье»/«белья»,
// «постельное»/«постельного», «мышка»/«мышку» совпадали без точного написания.
const RU_ENDINGS = [
  'ами', 'ями', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие',
  'ый', 'ий', 'ой', 'ую', 'юю', 'ам', 'ям', 'ах', 'ях', 'ов', 'ев', 'ем', 'ом', 'ые',
  'ы', 'и', 'а', 'я', 'о', 'е', 'у', 'ю', 'ь', 'й',
];
function ruStem(w) {
  for (const e of RU_ENDINGS) {
    if (w.endsWith(e) && w.length - e.length >= 4) return w.slice(0, w.length - e.length);
  }
  return w;
}

/**
 * Текстовый фолбэк-поиск товаров (когда эмбеддингов нет — например без OPENAI_API_KEY).
 * — Понимает морфологию: ищет по основам слов (белье≈белья, постельное≈постельного).
 * — Учитывает бюджет: opts.maxPrice / opts.minPrice.
 * — Если ключевых слов нет, но задан бюджет («посоветуйте что-то до 1000») — возвращает
 *   товары в рамках цены (сначала более дешёвые).
 * Ранжирует по числу совпавших основ, при равенстве — по возрастанию цены.
 */
export async function searchProductsByText(agentId, queryText, limit = 3, opts = {}) {
  const { maxPrice = null, minPrice = null } = opts;
  const words = String(queryText || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !PRODUCT_STOP_WORDS.has(w));
  const stems = [...new Set(words.map(ruStem))].filter((s) => s.length >= 3);

  const params = [agentId];
  const priceConds = [];
  if (maxPrice != null) { params.push(maxPrice); priceConds.push(`price IS NOT NULL AND price <= $${params.length}`); }
  if (minPrice != null) { params.push(minPrice); priceConds.push(`price IS NOT NULL AND price >= $${params.length}`); }

  // Нет значимых слов — либо советуем в рамках бюджета, либо ничего.
  if (stems.length === 0) {
    if (priceConds.length === 0) return [];
    params.push(limit);
    const { rows } = await query(
      `SELECT id, sku, name, description, price, currency, url, image_url AS "imageUrl", category
       FROM agent_products
       WHERE agent_id = $1 AND ${priceConds.join(' AND ')}
       ORDER BY price ASC NULLS LAST
       LIMIT $${params.length}`,
      params
    );
    return rows;
  }

  const matchExprs = [];
  const scoreExprs = [];
  for (const s of stems) {
    params.push(`%${s}%`);
    const like = `$${params.length}`;
    const nameLike = `lower(name) ILIKE ${like}`;
    const restLike = `(lower(description) ILIKE ${like} OR lower(coalesce(category,'')) ILIKE ${like})`;
    // Короткая основа (≤4) — дополнительно матчим по НАЧАЛУ слова из 3 букв (\m),
    // чтобы «мышку» находило «мышь»/«мыши». Такому совпадению даём меньший вес.
    let prefixAny = null;
    if (s.length <= 4) {
      params.push('\\m' + s.slice(0, 3));
      const rx = `$${params.length}`;
      prefixAny = `(lower(name) ~ ${rx} OR lower(description) ~ ${rx} OR lower(coalesce(category,'')) ~ ${rx})`;
    }
    const anyMatch = `(${nameLike} OR ${restLike}${prefixAny ? ` OR ${prefixAny}` : ''})`;
    matchExprs.push(anyMatch);
    scoreExprs.push(
      `(CASE WHEN ${nameLike} THEN 3 WHEN ${restLike} THEN 2${prefixAny ? ` WHEN ${prefixAny} THEN 1` : ''} ELSE 0 END)`
    );
  }
  const where = [`agent_id = $1`, `(${matchExprs.join(' OR ')})`, ...priceConds];
  params.push(limit);
  const { rows } = await query(
    `SELECT id, sku, name, description, price, currency, url, image_url AS "imageUrl", category
     FROM agent_products
     WHERE ${where.join(' AND ')}
     ORDER BY (${scoreExprs.join(' + ')}) DESC, price ASC NULLS LAST
     LIMIT $${params.length}`,
    params
  );
  return rows;
}

// --- Import Jobs ---

const IMPORT_JOB_COLUMNS = `
  id, agent_id AS "agentId", status, total_rows AS "totalRows",
  processed_rows AS "processedRows", error_message AS "errorMessage",
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

export async function insertImportJob({ id, agentId, totalRows, rowsData }) {
  const { rows } = await query(
    `INSERT INTO catalog_import_jobs (id, agent_id, total_rows, rows_data)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING ${IMPORT_JOB_COLUMNS}`,
    [id, agentId, totalRows, JSON.stringify(rowsData)]
  );
  return rows[0];
}

export async function getImportJob(jobId, agentId) {
  const { rows } = await query(
    `SELECT ${IMPORT_JOB_COLUMNS} FROM catalog_import_jobs WHERE id = $1 AND agent_id = $2`,
    [jobId, agentId]
  );
  return rows[0] || null;
}

export async function getImportJobWithData(jobId) {
  const { rows } = await query(
    `SELECT id, agent_id AS "agentId", status, total_rows AS "totalRows",
     processed_rows AS "processedRows", rows_data AS "rowsData"
     FROM catalog_import_jobs WHERE id = $1`,
    [jobId]
  );
  return rows[0] || null;
}

/** Лёгкое чтение метаданных задачи без тяжёлого rows_data (для чанковой обработки).
 *  sourceConfig — конфиг фида (если задача из URL); hasRows — распарсены ли уже строки. */
export async function getImportJobMeta(jobId) {
  const { rows } = await query(
    `SELECT id, agent_id AS "agentId", status, total_rows AS "totalRows", processed_rows AS "processedRows",
       source_config AS "sourceConfig", (rows_data IS NOT NULL) AS "hasRows"
     FROM catalog_import_jobs WHERE id = $1`,
    [jobId]
  );
  return rows[0] || null;
}

/** Создаёт задачу импорта из URL-фида без строк — их загрузит фоновая prepare-фаза по sourceConfig. */
export async function insertFeedImportJob({ id, agentId, sourceConfig }) {
  const { rows } = await query(
    `INSERT INTO catalog_import_jobs (id, agent_id, total_rows, source_config)
     VALUES ($1, $2, 0, $3::jsonb)
     RETURNING ${IMPORT_JOB_COLUMNS}`,
    [id, agentId, JSON.stringify(sourceConfig)]
  );
  return rows[0];
}

/** Заполняет распарсенные строки и общее число (конец prepare-фазы фидового импорта). */
export async function setImportJobRows(jobId, totalRows, rowsData) {
  await query(
    `UPDATE catalog_import_jobs SET total_rows = $1, rows_data = $2::jsonb, updated_at = now() WHERE id = $3`,
    [totalRows, JSON.stringify(rowsData), jobId]
  );
}

/** Возвращает срез строк задачи [offset+1 .. offset+limit] — чтобы не тянуть весь rows_data на каждый чанк. */
export async function getImportJobRowsSlice(jobId, offset, limit) {
  const { rows } = await query(
    `SELECT COALESCE(jsonb_agg(t.e ORDER BY t.n), '[]'::jsonb) AS slice
     FROM catalog_import_jobs j
     CROSS JOIN LATERAL jsonb_array_elements(j.rows_data) WITH ORDINALITY AS t(e, n)
     WHERE j.id = $1 AND j.rows_data IS NOT NULL AND t.n > $2 AND t.n <= $3`,
    [jobId, offset, offset + limit]
  );
  return rows[0]?.slice || [];
}

export async function updateImportJobProgress(jobId, processedRows) {
  await query(
    `UPDATE catalog_import_jobs SET processed_rows = $1, updated_at = now() WHERE id = $2`,
    [processedRows, jobId]
  );
}

export async function updateImportJobStatus(jobId, status, errorMessage = null) {
  await query(
    `UPDATE catalog_import_jobs SET status = $1, error_message = $2, updated_at = now() WHERE id = $3`,
    [status, errorMessage, jobId]
  );
}

export async function clearImportJobData(jobId) {
  await query(
    `UPDATE catalog_import_jobs SET rows_data = NULL, updated_at = now() WHERE id = $1`,
    [jobId]
  );
}

export default {
  insertProduct,
  insertProductsBulk,
  listProductsByAgent,
  getProductById,
  updateProduct,
  deleteProduct,
  deleteAllProducts,
  countProductsByAgent,
  searchSimilarProducts,
  searchProductsByText,
  insertImportJob,
  insertFeedImportJob,
  setImportJobRows,
  getImportJob,
  getImportJobWithData,
  getImportJobMeta,
  getImportJobRowsSlice,
  updateImportJobProgress,
  updateImportJobStatus,
  clearImportJobData,
};

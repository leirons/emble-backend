import { v4 as uuid } from 'uuid';
import * as catalogRepo from './catalog.repo.js';
import * as agentsRepo from '../agents/agents.repo.js';
import { embedTexts } from '../../lib/llm/index.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { enqueueCatalogImport } from '../../lib/queue.js';
import { logger } from '../../lib/logger.js';

const MAX_IMPORT_ROWS = 10000;
const EMBED_BATCH_SIZE = 100;

async function assertAgentOwnership(orgId, agentId) {
  const agent = await agentsRepo.getAgentByIdForOrg(agentId, orgId);
  if (!agent) throw notFound('Агент не найден');
  return agent;
}

function embeddingText(p) {
  return `${p.name}. ${p.description || ''}`.trim();
}

/** Эмбеддинги батчами; если LLM недоступна — товары сохраняются без вектора (доступен ILIKE-поиск). */
async function embedBatch(texts, apiKey) {
  try {
    return await embedTexts(texts, apiKey);
  } catch (err) {
    logger.warn({ err }, '[catalog] не удалось посчитать эмбеддинги, сохраняем товары без вектора');
    return texts.map(() => null);
  }
}

export async function createProduct(orgId, agentId, input) {
  await assertAgentOwnership(orgId, agentId);
  const settings = await agentsRepo.getOrCreateSettings(agentId).catch(() => null);
  const apiKey = settings?.openaiApiKey || undefined;
  const [embedding] = await embedBatch([embeddingText(input)], apiKey);
  return catalogRepo.insertProduct({ id: uuid(), agentId, ...input, embedding });
}

export async function listProducts(orgId, agentId) {
  await assertAgentOwnership(orgId, agentId);
  return catalogRepo.listProductsByAgent(agentId);
}

export async function updateProduct(orgId, agentId, productId, input) {
  await assertAgentOwnership(orgId, agentId);
  let embedding;
  if (input.name !== undefined || input.description !== undefined) {
    const existing = await catalogRepo.getProductById(productId, agentId);
    if (!existing) throw notFound('Товар не найден');
    const merged = { ...existing, ...input };
    const settings = await agentsRepo.getOrCreateSettings(agentId).catch(() => null);
    const apiKey = settings?.openaiApiKey || undefined;
    [embedding] = await embedBatch([embeddingText(merged)], apiKey);
  }
  const product = await catalogRepo.updateProduct(productId, agentId, { ...input, embedding });
  if (!product) throw notFound('Товар не найден');
  return product;
}

export async function deleteProduct(orgId, agentId, productId) {
  await assertAgentOwnership(orgId, agentId);
  await catalogRepo.deleteProduct(productId, agentId);
}

/** Полная очистка каталога агента. */
export async function clearProducts(orgId, agentId) {
  await assertAgentOwnership(orgId, agentId);
  const deleted = await catalogRepo.deleteAllProducts(agentId);
  return { deleted };
}

/**
 * Определяет разделитель по первой строке: запятая, точка с запятой (частый экспорт
 * из Excel/Google Sheets в русской локали) или табуляция. Учитываем только символы
 * вне кавычек.
 */
function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && counts[ch] !== undefined) counts[ch] += 1;
  }
  let best = ',';
  for (const d of [';', '\t']) {
    if (counts[d] > counts[best]) best = d;
  }
  return best;
}

/** Простой построчный CSV-парсер с поддержкой кавычек и любого разделителя. */
function parseCsv(text, delimiter = ',') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0] !== '');
}

function csvToObjects(text) {
  // Убираем BOM (Excel/Google Sheets часто добавляют его в UTF-8).
  const clean = text.replace(/^﻿/, '');
  const rows = parseCsv(clean, detectDelimiter(clean));
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = (r[idx] ?? '').trim();
    });
    return obj;
  });
}

// Известные псевдонимы заголовков (рус + англ). Совпадение по ним — приоритетное.
const COLUMN_ALIASES = {
  name: ['name', 'title', 'product_name', 'productname', 'название', 'наименование', 'товар', 'имя', 'продукт'],
  description: ['description', 'desc', 'описание', 'характеристики', 'детали', 'о товаре'],
  price: ['price', 'cost', 'amount', 'цена', 'стоимость', 'руб'],
  currency: ['currency', 'валюта'],
  url: ['url', 'link', 'product_url', 'producturl', 'ссылка', 'урл', 'линк'],
  imageUrl: ['image_url', 'imageurl', 'image', 'thumbnail', 'photo', 'фото', 'изображение', 'картинка'],
  category: ['category', 'категория', 'раздел', 'тип'],
  sku: ['sku', 'article', 'артикул', 'код', 'код товара'],
};

const isUrl = (v) => /^https?:\/\//i.test(String(v).trim());
const isNumericLike = (v) => {
  const s = String(v).replace(/[\s ]/g, '').replace(',', '.');
  return s !== '' && /^-?\d+(\.\d+)?$/.test(s.replace(/[^\d.-]/g, '')) && /\d/.test(s);
};

/** Статистика по колонке на выборке строк — для эвристического угадывания. */
function columnStats(rows, header) {
  const vals = rows.map((r) => (r[header] ?? '').toString().trim()).filter((v) => v !== '');
  const n = vals.length || 1;
  let urls = 0;
  let nums = 0;
  let letters = 0;
  let totalLen = 0;
  for (const v of vals) {
    if (isUrl(v)) urls += 1;
    if (isNumericLike(v)) nums += 1;
    if (/\p{L}/u.test(v)) letters += 1;
    totalLen += v.length;
  }
  return {
    fill: vals.length / rows.length,
    url: urls / n,
    num: nums / n,
    letters: letters / n,
    avgLen: totalLen / n,
  };
}

/**
 * Определяет, какая колонка что означает. Сначала по псевдонимам заголовка,
 * затем — эвристически по содержимому (текстовая → название, числовая → цена,
 * http → ссылка). Так импорт работает с произвольными названиями столбцов.
 */
function inferColumns(rawRows) {
  const headers = Object.keys(rawRows[0] || {});
  const sample = rawRows.slice(0, 50);
  const lower = {};
  headers.forEach((h) => (lower[h] = h.toString().trim().toLowerCase()));
  const stats = {};
  headers.forEach((h) => (stats[h] = columnStats(sample, h)));

  const mapping = {};
  const used = new Set();

  // 1) точное/псевдонимное совпадение заголовка
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const h = headers.find((hh) => aliases.includes(lower[hh]) && !used.has(hh));
    if (h) {
      mapping[field] = h;
      used.add(h);
    }
  }

  const free = () => headers.filter((h) => !used.has(h));

  // 2) эвристика для незаполненных
  if (!mapping.url) {
    const h = free().sort((a, b) => stats[b].url - stats[a].url)[0];
    if (h && stats[h].url >= 0.5) {
      mapping.url = h;
      used.add(h);
    }
  }
  if (!mapping.name) {
    // Название — ПЕРВАЯ качественная текстовая колонка (в реальных файлах название
    // идёт раньше описания; описание обычно длиннее, его берём отдельно ниже).
    const candidate = free().find((h) => {
      const s = stats[h];
      return s.fill >= 0.5 && s.letters >= 0.4 && s.url < 0.5 && s.num < 0.5 && s.avgLen >= 2;
    });
    if (candidate) {
      mapping.name = candidate;
      used.add(candidate);
    }
  }
  if (!mapping.price) {
    const h = free().sort((a, b) => stats[b].num - stats[a].num)[0];
    if (h && stats[h].num >= 0.5) {
      mapping.price = h;
      used.add(h);
    }
  }
  if (!mapping.description) {
    // самая «длиннотекстовая» из оставшихся
    let best = null;
    let bestLen = 0;
    for (const h of free()) {
      const s = stats[h];
      if (s.letters >= 0.3 && s.avgLen > bestLen) {
        bestLen = s.avgLen;
        best = h;
      }
    }
    if (best) {
      mapping.description = best;
      used.add(best);
    }
  }
  return mapping;
}

function normalizeWith(raw, mapping) {
  const g = (field) => (mapping[field] ? raw[mapping[field]] : undefined);
  const rawPrice = g('price');
  const price =
    rawPrice !== undefined && rawPrice !== '' && rawPrice !== null
      ? Number(String(rawPrice).replace(/[^\d.,-]/g, '').replace(',', '.'))
      : undefined;
  return {
    sku: g('sku') || undefined,
    name: (g('name') || '').toString().trim(),
    description: (g('description') || '').toString(),
    price: Number.isFinite(price) ? price : undefined,
    currency: g('currency') || undefined,
    url: g('url') || undefined,
    imageUrl: g('imageUrl') || undefined,
    category: g('category') || undefined,
  };
}

/** Инференс колонок + маппинг всех строк в товары (отфильтрованные по непустому имени). */
function rowsToProducts(rawRows) {
  const mapping = inferColumns(rawRows);
  if (!mapping.name) return { products: [], mapping };
  const products = rawRows.map((r) => normalizeWith(r, mapping)).filter((p) => p.name);
  return { products, mapping };
}

/**
 * Массовый импорт каталога из CSV или JSON. Определяет формат по расширению/mime,
 * эмбеддит батчами по EMBED_BATCH_SIZE (как ingestion.worker.js для базы знаний).
 */
export async function importProducts(orgId, agentId, file) {
  await assertAgentOwnership(orgId, agentId);
  if (!file) throw badRequest('Файл не передан (поле form-data: file)');

  const text = file.buffer.toString('utf8');
  const isJson = file.originalname?.toLowerCase().endsWith('.json') || file.mimetype === 'application/json';

  let rawRows;
  if (isJson) {
    try {
      const parsed = JSON.parse(text);
      rawRows = Array.isArray(parsed) ? parsed : [];
    } catch {
      throw badRequest('Некорректный JSON-файл — ожидается массив объектов');
    }
  } else {
    rawRows = csvToObjects(text);
  }

  if (rawRows.length === 0) throw badRequest('Файл пуст или не удалось распознать строки');
  if (rawRows.length > MAX_IMPORT_ROWS) {
    throw badRequest(`Слишком много строк (${rawRows.length}). Максимум ${MAX_IMPORT_ROWS} за один импорт — разбейте файл.`);
  }

  const { products: rows } = rowsToProducts(rawRows);
  if (rows.length === 0) {
    const headers = Object.keys(rawRows[0] || {}).join(', ');
    throw badRequest(
      `Не удалось найти колонку с названием товара среди [${headers}]. ` +
        `Убедитесь, что в файле есть столбец с названиями (например «Название» или name).`
    );
  }

  const withIds = rows.map((r) => ({ id: uuid(), ...r }));

  const jobId = uuid();
  const importJob = await catalogRepo.insertImportJob({
    id: jobId,
    agentId,
    totalRows: withIds.length,
    rowsData: withIds,
  });

  await enqueueCatalogImport({ jobId: importJob.id, agentId });

  return { jobId: importJob.id, total: withIds.length };
}

/** Общий разбор массива сырых строк каталога → нормализация → эмбеддинг → вставка. */
async function ingestRows(agentId, rawRows) {
  if (rawRows.length === 0) throw badRequest('Не найдено строк для импорта');
  if (rawRows.length > MAX_IMPORT_ROWS) {
    throw badRequest(`Слишком много строк (${rawRows.length}). Максимум ${MAX_IMPORT_ROWS} за один импорт.`);
  }
  const { products: rows } = rowsToProducts(rawRows);
  if (rows.length === 0) {
    const headers = Object.keys(rawRows[0] || {}).join(', ');
    throw badRequest(`Не найдено колонки с названием товара среди [${headers}].`);
  }

  const settings = await agentsRepo.getOrCreateSettings(agentId).catch(() => null);
  const apiKey = settings?.openaiApiKey || undefined;

  const withIds = rows.map((r) => ({ id: uuid(), ...r }));
  for (let i = 0; i < withIds.length; i += EMBED_BATCH_SIZE) {
    const batch = withIds.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedBatch(batch.map(embeddingText), apiKey);
    batch.forEach((p, idx) => {
      p.embedding = embeddings[idx];
    });
  }
  return catalogRepo.insertProductsBulk(agentId, withIds);
}

/**
 * Импорт каталога с внешнего API по URL. Поддерживает произвольный метод и заголовки
 * (например, Authorization: Bearer ...) — данные тянутся с защищённого эндпоинта клиента.
 */
export async function importProductsFromUrl(orgId, agentId, { url, method, headers, format }) {
  await assertAgentOwnership(orgId, agentId);
  let res;
  try {
    res = await fetch(url, { method: method || 'GET', headers: headers || {}, signal: AbortSignal.timeout(15000) });
  } catch (err) {
    throw badRequest(`Не удалось запросить URL: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) throw badRequest(`Источник вернул HTTP ${res.status}`);

  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';
  const isJson = format === 'json' || (format !== 'csv' && (contentType.includes('json') || text.trim().startsWith('[')));

  let rawRows;
  if (isJson) {
    try {
      const parsed = JSON.parse(text);
      rawRows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.products) ? parsed.products : Array.isArray(parsed.items) ? parsed.items : [];
    } catch {
      throw badRequest('Ответ не является корректным JSON-массивом');
    }
  } else {
    rawRows = csvToObjects(text);
  }

  const products = await ingestRows(agentId, rawRows);
  return { products, count: products.length };
}

export async function getImportJobStatus(orgId, agentId, jobId) {
  await assertAgentOwnership(orgId, agentId);
  const job = await catalogRepo.getImportJob(jobId, agentId);
  if (!job) throw notFound('Задача импорта не найдена');
  return { status: job.status, processed: job.processedRows, total: job.totalRows, error: job.errorMessage };
}

export default { createProduct, listProducts, updateProduct, deleteProduct, clearProducts, importProducts, importProductsFromUrl, getImportJobStatus };

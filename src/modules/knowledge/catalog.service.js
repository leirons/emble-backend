import { v4 as uuid } from 'uuid';
import * as cheerio from 'cheerio';
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

/**
 * Универсальный парсер XML-фида → массив плоских объектов { тег/атрибут: значение }.
 * Понимает YML (Prom/Horoshop, элемент <offer>), Google Merchant RSS (<item>) и любой XML.
 * itemSelector — тег товара; если не задан, определяется автоматически (offer/item/product/entry
 * или самый частый повторяющийся элемент). Повторяющиеся теги (напр. несколько <picture>) берутся
 * по первому вхождению; YML-<param name="Цвет"> раскладывается в ключ "param:Цвет".
 */
function xmlToObjects(text, opts = {}) {
  const $ = cheerio.load(text, { xml: true });
  let sel = (opts.itemSelector || '').trim();
  if (!sel) {
    sel = ['offer', 'item', 'product', 'entry'].find((c) => $(c).length > 0) || '';
    if (!sel) {
      const counts = {};
      $('*').each((_, el) => {
        if (el.name) counts[el.name] = (counts[el.name] || 0) + 1;
      });
      sel = Object.keys(counts).filter((t) => counts[t] >= 2).sort((a, b) => counts[b] - counts[a])[0] || '';
    }
  }
  if (!sel) return { rows: [], itemTag: null };

  const rows = [];
  $(sel).each((_, node) => {
    const obj = {};
    const attribs = node.attribs || {};
    for (const k of Object.keys(attribs)) obj[k] = String(attribs[k]).trim();
    $(node)
      .children()
      .each((__, child) => {
        const tag = child.name;
        if (!tag) return;
        if (tag === 'param' && child.attribs && child.attribs.name) {
          const key = 'param:' + child.attribs.name;
          if (obj[key] === undefined) obj[key] = $(child).text().trim();
          return;
        }
        if (obj[tag] === undefined) obj[tag] = $(child).text().trim();
      });
    rows.push(obj);
  });
  return { rows, itemTag: sel };
}

const PRODUCT_FIELDS = ['sku', 'name', 'description', 'price', 'currency', 'url', 'imageUrl', 'category'];

/** Оставляет из пользовательского маппинга только валидные пары «наше поле → тег фида». */
function cleanMappingOverride(override) {
  if (!override || typeof override !== 'object') return {};
  const out = {};
  for (const field of PRODUCT_FIELDS) {
    const tag = override[field];
    if (typeof tag === 'string' && tag.trim()) out[field] = tag.trim();
  }
  return out;
}

// Известные псевдонимы заголовков (рус + англ). Совпадение по ним — приоритетное.
const COLUMN_ALIASES = {
  name: ['name', 'title', 'product_name', 'productname', 'model', 'g:title', 'название', 'наименование', 'товар', 'имя', 'продукт', 'назва'],
  description: ['description', 'desc', 'g:description', 'sales_notes', 'описание', 'характеристики', 'детали', 'о товаре', 'опис'],
  price: ['price', 'cost', 'amount', 'g:price', 'цена', 'стоимость', 'руб', 'грн', 'uah', 'ціна', 'вартість'],
  currency: ['currency', 'currencyid', 'валюта'],
  url: ['url', 'link', 'product_url', 'producturl', 'offerurl', 'g:link', 'ссылка', 'урл', 'линк', 'посилання'],
  imageUrl: ['image_url', 'imageurl', 'image', 'picture', 'thumbnail', 'photo', 'g:image_link', 'image_link', 'фото', 'изображение', 'картинка', 'зображення'],
  category: ['category', 'categoryid', 'g:product_type', 'g:google_product_category', 'категория', 'раздел', 'тип', 'категорія'],
  sku: ['sku', 'id', 'g:id', 'article', 'vendorcode', 'vendor_code', 'barcode', 'g:mpn', 'g:gtin', 'артикул', 'код', 'код товара', 'артикул товару'],
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

/**
 * Инференс колонок + маппинг всех строк в товары (отфильтрованные по непустому имени).
 * mappingOverride (наше поле → тег/колонка фида) имеет приоритет над авто-угадыванием —
 * так владелец может вручную задать соответствие полей.
 */
function rowsToProducts(rawRows, mappingOverride) {
  const mapping = { ...inferColumns(rawRows), ...cleanMappingOverride(mappingOverride) };
  if (!mapping.name) return { products: [], mapping };
  const products = rawRows.map((r) => normalizeWith(r, mapping)).filter((p) => p.name);
  return { products, mapping };
}

/**
 * Массовый импорт каталога из CSV или JSON. Определяет формат по расширению/mime,
 * эмбеддит батчами по EMBED_BATCH_SIZE (как ingestion.worker.js для базы знаний).
 */
export async function importProducts(orgId, agentId, file, opts = {}) {
  await assertAgentOwnership(orgId, agentId);
  if (!file) throw badRequest('Файл не передан (поле form-data: file)');

  const text = file.buffer.toString('utf8');
  const name = (file.originalname || '').toLowerCase();
  const trimmed = text.replace(/^﻿/, '').trimStart();
  const isJson = name.endsWith('.json') || file.mimetype === 'application/json' || trimmed.startsWith('[');
  const isXml = !isJson && (name.endsWith('.xml') || (file.mimetype || '').includes('xml') || /^<\?xml|^<(rss|yml_catalog|feed|catalog|shop)[\s>]/i.test(trimmed));

  let rawRows;
  if (isJson) {
    try {
      const parsed = JSON.parse(text);
      rawRows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.products) ? parsed.products : Array.isArray(parsed.offers) ? parsed.offers : [];
    } catch {
      throw badRequest('Некорректный JSON-файл — ожидается массив объектов');
    }
  } else if (isXml) {
    rawRows = xmlToObjects(text, { itemSelector: opts.itemSelector }).rows;
  } else {
    rawRows = csvToObjects(text);
  }

  if (rawRows.length === 0) throw badRequest('Файл пуст или не удалось распознать строки');
  if (rawRows.length > MAX_IMPORT_ROWS) {
    throw badRequest(`Слишком много строк (${rawRows.length}). Максимум ${MAX_IMPORT_ROWS} за один импорт — разбейте файл.`);
  }

  const { products: rows } = rowsToProducts(rawRows, opts.mapping);
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
async function ingestRows(agentId, rawRows, mappingOverride) {
  if (rawRows.length === 0) throw badRequest('Не найдено строк для импорта');
  if (rawRows.length > MAX_IMPORT_ROWS) {
    throw badRequest(`Слишком много строк (${rawRows.length}). Максимум ${MAX_IMPORT_ROWS} за один импорт.`);
  }
  const { products: rows } = rowsToProducts(rawRows, mappingOverride);
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

const PREVIEW_MAX_BYTES = 2 * 1024 * 1024; // превью читает только начало большого фида

/** Обрезает XML до последнего полностью закрытого товара — чтобы cheerio не спотыкался
 *  об оборванный на середине элемент при чтении только части большого фида. */
function trimToLastItem(xml) {
  let cut = -1;
  for (const tag of ['</offer>', '</item>', '</product>', '</entry>']) {
    const i = xml.lastIndexOf(tag);
    if (i >= 0) cut = Math.max(cut, i + tag.length);
  }
  return cut > 0 ? xml.slice(0, cut) : xml;
}

/** Скачивает URL, читая не более maxBytes (для превью больших фидов). Возвращает текст,
 *  Content-Type и флаг truncated (был ли ответ обрезан по лимиту). */
async function fetchFeedText(url, { method, headers } = {}, maxBytes) {
  let res;
  try {
    res = await fetch(url, { method: method || 'GET', headers: headers || {}, signal: AbortSignal.timeout(25000) });
  } catch (err) {
    throw badRequest(`Не удалось запросить URL: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) throw badRequest(`Источник вернул HTTP ${res.status}`);
  const contentType = res.headers.get('content-type') || '';

  if (!maxBytes || !res.body) {
    return { text: await res.text(), contentType, truncated: false };
  }
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
    total += value.length;
    if (total >= maxBytes) {
      truncated = true;
      try { await reader.cancel(); } catch { /* поток уже закрыт */ }
      break;
    }
  }
  return { text: Buffer.concat(chunks).toString('utf8'), contentType, truncated };
}

/**
 * Скачивает URL и парсит ответ в массив сырых строк. Формат определяется по параметру format,
 * Content-Type или содержимому: JSON, XML-фид (YML/RSS) или CSV. maxBytes ограничивает объём
 * загрузки (для превью), при этом XML обрезается до последнего целого товара.
 */
async function fetchFeedRows(url, { method, headers, format, itemSelector } = {}, maxBytes) {
  const { text, contentType, truncated } = await fetchFeedText(url, { method, headers }, maxBytes);
  const trimmed = text.replace(/^﻿/, '').trimStart();

  let detected = format;
  if (!detected) {
    if (contentType.includes('json') || trimmed.startsWith('[') || trimmed.startsWith('{')) detected = 'json';
    else if (contentType.includes('xml') || /^<\?xml|^<(rss|yml_catalog|feed|catalog|shop)[\s>]/i.test(trimmed)) detected = 'xml';
    else detected = 'csv';
  }

  let rawRows;
  let itemTag = null;
  if (detected === 'json') {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw badRequest(truncated ? 'JSON слишком большой для предпросмотра — укажите формат вручную' : 'Ответ не является корректным JSON');
    }
    rawRows = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.products)
        ? parsed.products
        : Array.isArray(parsed.items)
          ? parsed.items
          : Array.isArray(parsed.offers)
            ? parsed.offers
            : [];
  } else if (detected === 'xml') {
    const parsed = xmlToObjects(truncated ? trimToLastItem(text) : text, { itemSelector });
    rawRows = parsed.rows;
    itemTag = parsed.itemTag;
  } else {
    rawRows = csvToObjects(text);
  }

  return { rawRows, format: detected, itemTag, truncated };
}

/**
 * Скачивает и парсит фид в готовые к вставке строки (с id). Вызывается фоновой prepare-фазой
 * импорта (catalog-import.worker.js), чтобы тяжёлая загрузка/парсинг шли НЕ в HTTP-запросе.
 */
export async function parseFeedToRows({ url, method, headers, format, itemSelector, mapping }) {
  const { rawRows } = await fetchFeedRows(url, { method, headers, format, itemSelector });
  if (rawRows.length === 0) throw badRequest('Фид пуст или не удалось распознать позиции');
  if (rawRows.length > MAX_IMPORT_ROWS) {
    throw badRequest(`Слишком много позиций (${rawRows.length}). Максимум ${MAX_IMPORT_ROWS} за один импорт.`);
  }
  const { products } = rowsToProducts(rawRows, mapping);
  if (products.length === 0) {
    const found = Object.keys(rawRows[0] || {}).join(', ');
    throw badRequest(`Не удалось найти поле с названием товара среди [${found}]. Сопоставьте поле «Название».`);
  }
  return products.map((r) => ({ id: uuid(), ...r }));
}

/**
 * Импорт каталога по URL-фиду — полностью в фоне. Запрос лишь создаёт задачу с конфигом фида и
 * мгновенно отвечает; фоновая prepare-фаза качает и парсит фид, затем чанковая обработка считает
 * эмбеддинги и пишет товары партиями. Работает даже на строгих лимитах времени функций.
 */
export async function importProductsFromUrl(orgId, agentId, { url, method, headers, format, itemSelector, mapping }) {
  await assertAgentOwnership(orgId, agentId);
  const jobId = uuid();
  await catalogRepo.insertFeedImportJob({
    id: jobId,
    agentId,
    sourceConfig: { url, method, headers, format, itemSelector, mapping },
  });
  await enqueueCatalogImport({ jobId, agentId, phase: 'prepare' });
  return { jobId, total: 0 };
}

/**
 * Предпросмотр фида без импорта: возвращает определённый формат, тег товара, число позиций,
 * список доступных полей, предложенный авто-маппинг и несколько примеров строк — чтобы владелец
 * сопоставил поля вручную перед импортом. Большой фид читается частично (PREVIEW_MAX_BYTES).
 */
export async function previewFeed(orgId, agentId, { url, method, headers, format, itemSelector }) {
  await assertAgentOwnership(orgId, agentId);
  const { rawRows, format: detected, itemTag, truncated } = await fetchFeedRows(
    url,
    { method, headers, format, itemSelector },
    PREVIEW_MAX_BYTES
  );
  const fields = Array.from(new Set(rawRows.slice(0, 50).flatMap((r) => Object.keys(r || {}))));
  const suggestedMapping = rawRows.length ? inferColumns(rawRows) : {};
  return { format: detected, itemTag, count: rawRows.length, truncated, fields, suggestedMapping, sample: rawRows.slice(0, 5) };
}

export async function getImportJobStatus(orgId, agentId, jobId) {
  await assertAgentOwnership(orgId, agentId);
  const job = await catalogRepo.getImportJob(jobId, agentId);
  if (!job) throw notFound('Задача импорта не найдена');
  return { status: job.status, processed: job.processedRows, total: job.totalRows, error: job.errorMessage };
}

export default { createProduct, listProducts, updateProduct, deleteProduct, clearProducts, importProducts, importProductsFromUrl, previewFeed, getImportJobStatus };

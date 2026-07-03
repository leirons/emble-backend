import * as cheerio from 'cheerio';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { AppError } from '../../lib/errors.js';

/**
 * Извлекает читаемый текст из PDF-буфера.
 */
export async function extractFromPdf(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Извлекает текст из DOCX-буфера.
 */
export async function extractFromDocx(buffer) {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

/**
 * Извлекает текст по MIME-типу файла.
 */
export async function extractFromFile(buffer, mimeType) {
  if (mimeType === 'application/pdf') return extractFromPdf(buffer);
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractFromDocx(buffer);
  }
  if (mimeType.startsWith('text/')) return buffer.toString('utf8');
  throw new AppError(`Неподдерживаемый тип файла: ${mimeType}`, 400);
}

/**
 * Загружает страницу по URL и вытаскивает основной текст, отбрасывая
 * навигацию/скрипты/стили — упрощённый аналог "readability".
 */
export async function extractFromUrl(url, extraHeaders = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'EmbleBot/1.0 (+https://emble.ai)', ...extraHeaders },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new AppError(`Не удалось загрузить страницу: HTTP ${res.status}`, 400);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  $('script, style, nav, footer, header, noscript, svg, iframe').remove();

  const title = $('title').first().text().trim();
  const main = $('main').length ? $('main') : $('body');
  const text = main
    .find('p, h1, h2, h3, h4, li')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .join('\n\n');

  return { title, text: text || $('body').text().trim() };
}

export default { extractFromPdf, extractFromDocx, extractFromFile, extractFromUrl };

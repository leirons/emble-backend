import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePriceConstraint,
  filterByPrice,
  formatProductRecommendation,
  detectLanguage,
  buildSystemPrompt,
  checkEscalation,
  estimateTokens,
} from '../src/modules/chat/chat.logic.js';

// --- parsePriceConstraint: бюджет из естественного языка ---

test('parsePriceConstraint reads an upper bound from "до N"', () => {
  assert.deepEqual(parsePriceConstraint('покажи что-то до 1000'), { maxPrice: 1000 });
});

test('parsePriceConstraint reads a lower bound from "от N"', () => {
  assert.deepEqual(parsePriceConstraint('от 500'), { minPrice: 500 });
});

test('parsePriceConstraint expands the "к"/"тыс" thousands suffix', () => {
  assert.deepEqual(parsePriceConstraint('бюджет 5к'), { maxPrice: 5000 });
});

test('parsePriceConstraint normalises non-breaking-space thousands separators', () => {
  // «2 000» с неразрывным пробелом должно распознаться как 2000, иначе бюджетный фильтр не сработает.
  assert.deepEqual(parsePriceConstraint('не дороже 2 000'), { maxPrice: 2000 });
});

test('parsePriceConstraint returns an empty object when there is no price', () => {
  assert.deepEqual(parsePriceConstraint('расскажите про доставку'), {});
});

// --- filterByPrice: отсечение каталога по бюджету ---

const CATALOG = [
  { name: 'A', price: 500 },
  { name: 'B', price: 1500 },
  { name: 'C', price: null },
];

test('filterByPrice keeps everything when no constraint is given', () => {
  assert.equal(filterByPrice(CATALOG, {}).length, 3);
});

test('filterByPrice drops items above maxPrice and items with no price', () => {
  const out = filterByPrice(CATALOG, { maxPrice: 1000 });
  assert.deepEqual(out.map((p) => p.name), ['A']);
});

test('filterByPrice drops items below minPrice', () => {
  const out = filterByPrice(CATALOG, { minPrice: 1000 });
  assert.deepEqual(out.map((p) => p.name), ['B']);
});

// --- formatProductRecommendation: fallback-ответ без LLM ---

test('formatProductRecommendation lists up to two products with price and link', () => {
  const text = formatProductRecommendation([
    { name: 'Куртка', price: 3000, currency: '₴', url: 'https://shop/x' },
    { name: 'Шапка', price: 500, currency: '₴' },
    { name: 'Третий', price: 1, currency: '₴' },
  ]);
  assert.ok(text.includes('Куртка'));
  assert.ok(text.includes('Шапка'));
  assert.ok(!text.includes('Третий'), 'должно быть максимум 2 товара');
  assert.ok(text.includes('https://shop/x'));
});

// --- detectLanguage: грубое определение языка ответа ---

test('detectLanguage distinguishes uk / ru / en and null', () => {
  assert.equal(detectLanguage('Скільки коштує доставка?'), 'uk');
  assert.equal(detectLanguage('Сколько стоит доставка?'), 'ru');
  assert.equal(detectLanguage('How much is shipping?'), 'en');
  assert.equal(detectLanguage('12345 ?!'), null);
});

// --- checkEscalation: перевод на оператора по ключевым словам ---

test('checkEscalation matches a keyword case-insensitively only when enabled', () => {
  const settings = { escalationEnabled: true, escalationKeywords: ['оператор', 'жалоба'] };
  assert.equal(checkEscalation('позовите ОПЕРАТОРА', settings), true);
  assert.equal(checkEscalation('спасибо', settings), false);
});

test('checkEscalation is disabled unless escalationEnabled is set', () => {
  assert.equal(checkEscalation('оператор', { escalationEnabled: false, escalationKeywords: ['оператор'] }), false);
});

test('checkEscalation tolerates undefined text and missing keywords', () => {
  assert.equal(checkEscalation(undefined, { escalationEnabled: true }), false);
  assert.equal(checkEscalation(undefined, { escalationEnabled: true, escalationKeywords: ['x'] }), false);
});

// --- buildSystemPrompt: анти-галлюцинации + fallback-подсказка ---

const AGENT = { systemPrompt: 'Ты — ассистент.' };
const EMPTY_CTX = { contextChunks: [], qaMatches: [], productMatches: [] };

test('buildSystemPrompt always includes the strict "do not invent" rules', () => {
  const p = buildSystemPrompt(AGENT, { ...EMPTY_CTX, settings: {}, userText: 'вопрос' });
  assert.ok(p.includes('НЕ ВЫДУМЫВАЙ'));
  assert.ok(p.includes('ОПИРАЯСЬ ТОЛЬКО'));
});

test('buildSystemPrompt offers contact capture only when emailFallbackEnabled', () => {
  const withFallback = buildSystemPrompt(AGENT, { ...EMPTY_CTX, settings: { emailFallbackEnabled: true }, userText: 'q' });
  assert.ok(withFallback.includes('оставить контакт'));
  const without = buildSystemPrompt(AGENT, { ...EMPTY_CTX, settings: { emailFallbackEnabled: false }, userText: 'q' });
  assert.ok(without.includes('переформулировать вопрос'));
  assert.ok(!without.includes('оставить контакт'));
});

test('buildSystemPrompt pins the answer language when autoLanguage is on', () => {
  const uk = buildSystemPrompt(AGENT, { ...EMPTY_CTX, settings: { autoLanguage: true }, userText: 'Скільки коштує?' });
  assert.ok(uk.includes('украинском'));
});

test('buildSystemPrompt embeds retrieved knowledge, Q&A and catalog blocks', () => {
  const p = buildSystemPrompt(AGENT, {
    contextChunks: [{ content: 'Доставка 1-2 дня' }],
    qaMatches: [{ question: 'Есть возврат?', answer: 'Да, 14 дней' }],
    productMatches: [{ name: 'Куртка', price: 3000, currency: '₴', url: 'https://s/x', description: 'тёплая' }],
    settings: {},
    userText: 'q',
  });
  assert.ok(p.includes('Доставка 1-2 дня'));
  assert.ok(p.includes('Да, 14 дней'));
  assert.ok(p.includes('Куртка'));
});

// --- estimateTokens: грубая оценка для метеринга ---

test('estimateTokens approximates ~4 chars per token and handles empty input', () => {
  assert.equal(estimateTokens('abcd'), 1);
  assert.equal(estimateTokens('abcde'), 2);
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens(null), 0);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { funnelRate, computeTopics } from '../src/modules/analytics/analytics.service.js';

// --- funnelRate: конверсия шага воронки, всегда в [0, 100] ---

test('funnelRate computes a normal conversion percentage', () => {
  assert.equal(funnelRate(3, 4), 75);
  assert.equal(funnelRate(1, 2), 50);
  assert.equal(funnelRate(1, 3), 33.3); // округление до 1 знака
});

test('funnelRate returns 0 when denominator is 0 or missing', () => {
  assert.equal(funnelRate(5, 0), 0);
  assert.equal(funnelRate(5, null), 0);
  assert.equal(funnelRate(5, undefined), 0);
});

test('funnelRate clamps to 100 when the step count exceeds the previous step', () => {
  // Реальный случай: chat_started логируется на сервере надёжно, а widget_opened
  // приходит через best-effort sendBeacon и может теряться → числитель > знаменателя.
  assert.equal(funnelRate(18, 2), 100);
  assert.equal(funnelRate(1, 1), 100);
});

// --- computeTopics: тематическая классификация вопросов без LLM ---

test('computeTopics groups questions into top categories with percentages', () => {
  const texts = ['доставка', 'отправка посылки', 'оплата'];
  const topics = computeTopics(texts);
  const delivery = topics.find((t) => t.name === 'Доставка');
  const payment = topics.find((t) => t.name === 'Оплата');
  assert.ok(delivery, 'должна быть тема Доставка');
  assert.equal(delivery.count, 2);
  assert.ok(payment, 'должна быть тема Оплата');
  assert.equal(payment.count, 1);
  // проценты нормированы к сумме совпадений (2 + 1 = 3)
  assert.equal(delivery.pct, 67);
  assert.equal(payment.pct, 33);
});

test('computeTopics returns at most 5 topics, sorted by frequency', () => {
  const texts = [
    'доставка', 'доставка', 'доставка',
    'оплата', 'оплата',
    'возврат',
    'цена скидка',
    'размер ткань',
    'каталог ассортимент',
  ];
  const topics = computeTopics(texts);
  assert.ok(topics.length <= 5);
  assert.equal(topics[0].name, 'Доставка'); // самая частая — первой
  for (let i = 1; i < topics.length; i++) {
    assert.ok(topics[i - 1].count >= topics[i].count, 'отсортировано по убыванию');
  }
});

test('computeTopics ignores empty/blank input and returns [] when nothing matches', () => {
  assert.deepEqual(computeTopics([]), []);
  assert.deepEqual(computeTopics(['', '   ', null, undefined]), []);
  assert.deepEqual(computeTopics(['qwerty zxcvbn нетакойтемы']), []);
});

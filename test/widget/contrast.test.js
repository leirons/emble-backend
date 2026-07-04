// ACM-34: контраст текста виджета. Проверяем, что getAccessibleTextColor подбирает
// читаемый цвет текста (тёмный/светлый) под любой фон и всегда даёт WCAG AA (>= 4.5:1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// embed.js — браузерный IIFE (не ES-модуль). Вне браузера (document === undefined) он
// кладёт чистые утилиты в module.exports и завершает инициализацию. Прогоняем исходник
// с подставленным объектом module, чтобы забрать эти функции без DOM.
const src = readFileSync(new URL('../../public/embed.js', import.meta.url), 'utf8');
const mod = { exports: {} };
// eslint-disable-next-line no-new-func
new Function('module', src)(mod);
const { getAccessibleTextColor, parseColorToRgb, relativeLuminance, contrastRatio } = mod.exports;

const DARK = '#1A1A1A';
const LIGHT = '#FFFFFF';

function ratioBetween(a, b) {
  return contrastRatio(relativeLuminance(parseColorToRgb(a)), relativeLuminance(parseColorToRgb(b)));
}

test('светлый фон → тёмный текст', () => {
  assert.equal(getAccessibleTextColor('#FFFFFF'), DARK);
  assert.equal(getAccessibleTextColor('#FFEB3B'), DARK); // ярко-жёлтый бренд
  assert.equal(getAccessibleTextColor('#F5F5F5'), DARK);
});

test('тёмный фон → светлый текст', () => {
  assert.equal(getAccessibleTextColor('#000000'), LIGHT);
  assert.equal(getAccessibleTextColor('#11151F'), LIGHT); // фон панели виджета
  assert.equal(getAccessibleTextColor('#1B2A4A'), LIGHT);
});

test('брендовые цвета получают контрастный к фону текст (AA >= 4.5:1)', () => {
  // Малиновый бренд по умолчанию контактной карточки — светлый текст (белый даёт 5.6:1).
  assert.equal(getAccessibleTextColor('#c9105f'), LIGHT);
  // Мятный/лаймовый светлый бренд — тёмный текст.
  assert.equal(getAccessibleTextColor('#4ade80'), DARK);
  // Индиго #6366F1 (бренд по умолчанию) — серединный тон: белый даёт лишь 4.47:1 (провал AA),
  // поэтому берём чистый чёрный (#000000, 4.70:1). Ключевая проверка: любой выбор проходит AA.
  const indigoFg = getAccessibleTextColor('#6366F1');
  assert.equal(indigoFg, '#000000');
  assert.ok(ratioBetween(indigoFg, '#6366F1') >= 4.5);
});

test('серединно-серый фон усиливает тёмный текст до чистого чёрного', () => {
  // На #808080 токен #1A1A1A даёт лишь ~4.4:1 — недостаточно для AA, поэтому берём #000000.
  assert.equal(getAccessibleTextColor('#808080'), '#000000');
  assert.ok(ratioBetween('#000000', '#808080') >= 4.5);
});

test('поддержка короткого hex и rgb()', () => {
  assert.equal(getAccessibleTextColor('#fff'), DARK);
  assert.equal(getAccessibleTextColor('#000'), LIGHT);
  assert.equal(getAccessibleTextColor('rgb(255, 255, 255)'), DARK);
  assert.equal(getAccessibleTextColor('rgba(20, 20, 20, 1)'), LIGHT);
});

test('нераспознанный фон → безопасный тёмный текст', () => {
  assert.equal(getAccessibleTextColor(undefined), DARK);
  assert.equal(getAccessibleTextColor(''), DARK);
  assert.equal(getAccessibleTextColor('rebeccapurple'), DARK); // именованные цвета не парсим
  assert.equal(getAccessibleTextColor('rgb(300, 0, 0)'), DARK); // вне диапазона
});

test('выбранный текст всегда даёт >= 4.5:1 контраст к фону', () => {
  // Перебор по сетке + крайние/пороговые точки (L≈0.179 — минимум контраста ~4.58:1).
  const samples = ['#000000', '#FFFFFF', '#808080', '#767676', '#777777', '#6366F1', '#c9105f',
    '#4ade80', '#FFEB3B', '#11151F', '#123456', '#abcdef'];
  for (let r = 0; r <= 255; r += 51) {
    for (let g = 0; g <= 255; g += 51) {
      for (let b = 0; b <= 255; b += 51) {
        samples.push('#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''));
      }
    }
  }
  for (const bg of samples) {
    const fg = getAccessibleTextColor(bg);
    assert.notEqual(fg.toLowerCase(), bg.toLowerCase(), `текст не должен совпадать с фоном ${bg}`);
    const ratio = ratioBetween(fg, bg);
    assert.ok(ratio >= 4.5, `контраст ${ratio.toFixed(2)}:1 < 4.5:1 для фона ${bg} (текст ${fg})`);
  }
});

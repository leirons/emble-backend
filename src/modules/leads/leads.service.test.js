import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leadsToCsv } from './leads.service.js';

// Фокус: CSV-экспорт лидов из CRM-вью должен нести атрибуцию источника и корректно
// экранировать спецсимволы. Чистая функция — без БД. Покрывает регрессию ACM-9,
// где колонка «Источник» ранее отсутствовала в экспорте.

const iso = '2026-07-03T07:59:25.512Z';

test('leadsToCsv: заголовок содержит колонку Источник', () => {
  const csv = leadsToCsv([]);
  const [header] = csv.replace('﻿', '').split('\r\n');
  assert.equal(header, 'Дата,Имя,Email,Телефон,Источник,Диалог');
});

test('leadsToCsv: source из captured_fields попадает в строку', () => {
  const csv = leadsToCsv([
    { createdAt: iso, name: 'Ann', email: 'a@example.com', phone: null, capturedFields: { source: 'manual' }, conversationId: null },
  ]);
  const line = csv.replace('﻿', '').split('\r\n')[1];
  assert.equal(line, `${iso},Ann,a@example.com,,manual,`);
});

test('leadsToCsv: отсутствие source даёт пустую ячейку, а не undefined', () => {
  const csv = leadsToCsv([
    { createdAt: iso, name: null, email: 'b@example.com', phone: null, capturedFields: {}, conversationId: null },
  ]);
  const line = csv.replace('﻿', '').split('\r\n')[1];
  assert.equal(line, `${iso},,b@example.com,,,`);
});

test('leadsToCsv: экранирует запятые/кавычки в значениях', () => {
  const csv = leadsToCsv([
    { createdAt: iso, name: 'Doe, "JD"', email: 'c@example.com', phone: null, capturedFields: { source: 'auto' }, conversationId: null },
  ]);
  const line = csv.replace('﻿', '').split('\r\n')[1];
  assert.ok(line.includes('"Doe, ""JD"""'), `экранирование не сработало: ${line}`);
});

test('leadsToCsv: начинается с UTF-8 BOM для Excel', () => {
  assert.ok(leadsToCsv([]).startsWith('﻿'));
});

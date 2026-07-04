/**
 * Чистая (без БД/сети/LLM) логика чата: разбор ценовых ограничений, фильтрация каталога,
 * определение языка, сборка системного промпта, проверка эскалации, оценка токенов.
 * Вынесено из chat.service.js, чтобы покрыть тестами без подключения к Postgres/Redis/LLM.
 */

const CHARS_PER_TOKEN = 4; // грубая оценка расхода токенов для метеринга, без вызова отдельного tokenizer'а

export function estimateTokens(text) {
  return Math.ceil((text || '').length / CHARS_PER_TOKEN);
}

/**
 * Достаёт из сообщения ценовое ограничение: «до 1000», «дешевле 1500», «не дороже 2 000»,
 * «от 500», «в пределах 1000», «5к». Возвращает { maxPrice?, minPrice? }.
 */
export function parsePriceConstraint(text) {
  // Нормализуем неразрывные пробелы (NBSP/narrow NBSP), которыми часто разделяют разряды
  // («2 000»), в обычные — иначе регэкспы ниже не поймают число.
  const t = String(text || '').toLowerCase().replace(/[  ]/g, ' ');
  const toNum = (numStr, mult) => {
    const n = parseInt(String(numStr).replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(n)) return null;
    return mult ? n * 1000 : n;
  };
  const result = {};
  // «дешевле/меньше» = максимум, «дороже/больше» = минимум; «не» переворачивает смысл,
  // поэтому голые слова берём только без предшествующего «не» (?<!не ).
  const maxRe = /(?:до|менее|в пределах|максимум|макс|бюджет|не дороже|недороже|не больше|(?<!не )(?:дешевле|меньше))\s*(\d[\d\s]*)\s*(к|тыс|k)?(?![а-яёa-z])/i;
  const minRe = /(?:от|минимум|не меньше|не дешевле|(?<!не )(?:дороже|больше))\s*(\d[\d\s]*)\s*(к|тыс|k)?(?![а-яёa-z])/i;
  const mMax = maxRe.exec(t);
  if (mMax) { const v = toNum(mMax[1], !!mMax[2]); if (v != null) result.maxPrice = v; }
  const mMin = minRe.exec(t);
  if (mMin) { const v = toNum(mMin[1], !!mMin[2]); if (v != null) result.minPrice = v; }
  return result;
}

/** Отфильтровывает товары по бюджету (для результатов векторного поиска). */
export function filterByPrice(products, { maxPrice = null, minPrice = null } = {}) {
  if (maxPrice == null && minPrice == null) return products;
  return products.filter((p) => {
    if (p.price == null) return false;
    const price = Number(p.price);
    if (maxPrice != null && price > maxPrice) return false;
    if (minPrice != null && price < minPrice) return false;
    return true;
  });
}

/** Мягко и аккуратно советует пару товаров из каталога (без обращения к LLM). */
export function formatProductRecommendation(products) {
  const items = products
    .slice(0, 2)
    .map((p) => {
      const price = p.price != null ? ` — ${p.price} ${p.currency || ''}`.trimEnd() : '';
      const link = p.url ? `\n${p.url}` : '';
      return `• ${p.name}${price}${link}`;
    })
    .join('\n\n');
  const tail = products.length > 1 ? 'ось що може підійти' : 'ось що могло б підійти';
  return `Якщо шукаєте щось із нашого асортименту, ${tail}:\n\n${items}\n\nПідказати щось ще?`;
}

/** Грубое определение языка последнего сообщения: 'uk' | 'ru' | 'en' | null. */
export function detectLanguage(text) {
  const t = String(text || '');
  const letters = t.match(/\p{L}/gu) || [];
  if (letters.length === 0) return null;
  let cyr = 0;
  let lat = 0;
  for (const ch of letters) {
    if (/[Ѐ-ӿ]/.test(ch)) cyr += 1;
    else if (/[a-zA-Z]/.test(ch)) lat += 1;
  }
  if (cyr === 0) return lat > 0 ? 'en' : null;
  // Украинский: специфические буквы (і, ї, є, ґ) или характерные слова.
  if (
    /[іїєґ]/i.test(t) ||
    /(дяку|привіт|вартість|цікав|будь ласка|ласкаво|скільки|потріб|замовлен|гаразд|вітаю|маєте|українськ|російськ|гривень|щось|кошту|треба)/i.test(t)
  ) {
    return 'uk';
  }
  return 'ru';
}

export const LANG_NAMES = {
  uk: 'українською (українською мовою)',
  ru: 'російською',
  en: 'англійською (in English)',
};

export function buildSystemPrompt(agent, { contextChunks, qaMatches, productMatches, settings, userText }) {
  let prompt = agent.systemPrompt || 'Ти — корисний ІІ-асистент на сайті компанії.';

  if (qaMatches.length > 0) {
    const qaBlock = qaMatches.map((q, i) => `[Q&A ${i + 1}] Вопрос: ${q.question}\nОтвет: ${q.answer}`).join('\n\n');
    prompt +=
      `\n\nНижче — заздалегідь підготовлені відповіді на схожі запитання. Якщо запитання користувача ` +
      `збігається за змістом з одним із них — використовуй готову відповідь як є або майже без змін.\n\n${qaBlock}`;
  }

  if (productMatches.length > 0) {
    const productBlock = productMatches
      .map((p, i) => {
        const price = p.price != null ? `${p.price} ${p.currency}` : 'ціна не вказана';
        const link = p.url ? `, ссылка: ${p.url}` : '';
        return `[Товар ${i + 1}] ${p.name} — ${price}${link}\n${p.description || ''}`.trim();
      })
      .join('\n\n');
    prompt +=
      `\n\nТовари з каталогу компанії, які можуть підійти під запит. Якщо це доречно, ` +
      `м'яко і ненав'язливо порадь 1–2 підходящих варіанти — без тиску, как дружелюбний консультант. ` +
      `Використовуй ТОЧНІ назву, ціну та посилання зі списку нижче і не вигадуй інші товари чи характеристики:\n\n${productBlock}`;
  }

  if (contextChunks.length > 0) {
    const context = contextChunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n');
    prompt += `\n\n--- КОНТЕКСТ ---\n${context}\n--- КІНЕЦЬ КОНТЕКСТА ---`;
  }

  // Строгие анти-галлюцинационные инструкции + осознанный сбор контакта. Тип контакта
  // (email/телефон) задаётся владельцем в настройках агента (leadContactType).
  const contactWord = settings?.leadContactType === 'phone' ? 'номер телефону' : 'email';
  const fallbackHint = settings?.emailFallbackEnabled
    ? ` та запропонуй залишити ${contactWord}, чтобы с клиентом связался специалист`
    : ' та запропонуй переформулювати запитання або зв\'язатися з підтримкою';

  const rules = [
    'Відповідай на запитання користувача, СПИРАЮЧИСЬ ТІЛЬКИ на наведений вище контекст (база знань, Q&A, каталог).',
    'Якщо відповіді немає в контексті — НЕ ВИГАДУЙ факти, ціни, характеристики або обіцянки. ' +
      `Ввічливо вибачся, що не володієш цією інформацією${fallbackHint}.`,
  ];

  // Ключевое правило сбора лида: распознавать запросы, требующие участия человека, и активно
  // предлагать оставить контакт — даже когда частичный ответ уже есть в контексте (например,
  // правила возврата описаны, но саму заявку на возврат оформляет сотрудник).
  if (settings?.emailFallbackEnabled) {
    rules.push(
      'Якщо запит користувача вимагає участі людини або оформлення заявки — повернення або обмін ' +
        'товару, брак / дефект / претензія, гарантія, рекламація, статус або скасування замовлення, доставка, ' +
        'індивідуальний розрахунок або подбор, бронювання, скарга, прохання «зв\'яжіться зі мною» — ' +
        `ОБОВ'ЯЗКОВО запропонуй залишити ${contactWord}, щоб із клієнтом зв'язався спеціаліст. Спочатку ` +
        'коротко дай відповідь по суті на основі контексту (наприклад, умови повернення браку), а потім запропонуй ' +
        `залишити ${contactWord} для оформлення. Не чекай, поки клієнт попросить сам.`
    );
  }

  rules.push('Будь коротким і по суті.');

  if (settings?.autoLanguage) {
    const langName = LANG_NAMES[detectLanguage(userText)];
    rules.push(
      langName
        ? `МОВА ВІДПОВІДІ: пиши відповідь ВИКЛЮЧНО ${langName} мовою, навіть если контекст, база знань ` +
            'або товари написані іншою мовою. Ніколи не перемикай мову — це обов\'язкове правило.'
        : 'Відповідай тією ж мовою, якою написав користувач.'
    );
  }

  prompt += `\n\nВАЖЛИВІ ПРАВИЛА:\n` + rules.map((r, i) => `${i + 1}. ${r}`).join('\n');

  return prompt;
}

export function checkEscalation(userText, settings) {
  if (!settings?.escalationEnabled) return false;
  const lower = String(userText || '').toLowerCase();
  return (settings.escalationKeywords || []).some((kw) => kw && lower.includes(kw.toLowerCase()));
}

export default {
  estimateTokens,
  parsePriceConstraint,
  filterByPrice,
  formatProductRecommendation,
  detectLanguage,
  LANG_NAMES,
  buildSystemPrompt,
  checkEscalation,
};

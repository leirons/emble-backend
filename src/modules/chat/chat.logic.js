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
  const tail = products.length > 1 ? 'вот что может подойти' : 'вот что могло бы подойти';
  return `Если ищете что-то из нашего ассортимента, ${tail}:\n\n${items}\n\nПодсказать что-то ещё?`;
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
  uk: 'украинском (українською мовою)',
  ru: 'русском',
  en: 'английском (in English)',
};

export function buildSystemPrompt(agent, { contextChunks, qaMatches, productMatches, settings, userText }) {
  let prompt = agent.systemPrompt || 'Ты — полезный ИИ-ассистент на сайте компании.';

  if (qaMatches.length > 0) {
    const qaBlock = qaMatches.map((q, i) => `[Q&A ${i + 1}] Вопрос: ${q.question}\nОтвет: ${q.answer}`).join('\n\n');
    prompt +=
      `\n\nНиже — заранее подготовленные ответы на похожие вопросы. Если вопрос пользователя ` +
      `совпадает по смыслу с одним из них — используй готовый ответ как есть или почти без изменений.\n\n${qaBlock}`;
  }

  if (productMatches.length > 0) {
    const productBlock = productMatches
      .map((p, i) => {
        const price = p.price != null ? `${p.price} ${p.currency}` : 'цена не указана';
        const link = p.url ? `, ссылка: ${p.url}` : '';
        return `[Товар ${i + 1}] ${p.name} — ${price}${link}\n${p.description || ''}`.trim();
      })
      .join('\n\n');
    prompt +=
      `\n\nТовары из каталога компании, которые могут подойти под запрос. Если это уместно, ` +
      `мягко и ненавязчиво посоветуй 1–2 подходящих варианта — без давления, как дружелюбный консультант. ` +
      `Используй ТОЧНЫЕ название, цену и ссылку из списка ниже и не выдумывай другие товары или характеристики:\n\n${productBlock}`;
  }

  if (contextChunks.length > 0) {
    const context = contextChunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n');
    prompt += `\n\n--- КОНТЕКСТ ---\n${context}\n--- КОНЕЦ КОНТЕКСТА ---`;
  }

  // Строгие анти-галлюцинационные инструкции + осознанный сбор контакта. Тип контакта
  // (email/телефон) задаётся владельцем в настройках агента (leadContactType).
  const contactWord = settings?.leadContactType === 'phone' ? 'номер телефона' : 'email';
  const fallbackHint = settings?.emailFallbackEnabled
    ? ` и предложи оставить ${contactWord}, чтобы с клиентом связался специалист`
    : ' и предложи переформулировать вопрос или связаться с поддержкой';

  const rules = [
    'Отвечай на вопрос пользователя, ОПИРАЯСЬ ТОЛЬКО на приведённый выше контекст (база знаний, Q&A, каталог).',
    'Если ответа нет в контексте — НЕ ВЫДУМЫВАЙ факты, цены, характеристики или обещания. ' +
      `Вежливо извинись, что не располагаешь этой информацией${fallbackHint}.`,
  ];

  // Ключевое правило сбора лида: распознавать запросы, требующие участия человека, и активно
  // предлагать оставить контакт — даже когда частичный ответ уже есть в контексте (например,
  // правила возврата описаны, но саму заявку на возврат оформляет сотрудник).
  if (settings?.emailFallbackEnabled) {
    rules.push(
      'Если запрос пользователя требует участия человека или оформления заявки — возврат или обмен ' +
        'товара, брак / дефект / претензия, гарантия, рекламация, статус либо отмена заказа, доставка, ' +
        'индивидуальный расчёт или подбор, бронирование, жалоба, просьба «свяжитесь со мной» — ' +
        `ОБЯЗАТЕЛЬНО предложи оставить ${contactWord}, чтобы с клиентом связался специалист. Сначала ` +
        'коротко ответь по сути на основе контекста (например, условия возврата брака), а затем предложи ' +
        `оставить ${contactWord} для оформления. Не жди, пока клиент попросит сам.`
    );
  }

  rules.push('Будь краток и по существу.');

  if (settings?.autoLanguage) {
    const langName = LANG_NAMES[detectLanguage(userText)];
    rules.push(
      langName
        ? `ЯЗЫК ОТВЕТА: пиши ответ ИСКЛЮЧИТЕЛЬНО на ${langName} языке, даже если контекст, база знаний ` +
            'или товары написаны на другом языке. Никогда не переключай язык — это обязательное правило.'
        : 'Отвечай на том же языке, на котором написал пользователь.'
    );
  }

  prompt += `\n\nВАЖНЫЕ ПРАВИЛА:\n` + rules.map((r, i) => `${i + 1}. ${r}`).join('\n');

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

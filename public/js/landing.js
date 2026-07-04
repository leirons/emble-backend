(function () {
  const TEMPLATES = [
    {
      id: 'support', name: 'Чат-поддержка', desc: 'Отвечает на вопросы клиентов 24/7',
      accent: '#6366F1', accent2: '#8B5CF6', glow: 'rgba(99,102,241,0.45)', chipBg: 'rgba(99,102,241,0.08)', initial: 'Ч',
      greeting: 'Здравствуйте! Я на связи 24/7 — расскажите, с чем помочь.',
      replies: ['Статус заказа', 'Оформить возврат', 'Позвать оператора'],
    },
    {
      id: 'sales', name: 'Помощник продаж', desc: 'Ведёт клиента к покупке',
      accent: '#10B981', accent2: '#34D399', glow: 'rgba(16,185,129,0.42)', chipBg: 'rgba(16,185,129,0.08)', initial: 'П',
      greeting: 'Ищете что-то конкретное? Помогу подобрать подходящий вариант.',
      replies: ['Подобрать тариф', 'Сравнить планы', 'Получить скидку'],
    },
    {
      id: 'leads', name: 'Генератор лидов', desc: 'Собирает и квалифицирует контакты',
      accent: '#8B5CF6', accent2: '#A78BFA', glow: 'rgba(139,92,246,0.44)', chipBg: 'rgba(139,92,246,0.08)', initial: 'Г',
      greeting: 'Оставьте контакт — пришлём персональное демо под вашу задачу.',
      replies: ['Заказать демо', 'Скачать прайс', 'Заказать звонок'],
    },
  ];

  const BRAND_COLORS = [
    { color: '#6366F1', glow: 'rgba(99,102,241,0.4)' },
    { color: '#10B981', glow: 'rgba(16,185,129,0.4)' },
    { color: '#8B5CF6', glow: 'rgba(139,92,246,0.4)' },
    { color: '#F59E0B', glow: 'rgba(245,158,11,0.4)' },
    { color: '#EC4899', glow: 'rgba(236,72,153,0.4)' },
  ];

  let activeTemplateId = 'support';
  let brand = BRAND_COLORS[0];

  const templateList = document.getElementById('templateList');
  const widgetPreview = document.getElementById('widgetPreview');
  const wInitial = document.getElementById('wInitial');
  const wName = document.getElementById('wName');
  const wGreeting = document.getElementById('wGreeting');
  const wChips = document.getElementById('wChips');
  const wLauncher = document.getElementById('wLauncher');

  function renderTemplateList() {
    templateList.innerHTML = TEMPLATES.map((t) => `
      <button class="template-btn${t.id === activeTemplateId ? ' active' : ''}" data-id="${t.id}"
        style="--accent:${t.accent}; --glow:${t.glow};">
        <span class="ring"></span>
        <span class="template-avatar">${t.initial}</span>
        <span class="template-copy">
          <span class="name">${t.name}</span>
          <span class="desc">${t.desc}</span>
        </span>
      </button>
    `).join('');
    templateList.querySelectorAll('.template-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTemplateId = btn.dataset.id;
        renderTemplateList();
        renderWidgetPreview();
      });
    });
  }

  function renderWidgetPreview() {
    const t = TEMPLATES.find((x) => x.id === activeTemplateId);
    widgetPreview.style.setProperty('--accent', t.accent);
    widgetPreview.style.setProperty('--accent2', t.accent2);
    widgetPreview.style.setProperty('--glow', t.glow);
    widgetPreview.style.setProperty('--chip-bg', t.chipBg);
    wLauncher.style.setProperty('--accent', t.accent);
    wLauncher.style.setProperty('--glow', t.glow);
    wInitial.textContent = t.initial;
    wName.textContent = t.name;
    wGreeting.textContent = t.greeting;
    wChips.innerHTML = t.replies.map((r) => `<span class="widget-chip">${r}</span>`).join('');
  }

  const colorRow = document.getElementById('colorRow');
  const brandPreviewHeader = document.getElementById('brandPreviewHeader');
  const brandPreviewChips = document.getElementById('brandPreviewChips');
  const brandPreviewSend = document.getElementById('brandPreviewSend');
  const brandPreviewCard = document.getElementById('brandPreviewCard');

  function renderColorRow() {
    colorRow.innerHTML = BRAND_COLORS.map((c) => `
      <button class="color-swatch" data-color="${c.color}"
        style="background:${c.color}; border-color:${c.color === brand.color ? '#fff' : 'transparent'}; box-shadow:0 0 12px ${c.glow};"></button>
    `).join('') + `<span class="color-code" id="brandCode">${brand.color}</span>`;
    colorRow.querySelectorAll('.color-swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        const found = BRAND_COLORS.find((c) => c.color === btn.dataset.color);
        if (found) { brand = found; renderColorRow(); renderBrandPreview(); }
      });
    });
  }

  function renderBrandPreview() {
    brandPreviewHeader.style.background = brand.color;
    brandPreviewSend.style.background = brand.color;
    brandPreviewCard.style.boxShadow = `0 30px 70px rgba(0,0,0,0.55), 0 0 46px ${brand.glow}`;
    brandPreviewChips.innerHTML = ['Узнать цены', 'Заказать демо'].map((label) =>
      `<span style="font-size:12px; padding:7px 11px; border-radius:999px; border:1px solid ${brand.color}; color:${brand.color};">${label}</span>`
    ).join('');
  }

  renderTemplateList();
  renderWidgetPreview();
  renderColorRow();
  renderBrandPreview();

  const copyBtn = document.getElementById('copyCodeBtn');
  const copyLabel = document.getElementById('copyCodeLabel');
  copyBtn.addEventListener('click', () => {
    const tag = 'scr' + 'ipt';
    const code = `<${tag} src="https://cdn.emble.ai/embed.js" data-agent="agent-x9f2c" async></${tag}>`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    copyBtn.classList.add('copied');
    copyLabel.textContent = 'Скопировано';
    clearTimeout(copyBtn._t);
    copyBtn._t = setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyLabel.textContent = 'Copy Code';
    }, 1800);
  });

  // ---------- Живая песочница ----------
  const SEND_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 8 6 8-16-8z" fill="#fff"/></svg>';
  const CHAT_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H9l-5 4V5z" fill="#fff"/></svg>';
  const PG_ACCENTS = {
    '#6366F1': 'rgba(99,102,241,0.45)', '#10B981': 'rgba(16,185,129,0.42)',
    '#8B5CF6': 'rgba(139,92,246,0.44)', '#F59E0B': 'rgba(245,158,11,0.42)',
  };
  const pg = { form: 'floating', pos: 'right', theme: 'dark', accent: '#6366F1', open: true };

  const pgForm = document.getElementById('pgForm');
  const pgPos = document.getElementById('pgPos');
  const pgTheme = document.getElementById('pgTheme');
  const pgAccent = document.getElementById('pgAccent');
  const pgToggle = document.getElementById('pgToggle');
  const pgPage = document.getElementById('pgPage');
  const pgBrowser = document.getElementById('pgBrowser');
  const pgChrome = document.getElementById('pgChrome');
  const pgUrl = document.getElementById('pgUrl');

  function pgSeg(el, defs, key) {
    el.innerHTML = defs.map(([id, label]) =>
      `<button type="button" class="pg-seg${pg[key] === id ? ' active' : ''}" data-v="${id}">${label}</button>`
    ).join('');
    el.querySelectorAll('.pg-seg').forEach((b) =>
      b.addEventListener('click', () => { pg[key] = b.dataset.v; renderPlayground(); }));
  }

  function renderPlayground() {
    pgSeg(pgForm, [['floating', 'Floating Chat'], ['panel', 'Side Panel'], ['inline', 'Inline Block']], 'form');
    pgSeg(pgPos, [['left', 'Слева'], ['right', 'Справа']], 'pos');
    pgSeg(pgTheme, [['dark', 'Тёмная'], ['light', 'Светлая']], 'theme');
    pgAccent.innerHTML = Object.keys(PG_ACCENTS).map((c) =>
      `<button type="button" class="pg-acc${c === pg.accent ? ' active' : ''}" data-c="${c}" style="background:${c}; box-shadow:0 0 12px ${PG_ACCENTS[c]};"></button>`
    ).join('');
    pgAccent.querySelectorAll('.pg-acc').forEach((b) =>
      b.addEventListener('click', () => { pg.accent = b.dataset.c; renderPlayground(); }));

    pgToggle.classList.toggle('on', pg.open);
    pgToggle.style.background = pg.open ? pg.accent : 'rgba(255,255,255,0.14)';

    const light = pg.theme === 'light';
    const acc = pg.accent;
    const glow = PG_ACCENTS[acc];
    const side = pg.pos === 'left' ? 'left' : 'right';
    const blockStrong = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.09)';
    const blockSoft = light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)';
    const blockCard = light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.035)';

    pgBrowser.style.background = light ? '#F4F5F8' : '#0B0F19';
    pgChrome.style.background = light ? '#E6E8EE' : 'rgba(255,255,255,0.02)';
    pgChrome.style.borderBottom = '1px solid ' + (light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)');
    pgUrl.style.background = light ? '#FFFFFF' : 'rgba(255,255,255,0.04)';
    pgUrl.style.color = light ? '#8A90A0' : '#5B6472';

    const isInline = pg.form === 'inline';
    const isPanel = pg.form === 'panel';
    const isFloating = pg.form === 'floating';

    let html =
      `<div class="pg-h" style="background:${blockStrong};"></div>` +
      `<div class="pg-l" style="width:82%; background:${blockSoft};"></div>` +
      `<div class="pg-l" style="width:74%; background:${blockSoft};"></div>` +
      `<div class="pg-l" style="width:78%; background:${blockSoft}; margin-bottom:28px;"></div>`;

    if (isInline) {
      html += `<div class="pg-inline-widget" style="border-color:${light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}; background:${light ? '#FFFFFF' : '#11151F'}; box-shadow:0 12px 30px ${glow};">
        <div class="pg-iw-head" style="background:${acc};"><span class="pg-iw-av">AI</span><span class="pg-iw-name">Встроенный ассистент</span></div>
        <div class="pg-iw-body">
          <div class="pg-bubble" style="background:${light ? '#EEF0F5' : 'rgba(255,255,255,0.06)'}; color:${light ? '#3A3F4C' : '#D8DBE3'};">Готов ответить на вопросы прямо в статье — спросите что угодно.</div>
          <div class="pg-chips"><span class="pg-chip" style="border-color:${acc}; color:${acc};">Узнать цены</span><span class="pg-chip" style="border-color:${acc}; color:${acc};">Заказать демо</span></div>
        </div>
      </div>`;
    } else {
      html += `<div class="pg-cards"><div class="pg-card" style="background:${blockCard};"></div><div class="pg-card" style="background:${blockCard};"></div></div>`;
    }

    if (isFloating && pg.open) {
      html += `<div class="pg-float-window" style="${side}:26px; box-shadow:0 30px 60px rgba(0,0,0,0.5), 0 0 40px ${glow};">
        <div class="pg-fw-head" style="background:${acc};"><span class="pg-iw-av">AI</span><span class="pg-fw-meta"><span class="pg-fw-name">Ваш ассистент</span><span class="pg-fw-status"><span class="pg-online"></span> онлайн</span></span></div>
        <div class="pg-fw-body">
          <div class="pg-bubble" style="background:rgba(255,255,255,0.06); color:#D8DBE3;">Привет! Чем могу помочь сегодня?</div>
          <div class="pg-chips"><span class="pg-chip" style="border-color:${acc}; color:${acc};">Тарифы</span><span class="pg-chip" style="border-color:${acc}; color:${acc};">Демо</span></div>
          <div class="pg-input-row"><span class="pg-input">Сообщение…</span><span class="pg-send" style="background:${acc};">${SEND_SVG}</span></div>
        </div>
      </div>`;
    }
    if (isFloating) {
      html += `<div class="pg-launcher" style="${side}:26px; background:${acc}; box-shadow:0 12px 30px ${glow};">${CHAT_SVG}</div>`;
    }
    if (isPanel) {
      const borderSide = pg.pos === 'left' ? 'right' : 'left';
      html += `<div class="pg-panel" style="${side}:0; border-${borderSide}:1px solid rgba(255,255,255,0.1); box-shadow:0 0 60px ${glow};">
        <div class="pg-panel-head" style="background:${acc};"><span class="pg-iw-av">AI</span><span class="pg-fw-meta"><span class="pg-fw-name">Консультант</span><span class="pg-fw-status2">развёрнутая консультация</span></span></div>
        <div class="pg-panel-body">
          <div class="pg-bubble" style="background:rgba(255,255,255,0.06); color:#D8DBE3; margin-bottom:12px;">Здравствуйте! Расскажите о задаче — подберу решение и оформлю заявку.</div>
          <div class="pg-bubble-user" style="background:${acc};">Нужна интеграция с CRM</div>
        </div>
        <div class="pg-panel-foot"><span class="pg-input">Сообщение…</span><span class="pg-send" style="background:${acc};">${SEND_SVG}</span></div>
      </div>`;
    }
    pgPage.innerHTML = html;
  }
  if (pgPage) {
    pgToggle.addEventListener('click', () => { pg.open = !pg.open; renderPlayground(); });
    renderPlayground();
  }

  // ---------- Сценарии в действии ----------
  const SCENARIOS = {
    products: {
      label: '🛍️ Рекомендация товаров', emoji: '🛍️', botName: 'Ассистент магазина',
      title: 'Подбирает товар как живой продавец',
      desc: 'Агент уточняет потребность, учитывает бюджет и предлагает конкретные позиции с ценой и кнопкой покупки — прямо в чате.',
      points: ['Понимает запрос на естественном языке', 'Показывает карточки с ценой и скидкой', 'Ведёт клиента в корзину без ухода со страницы'],
      userMsg: 'Посоветуйте кроссовки для бега до 8000 ₽',
      botMsg: 'Конечно! Под бег и такой бюджет отлично подойдут два варианта 👇',
      replies: ['Показать ещё', 'Есть размер 42?', 'Сравнить модели'],
    },
    delivery: {
      label: '📦 Вопрос о доставке', emoji: '📦', botName: 'Поддержка доставки',
      title: 'Знает правила доставки магазина',
      desc: 'Агент обучен на условиях вашего магазина и уверенно отвечает на уточняющие вопросы — какие службы доступны, сроки и способы оплаты.',
      points: ['Знает доступные службы и способы доставки', 'Отвечает по правилам из вашей базы знаний', 'Снимает нагрузку с поддержки 24/7'],
      userMsg: 'Могу ли я оформить доставку Новой Почтой?',
      botMsg: 'Секунду, уточню по правилам магазина 👇',
      replies: ['Сроки доставки', 'Стоимость', 'Оплата при получении'],
    },
    leads: {
      label: '🎯 Сбор лида', emoji: '🎯', botName: 'Менеджер по продажам',
      title: 'Квалифицирует и собирает контакты',
      desc: 'Агент выясняет задачу, отвечает на возражения и аккуратно собирает контакт, передавая тёплый лид в вашу CRM.',
      points: ['Задаёт квалифицирующие вопросы', 'Собирает имя и контакт в форму', 'Передаёт лид в CRM автоматически'],
      userMsg: 'Хочу понять, подойдёт ли это для моего бизнеса',
      botMsg: 'Подберём решение под вашу задачу. Оставьте контакт — пришлём персональное демо 👇',
      replies: ['Сколько стоит?', 'Есть интеграции?', 'Заказать звонок'],
    },
  };
  const UC_PRODUCTS = [
    { name: 'Aero Run 2', tag: 'Хит', price: '6 990 ₽', old: '8 490 ₽', swatch: 'linear-gradient(135deg,#6366F1,#8B5CF6)' },
    { name: 'Swift Trail', tag: '-20%', price: '7 490 ₽', old: '9 290 ₽', swatch: 'linear-gradient(135deg,#10B981,#34D399)' },
  ];
  const UC_DELIVERY = 'Да, конечно! Мы отправляем Новой Почтой — как в отделение, так и курьером до двери. Срок доставки обычно 1–3 дня, оплата по тарифу перевозчика. Доступен наложенный платёж — можно оплатить при получении.';

  const ARROW_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M17 7H9M17 7v8" stroke="#6366F1" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CHECK_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#6366F1" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  let ucActive = 'products';
  const ucTabs = document.getElementById('ucTabs');
  const ucNarrative = document.getElementById('ucNarrative');
  const ucChat = document.getElementById('ucChat');

  function renderUseCases() {
    const order = ['products', 'delivery', 'leads'];
    ucTabs.innerHTML = order.map((id) =>
      `<button type="button" class="uc-tab${id === ucActive ? ' active' : ''}" data-id="${id}">${SCENARIOS[id].label}</button>`
    ).join('');
    ucTabs.querySelectorAll('.uc-tab').forEach((b) =>
      b.addEventListener('click', () => { ucActive = b.dataset.id; renderUseCases(); }));

    const s = SCENARIOS[ucActive];
    ucNarrative.innerHTML =
      `<div class="uc-emoji">${s.emoji}</div>` +
      `<h3>${s.title}</h3>` +
      `<p>${s.desc}</p>` +
      `<div class="uc-points">${s.points.map((p) =>
        `<div class="uc-point"><span class="uc-check">${CHECK_SVG}</span><span>${p}</span></div>`).join('')}</div>`;

    let scenarioBlock = '';
    if (ucActive === 'products') {
      scenarioBlock = `<div class="uc-products">${UC_PRODUCTS.map((pr) =>
        `<div class="uc-prod">
          <div class="uc-prod-img" style="background:${pr.swatch};"><span class="uc-prod-tag">${pr.tag}</span></div>
          <div class="uc-prod-body">
            <div class="uc-prod-name">${pr.name}</div>
            <div class="uc-prod-price"><b>${pr.price}</b><s>${pr.old}</s></div>
            <a href="#" class="uc-prod-link">Перейти к товару ${ARROW_SVG}</a>
          </div>
        </div>`).join('')}</div>`;
    } else if (ucActive === 'delivery') {
      scenarioBlock = `<div class="uc-msg-bot" style="max-width:88%; border-radius:14px;">${UC_DELIVERY}</div>`;
    } else {
      scenarioBlock = `<div class="uc-lead">
        <div class="uc-lead-title">Оставьте контакт — подготовим демо</div>
        <div class="uc-lead-fields">
          <span class="uc-lead-input">Ваше имя</span>
          <span class="uc-lead-input">Email или телефон</span>
          <span class="uc-lead-btn">Получить демо</span>
        </div>
      </div>`;
    }

    ucChat.innerHTML =
      `<div class="uc-chat-head">
        <span class="uc-chat-av">AI</span>
        <span style="flex:1;"><span class="uc-chat-name">${s.botName}</span><span class="uc-chat-typing"><span class="pg-online"></span> печатает…</span></span>
      </div>
      <div class="uc-chat-body">
        <div class="uc-msg-user">${s.userMsg}</div>
        <div class="uc-msg-bot">${s.botMsg}</div>
        ${scenarioBlock}
        <div class="uc-chips">${s.replies.map((r) => `<span class="uc-chip">${r}</span>`).join('')}</div>
      </div>`;
  }
  if (ucTabs) renderUseCases();
})();

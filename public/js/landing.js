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
})();

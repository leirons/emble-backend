(function () {
  const api = window.EmbleApi;

  let lang = 'uk';
  try {
    lang = localStorage.getItem('emble.lang') || 'uk';
  } catch (e) {}

  const TRANSLATIONS = {
    'Вход': 'Вхід',
    'Регистрация': 'Реєстрація',
    'Войти': 'Увійти',
    'Создать агента бесплатно': 'Створити агента безкоштовно',
    'Выйти': 'Вийти',
    'Пока нет ни одного агента': 'Поки немає жодного агента',
    'Создайте первого агента, чтобы получить код виджета для сайта.': 'Створіть першого агента, щоб отримати код віджета для сайту.',
    'Чат-поддержка': 'Чат-підтримка',
    'Помощник продаж': 'Помічник з продажів',
    'Генератор лидов': 'Генератор лідів',
    'Свой агент': 'Власний агент',
    'Отвечает на вопросы 24/7': 'Відповідає на запитання 24/7',
    'Ведёт клиента к покупке': 'Веде клієнта до покупки',
    'Собирает контакты': 'Збирає контакти',
    'Настройка с нуля': 'Налаштування з нуля',
    'Черновик': 'Чернетка',
    'Опубликован': 'Опублікований',
    'Создать': 'Створити',
    'Имя агента': 'Ім\'я агента',
    'Загрузка…': 'Завантаження…',
    'Все агенты': 'Усі агенти',
    'Удалить': 'Вилучити',
    'Снять с публикации': 'Зняти з публікації',
    'Опубликовать': 'Опублікувати',
    'Обзор': 'Огляд',
    'База знаний': 'База знань',
    'Сценарии': 'Сценарії',
    'Действия': 'Дії',
    'Аналитика': 'Аналітика',
    'Лиды': 'Ліди',
    'Агент создан': 'Агента створено',
    'Агент опубликован': 'Агента опубліковано',
    'Агент снят с публикации': 'Агента знято з публікації',
    'Агент удалён': 'Агента видалено',
    'Брендинг виджета': 'Брендинг віджета',
    'Имя виджета': 'Ім\'я віджета',
    'Текст статуса': 'Текст статусу',
    'Онлайн': 'Онлайн',
    'Фирменный цвет': 'Фірмовий колір',
    'Приветственное сообщение': 'Привітальне повідомлення',
    'Оставьте пустым, чтобы убрать приветствие': 'Залиште порожнім, щоб прибрати привітання',
    'Аватар ассистента': 'Аватар асистента',
    'Загрузить': 'Завантажити',
    'Убрать': 'Прибрати',
    'PNG/JPG, до 256 КБ': 'PNG/JPG, до 256 КБ',
    'Положение на странице': 'Положення на сторінці',
    'Слева': 'Ліворуч',
    'Справа': 'Праворуч',
    'Стартовое меню': 'Стартове меню',
    'Домашний экран с кнопками при открытии виджета': 'Домашній екран з кнопками при відкритті віджета',
    'Сохранить брендинг': 'Зберегти брендинг',
    'Расширенные настройки': 'Розширені настройки',
    'Разрешённые домены': 'Дозволені домени',
    'Пока список пуст — виджет работает с любого домена.': 'Поки список порожній — віджет працює з будь-якого домену.',
    'Добавить': 'Додати',
    'Собственный OpenAI API-ключ (BYOK)': 'Власний OpenAI API-ключ (BYOK)',
    'Если задан — генерация и эмбеддинги идут через ваш ключ и ваш биллинг OpenAI.': 'Якщо вказано — генерація та ембеддінги йдуть через ваш ключ та ваш біллінг OpenAI.',
    'Сохранить ключ': 'Зберегти ключ',
    'Живой предпросмотр': 'Живе прев\'ю',
    'Код для вставки на сайт': 'Код для вставки на сайт',
    'Опубликуйте агента, чтобы виджет заработал на сайте.': 'Опублікуйте агента, щоб віджет запрацював на сайті.',
    'Открыть тестовую страницу с виджетом': 'Відкрити тестову сторінку з віджетом',
    'Ассистент': 'Асистент',
    'Чат с ассистентом': 'Чат з асистентом',
    'Часто задаваемые вопросы': 'Часті запитання',
    'Контакты и график': 'Контакти та графік',
    'Понедельник': 'Понедiлок',
    'Вторник': 'Вiвторок',
    'Среда': 'Середа',
    'Четверг': 'Четвер',
    'Пятница': 'П\'ятниця',
    'Суббота': 'Субота',
    'Воскресенье': 'Недiля',
    'Контактная информация не указана': 'Контактна інформація не вказана',
    'Ключ сохранён': 'Ключ збережено',
    'Ключ сброшен': 'Ключ скинуто',
    'Скопировано': 'Скопійовано',
    'Импортировано товаров: ': 'Імпортовано товарів: ',
    'Ошибка импорта': 'Помилка імпорту',
    'Импортировать': 'Імпортувати',
    'До 10 000 строк за раз': 'До 10 000 рядків за раз',
    'Импорт каталога': 'Імпорт каталогу',
    'Обработка: ': 'Обробка: ',
    ' из ': ' з ',
    ' товаров': ' товарів',
    'Выходной': 'Вихідний',
    'Открыть тестовую страницу': 'Відкрити тестову сторінку',
    'Удалить агента': 'Видалити агента',
    'Это действие необратимо.': 'Ця дія незворотна.',
    'Файл больше 256 КБ — выберите меньше': 'Файл більше 256 КБ — оберіть менший',
    'Домены не добавлены': 'Домени не додано',
    'Вход': 'Вхід',
    'Регистрация': 'Реєстрація',
    'С возвращением': 'З поверненням',
    'Войдите, чтобы управлять агентами.': 'Увійдіть, щоб керувати агентами.',
    'Пароль': 'Пароль',
    'Демо-доступ:': 'Демо-доступ:',
    '(после npm run seed)': '(після npm run seed)',
    'Создать аккаунт': 'Створити акаунт',
    'Бесплатный тариф навсегда, без карты.': 'Безкоштовний тариф назавжди, без картки.',
    'Название организации': 'Назва організації',
    'Минимум 8 символов': 'Мінімум 8 символів',
    'Создать агента бесплатно': 'Створити агента безкоштовно',
    'Выйти': 'Вийти',
    'Мои агенты': 'Мої агенти',
    'Создайте первого агента, чтобы получить код виджета для сайта.': 'Створіть першого агента, щоб отримати код віджета для сайту.',
    '+ Создать агента': '+ Створити агента',
    'Новый агент': 'Новий агент',
    'Название': 'Назва',
    'Например, Поддержка сайта': 'Наприклад, Підтримка сайту',
    'Шаблон поведения': 'Шаблон поведінки',
    'Отмена': 'Скасувати',
    'Создать': 'Створити',
  };

  // Английский словарь — пока только для экрана входа (остальной дашборд вне задачи).
  const TRANSLATIONS_EN = {
    'Вход': 'Log in',
    'Регистрация': 'Sign up',
    'Войти': 'Log in',
    'Выйти': 'Log out',
    'С возвращением': 'Welcome back',
    'Войдите, чтобы управлять агентами.': 'Log in to manage your agents.',
    'Пароль': 'Password',
    'Демо-доступ:': 'Demo access:',
    '(после npm run seed)': '(after npm run seed)',
    'Создать аккаунт': 'Create an account',
    'Бесплатный тариф навсегда, без карты.': 'Free plan forever, no card.',
    'Название организации': 'Organization name',
    'Минимум 8 символов': 'At least 8 characters',
    'Создать агента бесплатно': 'Create an agent for free',
  };

  function t(str) {
    if (lang === 'uk' && TRANSLATIONS[str]) {
      return TRANSLATIONS[str];
    }
    if (lang === 'en' && TRANSLATIONS_EN[str]) {
      return TRANSLATIONS_EN[str];
    }
    return str;
  }

  const TEMPLATE_OPTIONS = [
    { id: 'support', name: 'Чат-поддержка', desc: 'Отвечает на вопросы 24/7' },
    { id: 'sales', name: 'Помощник продаж', desc: 'Ведёт клиента к покупке' },
    { id: 'leads', name: 'Генератор лидов', desc: 'Собирает контакты' },
    { id: 'custom', name: 'Свой агент', desc: 'Настройка с нуля' },
  ];
  const TEMPLATE_ACCENT = {
    support: '#6366F1', sales: '#10B981', leads: '#8B5CF6', custom: '#F59E0B',
  };

  let currentAgents = [];
  let currentAgent = null;
  let createTemplate = 'support';

  // ---------- helpers ----------
  function toast(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.getElementById('toastRoot').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  function showError(containerId, err) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!err) { el.innerHTML = ''; return; }
    const msg = err instanceof Error ? err.message : String(err);
    el.innerHTML = `<div class="error-banner">${escapeHtml(msg)}</div>`;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function setLoading(btn, loading, label) {
    btn.disabled = loading;
    btn.innerHTML = loading ? '<span class="spinner"></span>' : label;
  }

  // ---------- auth view ----------
  const authView = document.getElementById('authView');
  const appView = document.getElementById('appView');
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const loginPane = document.getElementById('loginPane');
  const registerPane = document.getElementById('registerPane');

  function setAuthTab(tab) {
    const isLogin = tab !== 'register';
    tabLogin.classList.toggle('active', isLogin);
    tabRegister.classList.toggle('active', !isLogin);
    loginPane.style.display = isLogin ? 'block' : 'none';
    registerPane.style.display = isLogin ? 'none' : 'block';
  }
  tabLogin.addEventListener('click', () => setAuthTab('login'));
  tabRegister.addEventListener('click', () => setAuthTab('register'));
  // Регистрация отключена — всегда показываем форму входа, даже при #register в URL.
  setAuthTab('login');

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('loginError', null);
    const btn = document.getElementById('loginSubmit');
    setLoading(btn, true);
    try {
      const data = await api.login({
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value,
      });
      api.saveAuth(data);
      enterApp();
    } catch (err) {
      showError('loginError', err);
    } finally {
      setLoading(btn, false, 'Войти');
    }
  });

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('registerError', null);
    const btn = document.getElementById('registerSubmit');
    setLoading(btn, true);
    try {
      const data = await api.register({
        orgName: document.getElementById('regOrg').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value,
      });
      api.saveAuth(data);
      enterApp();
    } catch (err) {
      showError('registerError', err);
    } finally {
      setLoading(btn, false, 'Создать агента бесплатно');
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api.logout();
    location.hash = '';
    authView.style.display = 'flex';
    appView.style.display = 'none';
  });
  document.getElementById('homeLink').addEventListener('click', (e) => {
    e.preventDefault();
    showAgentsList();
  });

  // ---------- app shell ----------
  function enterApp() {
    const auth = api.loadAuth();
    document.getElementById('userEmailLabel').textContent = (auth && auth.user && auth.user.email) || '';
    authView.style.display = 'none';
    appView.style.display = 'block';
    showAgentsList();
  }

  const agentsListView = document.getElementById('agentsListView');
  const agentDetailView = document.getElementById('agentDetailView');

  function showAgentsList() {
    agentDetailView.style.display = 'none';
    agentDetailView.innerHTML = '';
    agentsListView.style.display = 'block';
    loadAgents();
  }

  async function loadAgents() {
    showError('agentsError', null);
    try {
      const data = await api.listAgents();
      currentAgents = data.agents || [];
      renderAgentsGrid();
    } catch (err) {
      showError('agentsError', err);
    }
  }

  function renderAgentsGrid() {
    const grid = document.getElementById('agentsGrid');
    document.querySelector('.empty-state')?.remove();
    if (currentAgents.length === 0) {
      grid.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<div class="big">${t('Пока нет ни одного агента')}</div><p>${t('Создайте первого агента, чтобы получить код виджета для сайта.')}</p>`;
      grid.after(empty);
      return;
    }
    grid.innerHTML = currentAgents.map((a) => {
      const accent = TEMPLATE_ACCENT[a.type] || '#6366F1';
      const initial = (a.name || '?').trim().charAt(0).toUpperCase();
      return `
        <div class="card agent-card" data-id="${a.id}">
          <div class="top">
            <span class="agent-avatar" style="background:${accent};">${initial}</span>
            <div style="flex:1; min-width:0;">
              <div class="name">${escapeHtml(a.name)}</div>
              <div class="type">${templateName(a.type)}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span class="slug">${a.publicSlug}</span>
            <span class="status-pill ${a.status === 'published' ? 'published' : 'draft'}">${a.status === 'published' ? t('Опубликован') : t('Черновик')}</span>
          </div>
        </div>
      `;
    }).join('');
    grid.querySelectorAll('.agent-card').forEach((card) => {
      card.addEventListener('click', () => showAgentDetail(card.dataset.id));
    });
  }

  function templateName(type) {
    return t((TEMPLATE_OPTIONS.find((x) => x.id === type) || {}).name || type);
  }

  // ---------- create agent modal ----------
  const createModal = document.getElementById('createModal');
  const templatePick = document.getElementById('templatePick');

  function renderTemplatePick() {
    templatePick.innerHTML = TEMPLATE_OPTIONS.map((opt) => `
      <div class="opt${opt.id === createTemplate ? ' active' : ''}" data-id="${opt.id}">
        <span class="n">${t(opt.name)}</span>
        <span class="d">${t(opt.desc)}</span>
      </div>
    `).join('');
    templatePick.querySelectorAll('.opt').forEach((el) => {
      el.addEventListener('click', () => { createTemplate = el.dataset.id; renderTemplatePick(); });
    });
  }

  document.getElementById('createAgentBtn').addEventListener('click', () => {
    document.getElementById('agentName').value = '';
    createTemplate = 'support';
    renderTemplatePick();
    showError('createError', null);
    createModal.style.display = 'flex';
  });
  document.getElementById('cancelCreateBtn').addEventListener('click', () => { createModal.style.display = 'none'; });
  createModal.addEventListener('click', (e) => { if (e.target === createModal) createModal.style.display = 'none'; });

  document.getElementById('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('createError', null);
    const btn = document.getElementById('createSubmit');
    setLoading(btn, true);
    try {
      const data = await api.createAgent({
        name: document.getElementById('agentName').value.trim(),
        type: createTemplate,
      });
      createModal.style.display = 'none';
      toast(t('Агент создан'));
      await loadAgents();
      showAgentDetail(data.agent.id);
    } catch (err) {
      showError('createError', err);
    } finally {
      setLoading(btn, false, t('Создать'));
    }
  });

  // ---------- agent detail: shell + tabs ----------
  async function showAgentDetail(agentId) {
    agentsListView.style.display = 'none';
    agentDetailView.style.display = 'block';
    agentDetailView.innerHTML = `<p style="color:var(--muted);">${t('Загрузка…')}</p>`;
    try {
      const data = await api.getAgent(agentId);
      currentAgent = data.agent;
      renderAgentDetail(currentAgent);
    } catch (err) {
      agentDetailView.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  }

  function renderAgentDetail(agent) {
    const isPublished = agent.status === 'published';
    currentAgent = agent;
    agentDetailView.innerHTML = `
      <a href="#" class="detail-back" id="backToList">&larr; ${t('Все агенты')}</a>
      <div class="detail-head">
        <div class="left">
          <span class="agent-avatar" style="background:${TEMPLATE_ACCENT[agent.type] || '#6366F1'}; width:48px; height:48px; font-size:18px;">${(agent.name || '?').charAt(0).toUpperCase()}</span>
          <div>
            <h1>${escapeHtml(agent.name)}</h1>
            <span class="status-pill ${isPublished ? 'published' : 'draft'}">${isPublished ? t('Опубликован') : t('Черновик')}</span>
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn btn-danger btn-sm" id="deleteAgentBtn">${t('Удалить')}</button>
          <button class="btn ${isPublished ? 'btn-outline' : 'btn-primary'}" id="togglePublishBtn">${isPublished ? t('Снять с публикации') : t('Опубликовать')}</button>
        </div>
      </div>

      <div class="tab-bar" id="detailTabs">
        <button class="tab-btn active" data-tab="overview">${t('Обзор')}</button>
        <button class="tab-btn" data-tab="knowledge">${t('База знаний')}</button>
        <button class="tab-btn" data-tab="flows">${t('Сценарии')}</button>
        <button class="tab-btn" data-tab="actions">${t('Действия')}</button>
        <button class="tab-btn" data-tab="analytics">${t('Аналитика')}</button>
        <button class="tab-btn" data-tab="leads">${t('Лиды')}</button>
      </div>
      <div id="tabContent"></div>
    `;

    document.getElementById('backToList').addEventListener('click', (e) => { e.preventDefault(); showAgentsList(); });

    document.getElementById('togglePublishBtn').addEventListener('click', async () => {
      const btn = document.getElementById('togglePublishBtn');
      setLoading(btn, true);
      try {
        if (isPublished) await api.unpublishAgent(agent.id);
        else await api.publishAgent(agent.id);
        toast(isPublished ? t('Агент снят с публикации') : t('Агент опубликован'));
        showAgentDetail(agent.id);
      } catch (err) {
        toast(err.message);
        setLoading(btn, false, isPublished ? t('Снять с публикации') : t('Опубликовать'));
      }
    });

    document.getElementById('deleteAgentBtn').addEventListener('click', async () => {
      if (!confirm(`${t('Удалить агента')} «${agent.name}»? ${t('Это действие необратимо.')}`)) return;
      try {
        await api.deleteAgent(agent.id);
        toast(t('Агент удалён'));
        showAgentsList();
      } catch (err) {
        toast(err.message);
      }
    });

    document.querySelectorAll('#detailTabs .tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#detailTabs .tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
        showTab(btn.dataset.tab, agent);
      });
    });

    showTab('overview', agent);
  }

  function showTab(tab, agent) {
    const content = document.getElementById('tabContent');
    content.innerHTML = `<p style="color:var(--muted);">${t('Загрузка…')}</p>`;
    if (tab === 'overview') renderOverviewTab(agent, content);
    else if (tab === 'knowledge') renderKnowledgeTab(agent, content);
    else if (tab === 'flows') renderFlowsTab(agent, content);
    else if (tab === 'actions') renderActionsTab(agent, content);
    else if (tab === 'analytics') renderAnalyticsTab(agent, content);
    else if (tab === 'leads') renderLeadsTab(agent, content);
  }

  function buildSnippet(agent) {
    const origin = location.origin;
    return `<script src="${origin}/embed.js" data-agent="${agent.publicSlug}" data-api="${origin}" async><\/script>`;
  }

  // ---------- Tab: Обзор (branding с live-preview + advanced accordion) ----------
  const EYE_SVG = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>';
  const EYE_OFF_SVG = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.9 4.6A9.6 9.6 0 0112 4.5c6.5 0 10 7 10 7a17 17 0 01-3 3.8M6.1 6.1A17 17 0 002 12s3.5 7 10 7a9.6 9.6 0 003.5-.65" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  function renderOverviewTab(agent, container) {
    const branding = agent.branding || {};
    const brandColor = branding.brandColor || '#6366F1';
    const isPublished = agent.status === 'published';

    // Локальное реактивное состояние превью
    const sm = branding.startMenu || { enabled: false, items: [] };
    const state = {
      name: agent.name || 'Ассистент',
      color: brandColor,
      // Пустая строка = приветствие убрано (не подставляем дефолт, иначе его нельзя очистить).
      greeting: branding.greeting != null ? branding.greeting : '',
      avatar: branding.avatarUrl || null,
      position: branding.position || 'bottom-right',
      statusText: branding.statusText || 'Онлайн',
      startMenu: { enabled: !!sm.enabled, items: Array.isArray(sm.items) ? sm.items.map((it) => ({ ...it })) : [] },
    };
    const MENU_TYPE_LABEL = { chat: 'Чат с ассистентом', faq: 'Часто задаваемые вопросы', contacts: 'Контакты и график' };
    const SOCIAL_FIELDS = [
      { key: 'telegram', label: 'Telegram (ссылка)' },
      { key: 'whatsapp', label: 'WhatsApp (ссылка)' },
      { key: 'viber', label: 'Viber (ссылка)' },
      { key: 'instagram', label: 'Instagram (ссылка)' },
    ];
    function defaultSchedule() {
      return [
        { label: 'Понедельник', enabled: true, from: '09:00', to: '18:00' },
        { label: 'Вторник', enabled: true, from: '09:00', to: '18:00' },
        { label: 'Среда', enabled: true, from: '09:00', to: '18:00' },
        { label: 'Четверг', enabled: true, from: '09:00', to: '18:00' },
        { label: 'Пятница', enabled: true, from: '09:00', to: '18:00' },
        { label: 'Суббота', enabled: true, from: '10:00', to: '16:00' },
        { label: 'Воскресенье', enabled: false, from: '10:00', to: '16:00' },
      ];
    }

    container.innerHTML = `
      <div class="branding-layout">
        <div class="branding-form">
          <div class="card panel">
            <h3>${t('Брендинг виджета')}</h3>
            <div id="brandingError"></div>
 
            <div class="field">
              <label>${t('Имя виджета')}</label>
              <input type="text" id="bName" maxlength="120" value="${escapeHtml(state.name)}">
            </div>
 
            <div class="field">
              <label>${t('Текст статуса')}</label>
              <input type="text" id="bStatusText" maxlength="60" value="${escapeHtml(state.statusText)}" placeholder="${t('Онлайн')}">
            </div>
 
            <div class="field">
              <label>${t('Фирменный цвет')}</label>
              <div class="color-picker-row">
                <input type="color" id="bColor" value="${state.color}">
                <input type="text" id="bColorHex" value="${state.color}" style="width:110px; font-family:var(--mono);">
              </div>
            </div>
 
            <div class="field">
              <label>${t('Приветственное сообщение')}</label>
              <textarea id="bGreeting" rows="2" maxlength="500" placeholder="${t('Оставьте пустым, чтобы убрать приветствие')}">${escapeHtml(state.greeting)}</textarea>
            </div>
 
            <div class="field">
              <label>${t('Аватар ассистента')}</label>
              <div class="avatar-upload-row">
                <div class="avatar-circle" id="bAvatarCircle">${state.avatar ? `<img src="${escapeHtml(state.avatar)}">` : escapeHtml(state.name.charAt(0).toUpperCase())}</div>
                <div>
                  <input type="file" id="bAvatarFile" accept="image/*" style="display:none;">
                  <button type="button" class="btn btn-outline btn-sm" id="bAvatarBtn">${t('Загрузить')}</button>
                  ${state.avatar ? '' : ''}
                  <button type="button" class="btn btn-outline btn-sm" id="bAvatarClear" style="margin-left:6px;">${t('Убрать')}</button>
                  <div class="hint">${t('PNG/JPG, до 256 КБ')}</div>
                </div>
              </div>
            </div>
 
            <div class="field">
              <label>${t('Положение на странице')}</label>
              <div class="pos-toggle" id="bPos">
                <button type="button" data-pos="bottom-left" class="${state.position === 'bottom-left' ? 'active' : ''}">${t('Слева')}</button>
                <button type="button" data-pos="bottom-right" class="${state.position === 'bottom-right' ? 'active' : ''}">${t('Справа')}</button>
              </div>
            </div>
 
            <div class="field" style="border-top:1px solid var(--border); padding-top:16px;">
              <div class="toggle-row" style="padding-top:0;">
                <div><div class="label">${t('Стартовое меню')}</div><div class="desc">${t('Домашний экран с кнопками при открытии виджета')}</div></div>
                <label class="switch"><input type="checkbox" id="smEnabled" ${state.startMenu.enabled ? 'checked' : ''}><span class="track"></span></label>
              </div>
              <div id="smItems" style="margin-top:10px;"></div>
              <div class="subform-tabs" style="margin-top:8px;">
                <button type="button" class="sm-add" data-type="chat">+ ${t('Чат')}</button>
                <button type="button" class="sm-add" data-type="faq">+ FAQ</button>
                <button type="button" class="sm-add" data-type="contacts">+ ${t('Контакты')}</button>
              </div>
            </div>
 
            <button class="btn btn-primary btn-sm" id="saveBrandingBtn" style="margin-top:6px;">${t('Сохранить брендинг')}</button>
 
            <div class="accordion" id="advAccordion">
              <div class="accordion-head" id="advHead">
                <span class="t">${t('Расширенные настройки')}</span>
                <span class="chev">▾</span>
              </div>
              <div class="accordion-body">
                <div style="margin-bottom:18px;">
                  <label style="display:block; font-size:13px; font-weight:600; color:#C7CBD6; margin-bottom:8px;">${t('Разрешённые домены')}</label>
                  <p style="font-size:12px; color:var(--dim); margin:0 0 10px;">${t('Пока список пуст — виджет работает с любого домена.')}</p>
                  <div id="domainsError"></div>
                  <div class="domains-list" id="domainsList"></div>
                  <div class="add-domain-row">
                    <input type="text" id="newDomainInput" placeholder="example.com">
                    <button type="button" class="btn btn-outline btn-sm" id="addDomainBtn">${t('Добавить')}</button>
                  </div>
                </div>

                <div>
                  <label style="display:block; font-size:13px; font-weight:600; color:#C7CBD6; margin-bottom:8px;">${t('Собственный OpenAI API-ключ (BYOK)')}</label>
                  <p style="font-size:12px; color:var(--dim); margin:0 0 10px;">${t('Если задан — генерация и эмбеддинги идут через ваш ключ и ваш биллинг OpenAI.')}</p>
                  <div id="byokError"></div>
                  <div class="pw-wrap">
                    <input type="password" id="byokKey" placeholder="sk-..." autocomplete="off">
                    <button type="button" class="pw-toggle" id="byokToggle" title="Показать/скрыть">${EYE_SVG}</button>
                  </div>
                  <button type="button" class="btn btn-outline btn-sm" id="byokSaveBtn" style="margin-top:10px;">${t('Сохранить ключ')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="branding-preview-col">
          <div class="card panel" style="padding:16px;">
            <h3 style="margin-bottom:14px;">${t('Живой предпросмотр')}</h3>
            <div class="mock-browser">
              <div class="mock-chrome">
                <span class="dot" style="background:#FF5F57;"></span><span class="dot" style="background:#FEBC2E;"></span><span class="dot" style="background:#28C840;"></span>
                <span class="bar"></span>
              </div>
              <div class="mock-stage">
                <div class="mock-skel" style="width:45%;"></div>
                <div class="mock-skel" style="width:80%;"></div>
                <div class="mock-skel" style="width:70%;"></div>
                <div class="mock-skel" style="width:76%;"></div>

                <div class="lp-widget ${state.position === 'bottom-left' ? 'left' : 'right'}" id="lpWidget">
                  <div class="lp-head" id="lpHead">
                    <span class="av" id="lpAvatar"></span>
                    <span style="flex:1;"><span class="nm" id="lpName"></span><br><span class="st" id="lpStatus"><span class="status-dot">●</span> ${escapeHtml(state.statusText)}</span></span>
                  </div>
                  <div class="lp-body">
                    <div id="lpMenu" style="display:none; flex-direction:column; gap:7px;"></div>
                    <div id="lpChat">
                      <div class="lp-msg" id="lpGreeting"></div>
                      <div class="lp-input"><span class="f"></span><span class="s" id="lpSend"></span></div>
                    </div>
                  </div>
                </div>
                <div class="lp-launcher ${state.position === 'bottom-left' ? 'left' : 'right'}" id="lpLauncher">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H9l-5 4V5z" fill="#fff"/></svg>
                </div>
              </div>
            </div>
          </div>

          <div class="card panel" style="margin-top:18px;">
            <h3>${t('Код для вставки на сайт')}</h3>
            ${!isPublished ? `<div class="error-banner">${t('Опубликуйте агента, чтобы виджет заработал на сайте.')}</div>` : ''}
            <div class="snippet-box">
              <div class="snippet-titlebar">
                <span style="font-family:var(--mono); font-size:12px; color:var(--dim);">index.html</span>
                <button class="copy-btn" id="copySnippetBtn"><span id="copySnippetLabel">Copy Code</span></button>
              </div>
              <div class="snippet-body">${escapeHtml(buildSnippet(agent))}</div>
            </div>
            <a href="/widget-demo.html?agent=${agent.publicSlug}" target="_blank" class="btn btn-outline btn-sm" style="margin-top:14px; width:100%;">${t('Открыть тестовую страницу с виджетом')}</a>
          </div>
        </div>
      </div>
    `;

    // ---- Реактивный предпросмотр ----
    const lp = {
      widget: document.getElementById('lpWidget'),
      launcher: document.getElementById('lpLauncher'),
      head: document.getElementById('lpHead'),
      name: document.getElementById('lpName'),
      avatar: document.getElementById('lpAvatar'),
      greeting: document.getElementById('lpGreeting'),
      send: document.getElementById('lpSend'),
    };
    function updatePreview() {
      lp.head.style.background = `linear-gradient(120deg, ${state.color}, ${state.color})`;
      lp.launcher.style.background = state.color;
      lp.send.style.background = state.color;
      lp.name.textContent = state.name || 'Ассистент';
      const lpStatus = document.getElementById('lpStatus');
      if (lpStatus) lpStatus.innerHTML = '<span class="status-dot">●</span> ' + escapeHtml(state.statusText || 'Онлайн');
      const greetingText = (state.greeting || '').trim();
      lp.greeting.textContent = greetingText;
      lp.greeting.style.display = greetingText ? '' : 'none';
      lp.avatar.innerHTML = state.avatar ? `<img src="${escapeHtml(state.avatar)}">` : escapeHtml((state.name || 'A').charAt(0).toUpperCase());
      lp.widget.classList.toggle('left', state.position === 'bottom-left');
      lp.widget.classList.toggle('right', state.position !== 'bottom-left');
      lp.launcher.classList.toggle('left', state.position === 'bottom-left');
      lp.launcher.classList.toggle('right', state.position !== 'bottom-left');
      // синхронизируем аватар-кружок формы
      const circle = document.getElementById('bAvatarCircle');
      circle.innerHTML = state.avatar ? `<img src="${escapeHtml(state.avatar)}">` : escapeHtml((state.name || 'A').charAt(0).toUpperCase());

      // Домашний экран стартового меню в превью
      const lpMenu = document.getElementById('lpMenu');
      const lpChat = document.getElementById('lpChat');
      const menuOn = state.startMenu.enabled && state.startMenu.items.length > 0;
      lpMenu.style.display = menuOn ? 'flex' : 'none';
      lpChat.style.display = menuOn ? 'none' : 'block';
      if (menuOn) {
        lpMenu.innerHTML = (greetingText ? `<div class="lp-msg" style="margin-bottom:4px;">${escapeHtml(greetingText)}</div>` : '') +
          state.startMenu.items.map((it) => `
            <div style="display:flex; align-items:center; gap:8px; padding:9px 10px; border-radius:9px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);">
              <span style="width:22px; height:22px; border-radius:6px; flex:0 0 auto; background:${state.color};"></span>
              <span style="flex:1; font-size:11px; color:#E5E7EB; font-weight:600;">${escapeHtml(it.title || MENU_TYPE_LABEL[it.type] || '')}</span>
              <span style="color:#5B6472;">›</span>
            </div>
          `).join('');
      }
    }

    // ---- Редактор стартового меню ----
    function defaultMenuTitle(type) { return t(MENU_TYPE_LABEL[type]) || t('Пункт меню'); }
    function renderMenuItems() {
      const box = document.getElementById('smItems');
      const disabled = !state.startMenu.enabled;
      box.style.opacity = disabled ? '0.5' : '1';
      box.style.pointerEvents = disabled ? 'none' : 'auto';
      box.innerHTML = state.startMenu.items.map((it, i) => `
        <div class="list-row" style="flex-direction:column; align-items:stretch; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="tag-pill">${escapeHtml(t(MENU_TYPE_LABEL[it.type]) || it.type)}</span>
            <input type="text" class="sm-title" data-i="${i}" value="${escapeHtml(it.title || '')}" placeholder="${escapeHtml(defaultMenuTitle(it.type))}" style="flex:1;">
            <button type="button" class="sm-del" data-i="${i}" style="background:none; border:none; color:var(--dim); cursor:pointer;">✕</button>
          </div>
          ${it.type === 'contacts' ? contactsEditorHtml(it, i) : ''}
        </div>
      `).join('') || `<p style="font-size:12px; color:var(--dim);">${t('Добавьте пункты меню кнопками ниже.')}</p>`;

      box.querySelectorAll('.sm-title').forEach((inp) => {
        inp.addEventListener('input', () => { state.startMenu.items[Number(inp.dataset.i)].title = inp.value; updatePreview(); });
      });
      box.querySelectorAll('.sm-del').forEach((btn) => {
        btn.addEventListener('click', () => { state.startMenu.items.splice(Number(btn.dataset.i), 1); renderMenuItems(); updatePreview(); });
      });
      bindContactsEditors(box);
    }

    // --- Редактор контактов (телефон/почта/адрес + график по дням + соцсети) ---
    function contactsEditorHtml(it, i) {
      const c = it.contacts || {};
      const sched = Array.isArray(c.schedule) && c.schedule.length ? c.schedule : defaultSchedule();
      const socials = c.socials || {};
      return `
        <div style="border-top:1px dashed var(--border); padding-top:10px; display:flex; flex-direction:column; gap:8px;">
          <input type="text" class="cc-field" data-i="${i}" data-k="phone" value="${escapeHtml(c.phone || '')}" placeholder="${t('Телефон, напр. +7 999 000-00-00')}">
          <input type="text" class="cc-field" data-i="${i}" data-k="email" value="${escapeHtml(c.email || '')}" placeholder="${t('Email, напр. hello@company.ru')}">
          <input type="text" class="cc-field" data-i="${i}" data-k="address" value="${escapeHtml(c.address || '')}" placeholder="${t('Адрес, напр. Москва, ул. Примерная, 1')}">

          <div style="font-size:12px; font-weight:600; color:#C7CBD6; margin-top:4px;">${t('График работы')}</div>
          <div class="cc-sched">
            ${sched.map((d, di) => `
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                <span style="flex:1; font-size:12.5px; color:var(--text);">${escapeHtml(t(d.label))}</span>
                <label class="switch"><input type="checkbox" class="cc-dayon" data-i="${i}" data-d="${di}" ${d.enabled !== false ? 'checked' : ''}><span class="track"></span></label>
                <input type="time" class="cc-time" data-i="${i}" data-d="${di}" data-t="from" value="${escapeHtml(d.from || '09:00')}" ${d.enabled === false ? 'disabled' : ''} style="width:96px;">
                <input type="time" class="cc-time" data-i="${i}" data-d="${di}" data-t="to" value="${escapeHtml(d.to || '18:00')}" ${d.enabled === false ? 'disabled' : ''} style="width:96px;">
              </div>
            `).join('')}
          </div>

          <div style="font-size:12px; font-weight:600; color:#C7CBD6; margin-top:4px;">${t('Соцсети')} <span style="color:var(--dim); font-weight:400;">(${t('необязательно')})</span></div>
          ${SOCIAL_FIELDS.map((s) => `<input type="text" class="cc-social" data-i="${i}" data-s="${s.key}" value="${escapeHtml(socials[s.key] || '')}" placeholder="${escapeHtml(t(s.label))}">`).join('')}
        </div>
      `;
    }

    function ensureContacts(i) {
      const it = state.startMenu.items[i];
      if (!it.contacts) it.contacts = {};
      if (!Array.isArray(it.contacts.schedule) || !it.contacts.schedule.length) it.contacts.schedule = defaultSchedule();
      if (!it.contacts.socials) it.contacts.socials = {};
      return it.contacts;
    }

    function bindContactsEditors(box) {
      box.querySelectorAll('.cc-field').forEach((inp) => {
        inp.addEventListener('input', () => { ensureContacts(Number(inp.dataset.i))[inp.dataset.k] = inp.value; });
      });
      box.querySelectorAll('.cc-dayon').forEach((cb) => {
        cb.addEventListener('change', () => {
          const c = ensureContacts(Number(cb.dataset.i));
          c.schedule[Number(cb.dataset.d)].enabled = cb.checked;
          // включить/выключить поля времени этой строки
          cb.closest('div').querySelectorAll('.cc-time').forEach((t) => { t.disabled = !cb.checked; });
        });
      });
      box.querySelectorAll('.cc-time').forEach((inp) => {
        inp.addEventListener('input', () => {
          const c = ensureContacts(Number(inp.dataset.i));
          c.schedule[Number(inp.dataset.d)][inp.dataset.t] = inp.value;
        });
      });
      box.querySelectorAll('.cc-social').forEach((inp) => {
        inp.addEventListener('input', () => {
          const c = ensureContacts(Number(inp.dataset.i));
          const v = inp.value.trim();
          if (v) c.socials[inp.dataset.s] = v; else delete c.socials[inp.dataset.s];
        });
      });
    }

    updatePreview();
    renderMenuItems();

    document.getElementById('smEnabled').addEventListener('change', (e) => {
      state.startMenu.enabled = e.target.checked;
      renderMenuItems();
      updatePreview();
    });
    document.querySelectorAll('.sm-add').forEach((b) => {
      b.addEventListener('click', () => {
        const type = b.dataset.type;
        if (state.startMenu.items.length >= 8) return;
        const newItem = { type, title: defaultMenuTitle(type) };
        if (type === 'contacts') newItem.contacts = { phone: '', email: '', address: '', schedule: defaultSchedule(), socials: {} };
        state.startMenu.items.push(newItem);
        if (!state.startMenu.enabled) { state.startMenu.enabled = true; document.getElementById('smEnabled').checked = true; }
        renderMenuItems();
        updatePreview();
      });
    });

    const bName = document.getElementById('bName');
    const bColor = document.getElementById('bColor');
    const bColorHex = document.getElementById('bColorHex');
    const bGreeting = document.getElementById('bGreeting');

    bName.addEventListener('input', () => { state.name = bName.value; updatePreview(); });
    bColor.addEventListener('input', () => { state.color = bColor.value; bColorHex.value = bColor.value; updatePreview(); });
    bColorHex.addEventListener('input', () => {
      if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(bColorHex.value)) { state.color = bColorHex.value; bColor.value = bColorHex.value; updatePreview(); }
    });
    bGreeting.addEventListener('input', () => { state.greeting = bGreeting.value; updatePreview(); });
    document.getElementById('bStatusText').addEventListener('input', (e) => { state.statusText = e.target.value; updatePreview(); });

    document.getElementById('bPos').querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        state.position = b.dataset.pos;
        document.getElementById('bPos').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
        updatePreview();
      });
    });

    // Аватар: читаем файл как data-URL (без S3), лимит размера
    document.getElementById('bAvatarBtn').addEventListener('click', () => document.getElementById('bAvatarFile').click());
    document.getElementById('bAvatarFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 256 * 1024) { showError('brandingError', new Error('Файл больше 256 КБ — выберите меньше')); return; }
      const reader = new FileReader();
      reader.onload = () => { state.avatar = reader.result; updatePreview(); };
      reader.readAsDataURL(file);
    });
    document.getElementById('bAvatarClear').addEventListener('click', () => { state.avatar = null; updatePreview(); });

    // Сохранение брендинга (+ имя агента через updateAgent)
    document.getElementById('saveBrandingBtn').addEventListener('click', async () => {
      showError('brandingError', null);
      const btn = document.getElementById('saveBrandingBtn');
      setLoading(btn, true);
      try {
        if (state.name.trim() && state.name.trim() !== agent.name) {
          await api.updateAgent(agent.id, { name: state.name.trim() });
          agent.name = state.name.trim();
        }
        await api.updateBranding(agent.id, {
          brandColor: state.color,
          // Отправляем всегда, в т.ч. пустую строку — так приветствие можно убрать.
          greeting: state.greeting.trim(),
          position: state.position === 'bottom-left' ? 'bottom-left' : 'bottom-right',
          avatarUrl: state.avatar,
          startMenu: {
            enabled: state.startMenu.enabled,
            items: state.startMenu.items.map((it) => {
              const base = { type: it.type, title: (it.title || '').trim() || defaultMenuTitle(it.type) };
              if (it.type === 'contacts') {
                const c = it.contacts || {};
                base.contacts = {
                  phone: (c.phone || '').trim() || undefined,
                  email: (c.email || '').trim() || undefined,
                  address: (c.address || '').trim() || undefined,
                  schedule: Array.isArray(c.schedule) && c.schedule.length ? c.schedule : defaultSchedule(),
                  socials: c.socials || {},
                };
              }
              return base;
            }),
          },
        });
        toast('Брендинг сохранён');
      } catch (err) {
        showError('brandingError', err);
      } finally {
        setLoading(btn, false, 'Сохранить брендинг');
      }
    });

    // Accordion
    document.getElementById('advHead').addEventListener('click', () => {
      document.getElementById('advAccordion').classList.toggle('open');
    });

    // Domains
    async function loadDomains() {
      try {
        const data = await api.listDomains(agent.id);
        document.getElementById('domainsList').innerHTML = (data.domains || []).map((d) => `
          <div class="domain-row"><span>${escapeHtml(d.domain)}</span><button data-id="${d.id}">Удалить</button></div>
        `).join('') || '<p style="font-size:12px; color:var(--dim);">Домены не добавлены</p>';
        document.querySelectorAll('#domainsList button').forEach((b) => {
          b.addEventListener('click', async () => { await api.removeDomain(agent.id, b.dataset.id); loadDomains(); });
        });
      } catch (err) { showError('domainsError', err); }
    }
    loadDomains();
    document.getElementById('addDomainBtn').addEventListener('click', async () => {
      showError('domainsError', null);
      const input = document.getElementById('newDomainInput');
      const val = input.value.trim();
      if (!val) return;
      try { await api.addDomain(agent.id, val); input.value = ''; loadDomains(); }
      catch (err) { showError('domainsError', err); }
    });

    // BYOK key
    const byokKey = document.getElementById('byokKey');
    api.getSettings(agent.id).then((data) => { if (data.settings && data.settings.openaiApiKey) byokKey.value = data.settings.openaiApiKey; }).catch(() => {});
    document.getElementById('byokToggle').addEventListener('click', () => {
      const show = byokKey.type === 'password';
      byokKey.type = show ? 'text' : 'password';
      document.getElementById('byokToggle').innerHTML = show ? EYE_OFF_SVG : EYE_SVG;
    });
    document.getElementById('byokSaveBtn').addEventListener('click', async () => {
      showError('byokError', null);
      const btn = document.getElementById('byokSaveBtn');
      setLoading(btn, true);
      try {
        await api.updateSettings(agent.id, { openaiApiKey: byokKey.value.trim() });
        toast(byokKey.value.trim() ? 'Ключ сохранён' : 'Ключ сброшен');
      } catch (err) { showError('byokError', err); }
      finally { setLoading(btn, false, 'Сохранить ключ'); }
    });

    // Copy snippet
    document.getElementById('copySnippetBtn').addEventListener('click', () => {
      if (navigator.clipboard) navigator.clipboard.writeText(buildSnippet(agent)).catch(() => {});
      const btn = document.getElementById('copySnippetBtn');
      const label = document.getElementById('copySnippetLabel');
      btn.classList.add('copied'); label.textContent = 'Скопировано';
      setTimeout(() => { btn.classList.remove('copied'); label.textContent = 'Copy Code'; }, 1800);
    });
  }

  // ---------- Tab: База знаний (sources, tags/sync, Q&A, catalog) ----------
  const SOURCE_STATUS_LABEL = { pending: 'В очереди', processing: 'Обработка…', ready: 'Готово', error: 'Ошибка' };

  function renderKnowledgeTab(agent, container) {
    const IC = {
      plus: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
      link: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
      doc: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>',
      trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
      pencil: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
      chev: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
      ext: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
      refresh: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"/></svg>',
      upload: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>',
      close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    };

    container.innerHTML = `
      <div class="kb">
        <div class="kb-head">
          <h1>Обучение ИИ и Каталог</h1>
          <p>Загрузите данные, на основе которых ассистент будет отвечать клиентам.</p>
        </div>

        <div class="kb-card">
          <div class="kb-card-head">
            <div>
              <div class="kb-card-title">Источники данных</div>
              <div class="kb-card-sub">Сайты, документы и API, которые изучит ассистент</div>
            </div>
            <button type="button" class="kb-btn" id="kbAddSource">${IC.plus}<span>Добавить источник</span></button>
          </div>
          <div id="sourcesError"></div>
          <div class="kb-list" id="sourcesList"></div>
        </div>

        <div class="kb-card">
          <div class="kb-card-head">
            <div>
              <div class="kb-card-title">Вопрос–ответ (Q&amp;A)</div>
              <div class="kb-card-sub">Готовые ответы на частые вопросы клиентов</div>
            </div>
            <button type="button" class="kb-btn" id="kbAddQa">${IC.plus}<span>Добавить Q&amp;A</span></button>
          </div>
          <div id="qaError"></div>
          <div class="kb-list kb-qa-list" id="qaList"></div>
        </div>

        <div class="kb-card">
          <div class="kb-card-head kb-card-head-wrap">
            <div>
              <div class="kb-card-title">Каталог товаров <span id="productsCount" class="kb-count"></span></div>
              <div class="kb-card-sub">Товары, которые ассистент сможет рекомендовать</div>
            </div>
            <div class="kb-head-right">
              <div class="kb-seg" id="productTabs">
                <div class="kb-seg-item active" data-mode="manual">Вручную</div>
                <div class="kb-seg-item" data-mode="import">Импорт XML/CSV</div>
                <div class="kb-seg-item" data-mode="importUrl">Импорт по API</div>
              </div>
              <button type="button" class="kb-btn" id="kbAddProduct">${IC.plus}<span>Добавить товар</span></button>
            </div>
          </div>
          <div id="productsError"></div>
          <div id="catalogBody"></div>
        </div>
      </div>

      <div class="kb-drawer" id="kbDrawer" style="display:none;">
        <div class="kb-drawer-overlay" id="kbDrawerOverlay"></div>
        <div class="kb-drawer-panel">
          <div class="kb-drawer-head">
            <div class="kb-drawer-title" id="kbDrawerTitle"></div>
            <button type="button" class="kb-icon-btn" id="kbDrawerClose">${IC.close}</button>
          </div>
          <div class="kb-drawer-body" id="kbDrawerBody"></div>
          <div class="kb-drawer-foot">
            <button type="button" class="kb-btn-ghost" id="kbDrawerCancel">Отмена</button>
            <button type="button" class="kb-btn kb-btn-grow" id="kbDrawerSave">Сохранить</button>
          </div>
        </div>
      </div>
    `;

    // ---------- Drawer controller ----------
    let drawerOnSave = null;
    function showDrawer(title, bodyHtml, onSave, afterRender) {
      document.getElementById('kbDrawerTitle').textContent = title;
      document.getElementById('kbDrawerBody').innerHTML = '<div id="kbDrawerError"></div>' + bodyHtml;
      document.getElementById('kbDrawer').style.display = 'block';
      drawerOnSave = onSave;
      if (afterRender) afterRender();
    }
    function hideDrawer() {
      document.getElementById('kbDrawer').style.display = 'none';
      drawerOnSave = null;
    }
    document.getElementById('kbDrawerClose').addEventListener('click', hideDrawer);
    document.getElementById('kbDrawerCancel').addEventListener('click', hideDrawer);
    document.getElementById('kbDrawerOverlay').addEventListener('click', hideDrawer);
    document.getElementById('kbDrawerSave').addEventListener('click', async () => {
      if (!drawerOnSave) return;
      const btn = document.getElementById('kbDrawerSave');
      setLoading(btn, true);
      try {
        const ok = await drawerOnSave();
        if (ok !== false) hideDrawer();
      } catch (err) {
        showError('kbDrawerError', err);
      } finally {
        setLoading(btn, false, 'Сохранить');
      }
    });

    // ---------- Sources ----------
    function openSourceDrawer() {
      let stype = 'url';
      showDrawer(
        'Добавление источника',
        `
        <div class="kb-seg kb-seg-full" id="srcTypeTabs">
          <div class="kb-seg-item active" data-type="url">Ссылка</div>
          <div class="kb-seg-item" data-type="text">Текст</div>
          <div class="kb-seg-item" data-type="file">Файл</div>
        </div>
        <div id="srcFields"></div>
        `,
        () => submitSource(stype),
        () => {
          const fieldsEl = document.getElementById('srcFields');
          function renderFields() {
            if (stype === 'url') {
              fieldsEl.innerHTML = `
                <label class="kb-label kb-label-first">URL</label>
                <input type="text" class="kb-input" id="srcUrl" placeholder="https://example.com/faq">
                <label class="kb-label">Заголовок (необязательно)</label>
                <input type="text" class="kb-input" id="srcTitle" placeholder="Например: Раздел FAQ">
                <label class="kb-label">Автосинхронизация</label>
                <div class="kb-toggle-row">
                  <span>Проверять обновления раз в день</span>
                  <button type="button" class="kb-switch" id="srcSync" aria-pressed="false"></button>
                </div>
                <label class="kb-label">Теги (через запятую, необязательно)</label>
                <input type="text" class="kb-input" id="srcTags" placeholder="faq, доставка">
                <label class="kb-label">Заголовки запроса (JSON, для защищённых страниц/API)</label>
                <textarea class="kb-input kb-textarea" id="srcHeaders" rows="2" placeholder='{"Authorization": "Bearer ..."}'></textarea>
              `;
              const sw = document.getElementById('srcSync');
              sw.addEventListener('click', () => {
                const on = sw.classList.toggle('on');
                sw.setAttribute('aria-pressed', on ? 'true' : 'false');
              });
            } else if (stype === 'text') {
              fieldsEl.innerHTML = `
                <label class="kb-label kb-label-first">Заголовок</label>
                <input type="text" class="kb-input" id="srcTitle2" placeholder="Например: Условия доставки">
                <label class="kb-label">Текст</label>
                <textarea class="kb-input kb-textarea" id="srcText" rows="7" placeholder="Вставьте текст, который изучит ассистент…"></textarea>
                <label class="kb-label">Теги (через запятую, необязательно)</label>
                <input type="text" class="kb-input" id="srcTags2" placeholder="доставка, оплата">
              `;
            } else {
              fieldsEl.innerHTML = `
                <label class="kb-label kb-label-first">Файл (PDF, DOCX, TXT, MD)</label>
                <input type="file" class="kb-file" id="srcFile" accept=".pdf,.docx,.txt,.md">
              `;
            }
          }
          document.querySelectorAll('#srcTypeTabs .kb-seg-item').forEach((t) => {
            t.addEventListener('click', () => {
              stype = t.dataset.type;
              document.querySelectorAll('#srcTypeTabs .kb-seg-item').forEach((x) => x.classList.toggle('active', x === t));
              renderFields();
            });
          });
          renderFields();
        }
      );
    }

    async function submitSource(stype) {
      showError('kbDrawerError', null);
      if (stype === 'url') {
        const url = document.getElementById('srcUrl').value.trim();
        if (!url) { showError('kbDrawerError', new Error('Укажите URL')); return false; }
        const tags = document.getElementById('srcTags').value.split(',').map((s) => s.trim()).filter(Boolean);
        let headers;
        const headersRaw = document.getElementById('srcHeaders').value.trim();
        if (headersRaw) { try { headers = JSON.parse(headersRaw); } catch { showError('kbDrawerError', new Error('Заголовки: некорректный JSON')); return false; } }
        const sync = document.getElementById('srcSync').classList.contains('on');
        await api.addKnowledgeUrl(agent.id, {
          url,
          title: document.getElementById('srcTitle').value.trim() || undefined,
          tags: tags.length ? tags : undefined,
          syncIntervalMinutes: sync ? 1440 : undefined,
          headers,
        });
        toast('Источник добавлен, обрабатывается…');
      } else if (stype === 'text') {
        const title = document.getElementById('srcTitle2').value.trim();
        const text = document.getElementById('srcText').value.trim();
        if (!title || !text) { showError('kbDrawerError', new Error('Заполните заголовок и текст')); return false; }
        const tags = document.getElementById('srcTags2').value.split(',').map((s) => s.trim()).filter(Boolean);
        await api.addKnowledgeText(agent.id, { title, text, tags: tags.length ? tags : undefined });
        toast('Текст добавлен, обрабатывается…');
      } else {
        const file = document.getElementById('srcFile').files[0];
        if (!file) { showError('kbDrawerError', new Error('Выберите файл')); return false; }
        await api.addKnowledgeFile(agent.id, file);
        toast('Файл загружен, обрабатывается…');
      }
      loadSources();
      return true;
    }

    async function loadSources() {
      showError('sourcesError', null);
      try {
        const data = await api.listKnowledge(agent.id);
        const sources = data.sources || [];
        document.getElementById('sourcesList').innerHTML = sources.map((s) => {
          const isUrl = s.type === 'url';
          const synced = isUrl && !!s.syncIntervalMinutes;
          const sub = synced
            ? '<span class="kb-dot"></span>Автосинхронизация активна'
            : escapeHtml(SOURCE_STATUS_LABEL[s.status] || s.status || '');
          const tags = (s.tags || []).map((t) => `<span class="kb-tag">${escapeHtml(t)}</span>`).join('');
          return `
            <div class="kb-row">
              <div class="kb-row-ic">${isUrl ? IC.link : IC.doc}</div>
              <div class="kb-row-main">
                <div class="kb-row-title">${escapeHtml(s.title || s.sourceUrl || 'Без названия')}</div>
                <div class="kb-row-sub">${sub}${tags}</div>
              </div>
              ${isUrl ? `<button class="kb-icon-btn" title="Обновить" data-resync="${s.id}">${IC.refresh}</button>` : ''}
              <button class="kb-icon-btn kb-icon-danger" title="Удалить" data-del="${s.id}">${IC.trash}</button>
            </div>
          `;
        }).join('') || '<div class="kb-empty">Источников пока нет</div>';
        document.querySelectorAll('#sourcesList [data-resync]').forEach((b) => {
          b.addEventListener('click', async () => {
            await api.resyncKnowledgeSource(agent.id, b.dataset.resync);
            toast('Пересинхронизация запущена');
            loadSources();
          });
        });
        document.querySelectorAll('#sourcesList [data-del]').forEach((b) => {
          b.addEventListener('click', async () => { await api.deleteKnowledgeSource(agent.id, b.dataset.del); loadSources(); });
        });
      } catch (err) {
        showError('sourcesError', err);
      }
    }
    document.getElementById('kbAddSource').addEventListener('click', openSourceDrawer);
    loadSources();

    // ---------- Q&A ----------
    let qaCache = [];
    let qaExpanded = -1;
    function openQaDrawer(edit) {
      showDrawer(
        edit ? 'Редактирование Q&A' : 'Добавление Q&A',
        `
        <label class="kb-label kb-label-first">Вопрос</label>
        <input type="text" class="kb-input" id="qaQuestion" maxlength="500" placeholder="Например: Что делать, если товар с браком?" value="${edit ? escapeHtml(edit.question) : ''}">
        <label class="kb-label">Ответ</label>
        <textarea class="kb-input kb-textarea" id="qaAnswer" rows="8" maxlength="4000" placeholder="Развёрнутый ответ, который ассистент даст клиенту…">${edit ? escapeHtml(edit.answer) : ''}</textarea>
        `,
        async () => {
          showError('kbDrawerError', null);
          const question = document.getElementById('qaQuestion').value.trim();
          const answer = document.getElementById('qaAnswer').value.trim();
          if (!question || !answer) { showError('kbDrawerError', new Error('Заполните вопрос и ответ')); return false; }
          if (edit) { await api.updateQaPair(agent.id, edit.id, { question, answer }); toast('Q&A обновлена'); }
          else { await api.createQaPair(agent.id, { question, answer }); toast('Q&A добавлена'); }
          loadQaPairs();
          return true;
        }
      );
    }

    function renderQaList() {
      document.getElementById('qaList').innerHTML = qaCache.map((q, i) => `
        <div class="kb-qa ${qaExpanded === i ? 'open' : ''}">
          <div class="kb-qa-head">
            <div class="kb-qa-q" data-toggle="${i}">
              <span class="kb-qa-chev">${IC.chev}</span>
              <span class="kb-qa-qtext">${escapeHtml(q.question)}</span>
            </div>
            <div class="kb-qa-actions">
              <button class="kb-icon-btn" title="Изменить" data-edit="${q.id}">${IC.pencil}</button>
              <button class="kb-icon-btn kb-icon-danger" title="Удалить" data-del="${q.id}">${IC.trash}</button>
            </div>
          </div>
          ${qaExpanded === i ? `<div class="kb-qa-body"><div class="kb-qa-answer">${escapeHtml(q.answer)}</div></div>` : ''}
        </div>
      `).join('') || '<div class="kb-empty">Пока нет Q&amp;A пар</div>';
      document.querySelectorAll('#qaList [data-toggle]').forEach((el) => {
        el.addEventListener('click', () => { const i = Number(el.dataset.toggle); qaExpanded = qaExpanded === i ? -1 : i; renderQaList(); });
      });
      document.querySelectorAll('#qaList [data-edit]').forEach((b) => {
        b.addEventListener('click', () => { const item = qaCache.find((p) => p.id === b.dataset.edit); if (item) openQaDrawer(item); });
      });
      document.querySelectorAll('#qaList [data-del]').forEach((b) => {
        b.addEventListener('click', async () => { await api.deleteQaPair(agent.id, b.dataset.del); qaExpanded = -1; loadQaPairs(); });
      });
    }

    async function loadQaPairs() {
      showError('qaError', null);
      try {
        const data = await api.listQaPairs(agent.id);
        qaCache = data.qaPairs || [];
        renderQaList();
      } catch (err) {
        showError('qaError', err);
      }
    }
    document.getElementById('kbAddQa').addEventListener('click', () => openQaDrawer(null));
    loadQaPairs();

    // ---------- Catalog ----------
    let productMode = 'manual';
    const PRODUCTS_RENDER_LIMIT = 100;

    function openProductDrawer() {
      showDrawer(
        'Добавление товара',
        `
        <label class="kb-label kb-label-first">Название</label>
        <input type="text" class="kb-input" id="pName" placeholder="Название товара">
        <label class="kb-label">Цена</label>
        <input type="text" class="kb-input" id="pPrice" placeholder="1990">
        <label class="kb-label">Ссылка</label>
        <input type="text" class="kb-input" id="pUrl" placeholder="https://…">
        <label class="kb-label">Описание</label>
        <textarea class="kb-input kb-textarea" id="pDesc" rows="4" placeholder="Краткое описание товара…"></textarea>
        `,
        async () => {
          showError('kbDrawerError', null);
          const name = document.getElementById('pName').value.trim();
          if (!name) { showError('kbDrawerError', new Error('Укажите название')); return false; }
          const priceVal = document.getElementById('pPrice').value.trim();
          await api.createProduct(agent.id, {
            name,
            description: document.getElementById('pDesc').value.trim(),
            price: priceVal ? Number(priceVal) : undefined,
            url: document.getElementById('pUrl').value.trim() || undefined,
          });
          toast('Товар добавлен');
          if (productMode === 'manual') loadProducts();
          return true;
        }
      );
    }

    function renderCatalogBody() {
      const box = document.getElementById('catalogBody');
      if (productMode === 'manual') {
        box.innerHTML = `
          <div class="kb-cat-head"><div>Название</div><div>Цена</div><div class="tc">Ссылка</div></div>
          <div class="kb-list" id="productsList"></div>
          <div id="productsFoot"></div>
        `;
        loadProducts();
      } else if (productMode === 'import') {
        box.innerHTML = `
          <div class="kb-drop" id="kbDrop">
            <div class="kb-drop-ic">${IC.upload}</div>
            <div class="kb-drop-title">Перетащите файл CSV или JSON</div>
            <div class="kb-drop-sub">Колонки: name, description, price, url, image_url, category, sku. До 10 000 строк.</div>
            <button type="button" class="kb-btn-outline" id="pImportChoose">Выбрать файл</button>
            <input type="file" id="pImportFile" accept=".csv,.json" style="display:none;">
          </div>
          <div id="importProgress"></div>
        `;
        const fileInput = document.getElementById('pImportFile');
        const drop = document.getElementById('kbDrop');
        document.getElementById('pImportChoose').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => { if (fileInput.files[0]) startImport(fileInput.files[0]); });
        ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
        ['dragleave', 'dragend'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
        drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('drag'); const f = e.dataTransfer.files[0]; if (f) startImport(f); });
      } else {
        box.innerHTML = `
          <div class="kb-api-box">
            <label class="kb-label kb-label-first">URL внешнего API (JSON-массив или CSV)</label>
            <input type="text" class="kb-input" id="pImportUrl" placeholder="https://api.myshop.com/products">
            <label class="kb-label">Метод</label>
            <select class="kb-input" id="pImportMethod"><option>GET</option><option>POST</option></select>
            <label class="kb-label">Заголовки (JSON, для авторизации)</label>
            <textarea class="kb-input kb-textarea" id="pImportHeaders" rows="2" placeholder='{"Authorization": "Bearer ..."}'></textarea>
            <button type="button" class="kb-btn kb-mt" id="pImportUrlBtn">Импортировать по API</button>
          </div>
        `;
        document.getElementById('pImportUrlBtn').addEventListener('click', async () => {
          showError('productsError', null);
          const url = document.getElementById('pImportUrl').value.trim();
          if (!url) return;
          const btn = document.getElementById('pImportUrlBtn');
          setLoading(btn, true);
          try {
            let headers;
            const headersRaw = document.getElementById('pImportHeaders').value.trim();
            if (headersRaw) { try { headers = JSON.parse(headersRaw); } catch { throw new Error('Заголовки: некорректный JSON'); } }
            const data = await api.importProductsFromUrl(agent.id, { url, method: document.getElementById('pImportMethod').value, headers });
            toast(`Импортировано товаров: ${data.count}`);
            productMode = 'manual';
            syncSegActive();
            renderCatalogBody();
          } catch (err) {
            showError('productsError', err);
          } finally {
            setLoading(btn, false, 'Импортировать по API');
          }
        });
      }
    }

    function startImport(file) {
      showError('productsError', null);
      const progress = document.getElementById('importProgress');
      api.importProducts(agent.id, file).then((data) => {
        const { jobId, total } = data;
        progress.innerHTML = `
          <div class="kb-progress">
            <div class="kb-progress-head">Импорт каталога</div>
            <div class="kb-progress-track"><div class="kb-progress-bar" id="ipBar" style="width:0%"></div></div>
            <div class="kb-progress-text" id="ipText">Обработка: 0 из ${total} товаров</div>
          </div>`;
        const poll = setInterval(async () => {
          try {
            const st = await api.importJobStatus(agent.id, jobId);
            const pct = st.total > 0 ? Math.round((st.processed / st.total) * 100) : 0;
            const bar = document.getElementById('ipBar');
            const txt = document.getElementById('ipText');
            if (bar) bar.style.width = pct + '%';
            if (txt) txt.textContent = 'Обработка: ' + st.processed + ' из ' + st.total + ' товаров';
            if (st.status === 'completed') {
              clearInterval(poll);
              toast('Импортировано товаров: ' + st.total);
              productMode = 'manual';
              syncSegActive();
              renderCatalogBody();
            } else if (st.status === 'error') {
              clearInterval(poll);
              showError('productsError', st.error || 'Ошибка импорта');
            }
          } catch (pollErr) {
            clearInterval(poll);
            showError('productsError', pollErr);
          }
        }, 2000);
      }).catch((err) => showError('productsError', err));
    }

    async function loadProducts() {
      showError('productsError', null);
      try {
        const data = await api.listProducts(agent.id);
        const products = data.products || [];
        const total = products.length;
        document.getElementById('productsCount').textContent = total ? `· ${total} шт.` : '';
        const listEl = document.getElementById('productsList');
        if (!listEl) return; // не в режиме «Вручную»
        const shown = products.slice(0, PRODUCTS_RENDER_LIMIT);
        listEl.innerHTML = shown.map((p) => `
          <div class="kb-prod-row">
            <div class="kb-prod-name">${escapeHtml(p.name)}</div>
            <div class="kb-prod-price">${p.price != null ? escapeHtml(String(p.price)) + ' ' + escapeHtml(p.currency || '') : '—'}</div>
            <div class="kb-prod-actions">
              ${p.url ? `<a href="${escapeHtml(p.url)}" target="_blank" rel="noopener" class="kb-icon-btn" title="Открыть">${IC.ext}</a>` : ''}
              <button class="kb-icon-btn kb-icon-danger" title="Удалить" data-del="${p.id}">${IC.trash}</button>
            </div>
          </div>
        `).join('') || '<div class="kb-empty">Каталог пуст</div>';
        document.querySelectorAll('#productsList [data-del]').forEach((b) => {
          b.addEventListener('click', async () => { await api.deleteProduct(agent.id, b.dataset.del); loadProducts(); });
        });
        const foot = document.getElementById('productsFoot');
        if (foot) {
          foot.innerHTML = total
            ? `<div class="kb-prod-foot">
                 <span class="kb-prod-more">${total > PRODUCTS_RENDER_LIMIT ? `Показаны первые ${PRODUCTS_RENDER_LIMIT} из ${total}` : ''}</span>
                 <button type="button" class="kb-btn-ghost kb-btn-danger-ghost" id="clearProductsBtn">Очистить каталог</button>
               </div>`
            : '';
          const clearBtn = document.getElementById('clearProductsBtn');
          if (clearBtn) clearBtn.addEventListener('click', async () => {
            if (!confirm('Удалить ВСЕ товары из каталога этого агента? Действие необратимо.')) return;
            setLoading(clearBtn, true);
            try {
              const res = await api.clearProducts(agent.id);
              toast(`Удалено товаров: ${res.deleted}`);
              loadProducts();
            } catch (err) {
              showError('productsError', err);
            } finally {
              setLoading(clearBtn, false, 'Очистить каталог');
            }
          });
        }
      } catch (err) {
        showError('productsError', err);
      }
    }

    function syncSegActive() {
      document.querySelectorAll('#productTabs .kb-seg-item').forEach((x) => x.classList.toggle('active', x.dataset.mode === productMode));
    }
    document.querySelectorAll('#productTabs .kb-seg-item').forEach((b) => {
      b.addEventListener('click', () => { productMode = b.dataset.mode; syncSegActive(); renderCatalogBody(); });
    });
    document.getElementById('kbAddProduct').addEventListener('click', openProductDrawer);
    renderCatalogBody();
  }

  // ---------- Tab: Сценарии (flows) ----------
  let flowStepsState = [];
  let flowStartStepId = '';
  let flowStepCounter = 0;
  let flowAvailableActions = [];

  function newFlowStepId() {
    flowStepCounter += 1;
    return 'step' + flowStepCounter;
  }
  function initFlowEditor() {
    flowStepCounter = 0;
    const id1 = newFlowStepId();
    flowStepsState = [{ id: id1, message: '', buttons: [], handoffToAI: false, collapsed: false }];
    flowStartStepId = id1;
  }
  /** Загружает существующий сценарий в редактор (Edit-режим). */
  function loadFlowIntoEditor(flow) {
    const def = flow.definition || {};
    const steps = def.steps || {};
    const ids = Object.keys(steps);
    flowStepsState = ids.map((id) => ({
      id,
      message: steps[id].message || '',
      buttons: (steps[id].buttons || []).map((b) => ({ label: b.label, nextStepId: b.nextStepId })),
      handoffToAI: !!steps[id].handoffToAI,
      actionId: steps[id].actionId || null,
      collapsed: false,
    }));
    if (flowStepsState.length === 0) initFlowEditor();
    flowStartStepId = def.startStepId && steps[def.startStepId] ? def.startStepId : flowStepsState[0].id;
    // счётчик — чтобы новые шаги не конфликтовали по id
    flowStepCounter = flowStepsState.length;
  }
  function buildFlowDefinition() {
    const steps = {};
    flowStepsState.forEach((s) => {
      steps[s.id] = {
        message: s.message,
        buttons: s.buttons.filter((b) => b.label && b.nextStepId).map((b) => ({ label: b.label, nextStepId: b.nextStepId })),
        handoffToAI: !!s.handoffToAI,
        actionId: s.actionId || null,
      };
    });
    return { startStepId: flowStartStepId, steps };
  }
  function renderStartStepSelect() {
    const select = document.getElementById('flowStartStep');
    if (!select) return;
    select.innerHTML = flowStepsState.map((s) => `<option value="${escapeHtml(s.id)}" ${s.id === flowStartStepId ? 'selected' : ''}>${escapeHtml(s.id)}</option>`).join('');
  }
  function renderStepButtons(idx) {
    const el = document.querySelector(`.step-buttons[data-idx="${idx}"]`);
    if (!el) return;
    const step = flowStepsState[idx];
    el.innerHTML = step.buttons.map((btn, bIdx) => `
      <div class="flow-step-btn-row">
        <input type="text" placeholder="Текст кнопки" class="btn-label" data-idx="${idx}" data-bidx="${bIdx}" value="${escapeHtml(btn.label)}">
        <select class="btn-next" data-idx="${idx}" data-bidx="${bIdx}">
          ${flowStepsState.map((s) => `<option value="${escapeHtml(s.id)}" ${s.id === btn.nextStepId ? 'selected' : ''}>${escapeHtml(s.id)}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-outline btn-sm btn-remove" data-idx="${idx}" data-bidx="${bIdx}">&times;</button>
      </div>
    `).join('') || '<p style="font-size:12px; color:var(--dim); margin:4px 0;">Без кнопок — конец сценария</p>';

    el.querySelectorAll('.btn-label').forEach((input) => {
      input.addEventListener('input', () => {
        flowStepsState[Number(input.dataset.idx)].buttons[Number(input.dataset.bidx)].label = input.value;
      });
    });
    el.querySelectorAll('.btn-next').forEach((select) => {
      select.addEventListener('change', () => {
        flowStepsState[Number(select.dataset.idx)].buttons[Number(select.dataset.bidx)].nextStepId = select.value;
      });
    });
    el.querySelectorAll('.btn-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx2 = Number(btn.dataset.idx);
        flowStepsState[idx2].buttons.splice(Number(btn.dataset.bidx), 1);
        renderStepButtons(idx2);
      });
    });
  }
  function renderFlowSteps() {
    const container = document.getElementById('flowSteps');
    if (!container) return;
    container.innerHTML = flowStepsState.map((step, idx) => `
      <div class="flow-step-card${step.collapsed ? ' collapsed' : ''}" data-idx="${idx}">
        <div class="step-head">
          <button type="button" class="step-collapse" data-idx="${idx}" title="Свернуть/развернуть">▾</button>
          <input type="text" class="step-id-input" data-idx="${idx}" value="${escapeHtml(step.id)}">
          <span style="font-size:12px; color:var(--dim); flex:1;">${step.collapsed ? escapeHtml((step.message || '').slice(0, 40) || 'пустой шаг') : 'ID шага'}</span>
          ${flowStepsState.length > 1 ? `<button type="button" class="step-del" data-idx="${idx}" title="Удалить шаг"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
        </div>
        <div class="step-body">
          <div class="field"><label>Сообщение (необязательно)</label><textarea class="step-message" data-idx="${idx}" rows="2" placeholder="Можно оставить пустым — тогда покажутся только кнопки">${escapeHtml(step.message)}</textarea></div>
          <div class="field">
            <label>Кнопки</label>
            <div class="step-buttons" data-idx="${idx}"></div>
            <button type="button" class="btn btn-outline btn-sm step-add-btn" data-idx="${idx}">+ Кнопка</button>
          </div>
          <div class="field" style="margin-top:8px;">
            <label>Вызвать действие на этом шаге</label>
            <select class="step-action" data-idx="${idx}">
              <option value="">— Нет —</option>
              ${flowAvailableActions.map((a) => `<option value="${escapeHtml(a.id)}" ${a.id === step.actionId ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('')}
            </select>
          </div>
          <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--muted-2); margin-top:8px;">
            <input type="checkbox" class="step-handoff" data-idx="${idx}" ${step.handoffToAI ? 'checked' : ''}>
            Передать диалог AI-ассистенту после этого шага
          </label>
        </div>
      </div>
    `).join('');

    flowStepsState.forEach((step, idx) => renderStepButtons(idx));

    container.querySelectorAll('.step-collapse').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        flowStepsState[idx].collapsed = !flowStepsState[idx].collapsed;
        renderFlowSteps();
      });
    });

    container.querySelectorAll('.step-action').forEach((select) => {
      select.addEventListener('change', () => {
        flowStepsState[Number(select.dataset.idx)].actionId = select.value || null;
      });
    });

    container.querySelectorAll('.step-id-input').forEach((input) => {
      input.addEventListener('change', () => {
        const idx = Number(input.dataset.idx);
        const oldId = flowStepsState[idx].id;
        const newId = input.value.trim() || oldId;
        flowStepsState[idx].id = newId;
        flowStepsState.forEach((s) => s.buttons.forEach((b) => { if (b.nextStepId === oldId) b.nextStepId = newId; }));
        if (flowStartStepId === oldId) flowStartStepId = newId;
        renderFlowSteps();
        renderStartStepSelect();
      });
    });
    container.querySelectorAll('.step-message').forEach((ta) => {
      ta.addEventListener('input', () => { flowStepsState[Number(ta.dataset.idx)].message = ta.value; });
    });
    container.querySelectorAll('.step-handoff').forEach((cb) => {
      cb.addEventListener('change', () => { flowStepsState[Number(cb.dataset.idx)].handoffToAI = cb.checked; });
    });
    container.querySelectorAll('.step-del').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        const removed = flowStepsState[idx].id;
        flowStepsState.splice(idx, 1);
        if (flowStartStepId === removed && flowStepsState[0]) flowStartStepId = flowStepsState[0].id;
        renderFlowSteps();
        renderStartStepSelect();
      });
    });
    container.querySelectorAll('.step-add-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        flowStepsState[idx].buttons.push({ label: '', nextStepId: flowStepsState[0].id });
        renderStepButtons(idx);
      });
    });
  }

  function renderFlowsTab(agent, container) {
    container.innerHTML = `
      <div class="card panel">
        <h3>Сценарии (ветки диалога)</h3>
        <p style="font-size:12.5px; color:var(--dim); margin:-8px 0 14px;">Активный сценарий запускается автоматически в начале диалога — до подключения ИИ. Кнопки ведут по заданным шагам, последний шаг передаёт диалог ассистенту.</p>
        <div id="flowsError"></div>
        <div id="flowsList"></div>
        <button type="button" class="btn btn-outline btn-sm" id="newFlowBtn" style="margin-top:10px;">+ Новый сценарий</button>
      </div>
      <div class="card panel" id="flowEditorBox" style="display:none;">
        <h3>Новый сценарий</h3>
        <div id="flowEditorBody"></div>
      </div>
    `;

    // Общий редактор: existingFlow=null → создание, иначе → редактирование (initialData).
    async function openFlowEditor(existingFlow) {
      try {
        const data = await api.listActions(agent.id);
        flowAvailableActions = data.actions || [];
      } catch { flowAvailableActions = []; }

      if (existingFlow) loadFlowIntoEditor(existingFlow);
      else initFlowEditor();

      const editorBox = document.getElementById('flowEditorBox');
      editorBox.querySelector('h3').textContent = existingFlow ? 'Редактирование сценария' : 'Новый сценарий';
      editorBox.style.display = 'block';
      editorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      document.getElementById('flowEditorBody').innerHTML = `
        <div class="field"><label>Название сценария</label><input type="text" id="flowName" maxlength="120" value="${existingFlow ? escapeHtml(existingFlow.name) : ''}"></div>
        <div class="field"><label>Стартовый шаг</label><select id="flowStartStep"></select></div>
        <div id="flowSteps"></div>
        <button type="button" class="btn btn-outline btn-sm" id="flowAddStepBtn">+ Добавить шаг</button>
        <div style="display:flex; gap:10px; margin-top:16px;">
          <button type="button" class="btn btn-primary btn-sm" id="flowSaveBtn">${existingFlow ? 'Сохранить изменения' : 'Сохранить сценарий'}</button>
          <button type="button" class="btn btn-outline btn-sm" id="flowCancelBtn">Отмена</button>
        </div>
      `;
      renderFlowSteps();
      renderStartStepSelect();

      document.getElementById('flowStartStep').addEventListener('change', (e) => { flowStartStepId = e.target.value; });
      document.getElementById('flowAddStepBtn').addEventListener('click', () => {
        flowStepsState.push({ id: newFlowStepId(), message: '', buttons: [], handoffToAI: false, collapsed: false });
        renderFlowSteps();
        renderStartStepSelect();
      });
      document.getElementById('flowCancelBtn').addEventListener('click', () => { editorBox.style.display = 'none'; });
      document.getElementById('flowSaveBtn').addEventListener('click', async () => {
        showError('flowsError', null);
        const name = document.getElementById('flowName').value.trim();
        if (!name) return;
        const btn = document.getElementById('flowSaveBtn');
        setLoading(btn, true);
        try {
          if (existingFlow) {
            await api.updateFlow(agent.id, existingFlow.id, { name, definition: buildFlowDefinition() });
            toast('Сценарий обновлён');
          } else {
            await api.createFlow(agent.id, { name, definition: buildFlowDefinition() });
            toast('Сценарий создан');
          }
          editorBox.style.display = 'none';
          loadFlows();
        } catch (err) {
          showError('flowsError', err);
        } finally {
          setLoading(btn, false, existingFlow ? 'Сохранить изменения' : 'Сохранить сценарий');
        }
      });
    }

    document.getElementById('newFlowBtn').addEventListener('click', () => openFlowEditor(null));

    async function loadFlows() {
      showError('flowsError', null);
      try {
        const data = await api.listFlows(agent.id);
        const flows = data.flows || [];
        document.getElementById('flowsList').innerHTML = flows.map((f) => `
          <div class="list-row">
            <div class="info">
              <div class="title">${escapeHtml(f.name)} ${f.isActive ? '<span class="status-pill published">Активен</span>' : ''}</div>
              <div class="meta">Шагов: ${Object.keys((f.definition && f.definition.steps) || {}).length}</div>
            </div>
            <div class="actions">
              <button data-edit="${f.id}">Изменить</button>
              ${f.isActive
                ? `<button data-deactivate="${f.id}">Деактивировать</button>`
                : `<button data-activate="${f.id}">Активировать</button>`}
              <button data-del="${f.id}">Удалить</button>
            </div>
          </div>
        `).join('') || '<p style="font-size:12.5px; color:var(--dim);">Сценариев пока нет</p>';
        document.querySelectorAll('#flowsList [data-edit]').forEach((b) => {
          b.addEventListener('click', () => {
            const flow = flows.find((f) => f.id === b.dataset.edit);
            if (flow) openFlowEditor(flow);
          });
        });
        document.querySelectorAll('#flowsList [data-activate]').forEach((b) => {
          b.addEventListener('click', async () => { await api.activateFlow(agent.id, b.dataset.activate); toast('Сценарий активирован'); loadFlows(); });
        });
        document.querySelectorAll('#flowsList [data-deactivate]').forEach((b) => {
          b.addEventListener('click', async () => { await api.deactivateFlow(agent.id, b.dataset.deactivate); toast('Сценарий деактивирован'); loadFlows(); });
        });
        document.querySelectorAll('#flowsList [data-del]').forEach((b) => {
          b.addEventListener('click', async () => { await api.deleteFlow(agent.id, b.dataset.del); loadFlows(); });
        });
      } catch (err) {
        showError('flowsError', err);
      }
    }
    loadFlows();
  }

  // ---------- Tab: Действия (custom actions + settings) ----------
  const TRIGGER_LABEL = { llm_tool: 'LLM вызывает сама', event: 'По событию', scenario: 'Из сценария' };

  function renderActionsTab(agent, container) {
    container.innerHTML = `
      <div class="card panel">
        <h3>Custom actions (function calling / вебхуки)</h3>
        <p style="font-size:12.5px; color:var(--dim); margin:-8px 0 14px;">Агент может дёрнуть внешний API — либо сам во время диалога (LLM function calling), либо автоматически по событию (новый лид, эскалация, старт диалога).</p>
        <div id="actionsError"></div>
        <div id="actionsList"></div>
        <button type="button" class="btn btn-outline btn-sm" id="newActionBtn" style="margin-top:10px;">+ Новое действие</button>
        <div id="actionForm" style="display:none; margin-top:16px;"></div>
      </div>

      <div class="card panel">
        <h3>Настройки поведения</h3>
        <div id="settingsError"></div>
        <div id="settingsBody"><p style="color:var(--muted);">Загрузка…</p></div>
      </div>
    `;

    document.getElementById('newActionBtn').addEventListener('click', () => {
      const box = document.getElementById('actionForm');
      box.style.display = 'block';
      box.innerHTML = `
        <div class="field"><label>Имя функции (латиницей, snake_case)</label><input type="text" id="actName" placeholder="schedule_call"></div>
        <div class="field"><label>Описание (когда вызывать)</label><textarea id="actDesc" rows="2" placeholder="Вызывай, когда пользователь хочет записаться на звонок"></textarea></div>
        <div class="field"><label>Режим запуска</label>
          <select id="actTrigger">
            <option value="llm_tool">auto — модель вызывает сама (function calling)</option>
            <option value="event">По событию (лид, эскалация, старт)</option>
            <option value="scenario">Из сценария — на конкретном шаге</option>
          </select>
        </div>
        <div class="field" id="actEventField" style="display:none;">
          <label>Событие</label>
          <select id="actEventName">
            <option value="lead_captured">Лид создан</option>
            <option value="conversation_escalated">Диалог эскалирован</option>
            <option value="conversation_started">Диалог начат</option>
          </select>
        </div>
        <div class="field"><label>Метод</label>
          <select id="actMethod"><option>POST</option><option>GET</option><option>PUT</option><option>PATCH</option></select>
        </div>
        <div class="field"><label>URL</label><input type="text" id="actUrl" placeholder="https://example.com/webhook"></div>
        <div class="field"><label>Заголовки (JSON, необязательно)</label><textarea id="actHeaders" rows="2" placeholder='{"Authorization": "Bearer ..."}'></textarea></div>
        <div class="field"><label>Тело запроса — шаблон (JSON, с {{переменными}})</label><textarea id="actBody" rows="3" placeholder='{"lead_id": "{{leadId}}", "email": "{{email}}"}'></textarea></div>
        <div class="field" id="actParamField"><label>Параметры для модели (JSON Schema, необязательно)</label><textarea id="actParams" rows="3" placeholder='{"type":"object","properties":{"time":{"type":"string"}}}'></textarea></div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button type="button" class="btn btn-primary btn-sm" id="actSaveBtn">Сохранить действие</button>
          <button type="button" class="btn btn-outline btn-sm" id="actTestBtn">Тест действия</button>
          <button type="button" class="btn btn-outline btn-sm" id="actCancelBtn">Отмена</button>
        </div>
        <div id="actTestResult"></div>
      `;
      document.getElementById('actTrigger').addEventListener('change', (e) => {
        const isLlm = e.target.value === 'llm_tool';
        document.getElementById('actEventField').style.display = e.target.value === 'event' ? 'block' : 'none';
        document.getElementById('actParamField').style.display = isLlm ? 'block' : 'none';
      });
      document.getElementById('actParamField').style.display = 'block';

      // Тест действия: пингуем URL напрямую с тестовыми значениями {{переменных}}.
      document.getElementById('actTestBtn').addEventListener('click', async () => {
        const resultBox = document.getElementById('actTestResult');
        resultBox.innerHTML = '';
        const btn = document.getElementById('actTestBtn');
        const url = document.getElementById('actUrl').value.trim();
        if (!url) { resultBox.innerHTML = '<div class="error-banner">Укажите URL для теста</div>'; return; }
        let headers = {}; let bodyTemplate = {};
        try { const h = document.getElementById('actHeaders').value.trim(); headers = h ? JSON.parse(h) : {}; } catch { resultBox.innerHTML = '<div class="error-banner">Заголовки: некорректный JSON</div>'; return; }
        try { const b = document.getElementById('actBody').value.trim(); bodyTemplate = b ? JSON.parse(b) : {}; } catch { resultBox.innerHTML = '<div class="error-banner">Тело запроса: некорректный JSON</div>'; return; }
        // Тестовые значения для всех {{placeholder}} из тела
        const vars = {};
        JSON.stringify(bodyTemplate).replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, k) => { vars[k.split('.')[0]] = 'test_' + k.split('.')[0]; return _; });
        setLoading(btn, true);
        try {
          const { result } = await api.testAction(agent.id, {
            url, method: document.getElementById('actMethod').value, headers, bodyTemplate, variables: vars,
          });
          const cls = result.ok ? 'ok' : 'fail';
          resultBox.innerHTML = `<div class="test-result ${cls}">HTTP ${result.status ?? '—'} · ${result.durationMs}мс\nОтправлено: ${escapeHtml(JSON.stringify(result.sentBody))}\nОтвет: ${escapeHtml((result.response || '').slice(0, 600))}</div>`;
        } catch (err) {
          resultBox.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
        } finally {
          setLoading(btn, false, 'Тест действия');
        }
      });
      document.getElementById('actCancelBtn').addEventListener('click', () => { box.style.display = 'none'; });
      document.getElementById('actSaveBtn').addEventListener('click', async () => {
        showError('actionsError', null);
        const btn = document.getElementById('actSaveBtn');
        setLoading(btn, true);
        try {
          const triggerType = document.getElementById('actTrigger').value;
          let headers = {};
          let bodyTemplate = {};
          let paramSchema = {};
          const headersRaw = document.getElementById('actHeaders').value.trim();
          const bodyRaw = document.getElementById('actBody').value.trim();
          const paramsRaw = document.getElementById('actParams').value.trim();
          try { headers = headersRaw ? JSON.parse(headersRaw) : {}; } catch { throw new Error('Заголовки: некорректный JSON'); }
          try { bodyTemplate = bodyRaw ? JSON.parse(bodyRaw) : {}; } catch { throw new Error('Тело запроса: некорректный JSON'); }
          try { paramSchema = paramsRaw ? JSON.parse(paramsRaw) : {}; } catch { throw new Error('Параметры: некорректный JSON'); }

          await api.createAction(agent.id, {
            name: document.getElementById('actName').value.trim(),
            description: document.getElementById('actDesc').value.trim(),
            method: document.getElementById('actMethod').value,
            url: document.getElementById('actUrl').value.trim(),
            headers,
            bodyTemplate,
            paramSchema,
            triggerType,
            eventName: triggerType === 'event' ? document.getElementById('actEventName').value : undefined,
          });
          toast('Действие создано');
          box.style.display = 'none';
          loadActions();
        } catch (err) {
          showError('actionsError', err);
        } finally {
          setLoading(btn, false, 'Сохранить действие');
        }
      });
    });

    async function loadActions() {
      showError('actionsError', null);
      try {
        const data = await api.listActions(agent.id);
        document.getElementById('actionsList').innerHTML = (data.actions || []).map((a) => `
          <div class="list-row">
            <div class="info">
              <div class="title">${escapeHtml(a.name)}</div>
              <div class="meta">${TRIGGER_LABEL[a.triggerType] || a.triggerType}${a.eventName ? ` (${escapeHtml(a.eventName)})` : ''} · ${escapeHtml(a.method)} ${escapeHtml(a.url)}</div>
            </div>
            <div class="actions"><button data-del="${a.id}">Удалить</button></div>
          </div>
        `).join('') || '<p style="font-size:12.5px; color:var(--dim);">Действий пока нет</p>';
        document.querySelectorAll('#actionsList [data-del]').forEach((b) => {
          b.addEventListener('click', async () => { await api.deleteAction(agent.id, b.dataset.del); loadActions(); });
        });
      } catch (err) {
        showError('actionsError', err);
      }
    }
    loadActions();

    async function loadSettings() {
      showError('settingsError', null);
      try {
        const data = await api.getSettings(agent.id);
        const s = data.settings;
        document.getElementById('settingsBody').innerHTML = `
          <div class="toggle-row">
            <div><div class="label">Проактивное сообщение</div><div class="desc">Показать приглашение через N секунд после открытия страницы</div></div>
            <label class="switch"><input type="checkbox" id="setProactive" ${s.proactiveEnabled ? 'checked' : ''}><span class="track"></span></label>
          </div>
          <div class="field"><label>Текст проактивного сообщения</label><input type="text" id="setProactiveMsg" value="${escapeHtml(s.proactiveMessage || '')}"></div>
          <div class="field"><label>Задержка (секунд)</label><input type="text" id="setProactiveDelay" value="${s.proactiveDelaySeconds || 15}"></div>

          <div class="toggle-row">
            <div><div class="label">Узнавать вернувшихся клиентов</div><div class="desc">Разное приветствие для новых и постоянных посетителей (определяется в браузере)</div></div>
            <label class="switch"><input type="checkbox" id="setReturning" ${s.enableReturningGreeting ? 'checked' : ''}><span class="track"></span></label>
          </div>
          <div id="returningFields" style="display:${s.enableReturningGreeting ? 'block' : 'none'};">
            <div class="field"><label>Приветствие для новых посетителей</label><input type="text" id="setGreetingNew" value="${escapeHtml(s.greetingNew || '')}" placeholder="Здравствуйте! Чем можем помочь?"></div>
            <div class="field"><label>Приветствие для постоянных клиентов</label><input type="text" id="setGreetingReturning" value="${escapeHtml(s.greetingReturning || '')}" placeholder="С возвращением! Рады снова вас видеть. Готовы продолжить покупки?"></div>
          </div>

          <div class="toggle-row">
            <div><div class="label">Эскалация на человека</div><div class="desc">По ключевым словам переводить диалог в статус «эскалирован»</div></div>
            <label class="switch"><input type="checkbox" id="setEscalation" ${s.escalationEnabled ? 'checked' : ''}><span class="track"></span></label>
          </div>
          <div class="field"><label>Ключевые слова (через запятую)</label><input type="text" id="setEscalationKw" value="${escapeHtml((s.escalationKeywords || []).join(', '))}"></div>

          <div class="toggle-row">
            <div><div class="label">Запрашивать email при вызове оператора</div><div class="desc">Когда диалог переводится на оператора — показать форму сбора email, чтобы вернуть клиента</div></div>
            <label class="switch"><input type="checkbox" id="setEmailOnEsc" ${s.enableEmailOnEscalation ? 'checked' : ''}><span class="track"></span></label>
          </div>
          <div id="emailOnEscField" class="field" style="display:${s.enableEmailOnEscalation ? 'block' : 'none'};">
            <label>Сообщение при запросе email</label>
            <input type="text" id="setEscEmailMsg" value="${escapeHtml(s.escalationEmailMessage || '')}" placeholder="Менеджер ответит вам в ближайшее время. Пожалуйста, оставьте свой email, чтобы мы прислали ответ, если вы закроете сайт.">
          </div>

          <div class="toggle-row">
            <div><div class="label">Автоопределение языка</div><div class="desc">Отвечать на языке последнего сообщения пользователя</div></div>
            <label class="switch"><input type="checkbox" id="setAutoLang" ${s.autoLanguage ? 'checked' : ''}><span class="track"></span></label>
          </div>

          <div class="toggle-row">
            <div><div class="label">Сбор контакта (фоллбек)</div><div class="desc">Показывать форму «оставьте контакт», если бот не справился</div></div>
            <label class="switch"><input type="checkbox" id="setEmailFallback" ${s.emailFallbackEnabled ? 'checked' : ''}><span class="track"></span></label>
          </div>
          <div class="field">
            <label>Что собирать в форме захвата</label>
            <select id="setLeadContactType">
              <option value="email" ${(s.leadContactType || 'email') === 'email' ? 'selected' : ''}>Email</option>
              <option value="phone" ${s.leadContactType === 'phone' ? 'selected' : ''}>Телефон</option>
            </select>
          </div>

          <button type="button" class="btn btn-primary btn-sm" id="settingsSaveBtn" style="margin-top:14px;">Сохранить настройки</button>
        `;
        // Показ/скрытие условных полей по тумблерам.
        document.getElementById('setReturning').addEventListener('change', (e) => {
          document.getElementById('returningFields').style.display = e.target.checked ? 'block' : 'none';
        });
        document.getElementById('setEmailOnEsc').addEventListener('change', (e) => {
          document.getElementById('emailOnEscField').style.display = e.target.checked ? 'block' : 'none';
        });
        document.getElementById('settingsSaveBtn').addEventListener('click', async () => {
          showError('settingsError', null);
          const btn = document.getElementById('settingsSaveBtn');
          setLoading(btn, true);
          try {
            await api.updateSettings(agent.id, {
              proactiveEnabled: document.getElementById('setProactive').checked,
              proactiveMessage: document.getElementById('setProactiveMsg').value.trim() || undefined,
              proactiveDelaySeconds: Number(document.getElementById('setProactiveDelay').value) || 15,
              enableReturningGreeting: document.getElementById('setReturning').checked,
              greetingNew: document.getElementById('setGreetingNew').value.trim() || undefined,
              greetingReturning: document.getElementById('setGreetingReturning').value.trim() || undefined,
              escalationEnabled: document.getElementById('setEscalation').checked,
              escalationKeywords: document.getElementById('setEscalationKw').value.split(',').map((s2) => s2.trim()).filter(Boolean),
              enableEmailOnEscalation: document.getElementById('setEmailOnEsc').checked,
              escalationEmailMessage: document.getElementById('setEscEmailMsg').value.trim() || undefined,
              autoLanguage: document.getElementById('setAutoLang').checked,
              emailFallbackEnabled: document.getElementById('setEmailFallback').checked,
              leadContactType: document.getElementById('setLeadContactType').value,
            });
            toast('Настройки сохранены');
          } catch (err) {
            showError('settingsError', err);
          } finally {
            setLoading(btn, false, 'Сохранить настройки');
          }
        });
      } catch (err) {
        showError('settingsError', err);
      }
    }
    loadSettings();
  }

  // ---------- Tab: Аналитика ----------
  // ---------- Tab: Лиды ----------
  async function renderLeadsTab(agent, container) {
    container.innerHTML = `
      <div class="card panel">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:6px;">
          <h3 style="margin:0;">База лидов <span id="leadsCount" style="color:var(--dim); font-weight:400; font-size:13px;"></span></h3>
          <button type="button" class="btn btn-outline btn-sm" id="exportLeadsBtn">Экспорт CSV</button>
        </div>
        <div id="leadsError"></div>
        <div id="leadsBody"><p style="color:var(--muted);">Загрузка…</p></div>
      </div>
    `;

    document.getElementById('exportLeadsBtn').addEventListener('click', async () => {
      const btn = document.getElementById('exportLeadsBtn');
      setLoading(btn, true);
      try {
        const blob = await api.exportLeadsCsv(agent.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `leads-${agent.publicSlug}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      } catch (err) { showError('leadsError', err); }
      finally { setLoading(btn, false, 'Экспорт CSV'); }
    });

    try {
      const data = await api.listLeads(agent.id);
      const leads = data.leads || [];
      document.getElementById('leadsCount').textContent = leads.length ? `— ${leads.length}` : '';
      document.getElementById('leadsBody').innerHTML = leads.length
        ? `<table class="leads-table">
            <thead><tr><th>Дата</th><th>Контакт</th><th>Имя</th><th></th></tr></thead>
            <tbody>${leads.map((l) => `
              <tr>
                <td>${new Date(l.createdAt).toLocaleDateString('ru-RU')} ${new Date(l.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${escapeHtml(l.email || l.phone || '—')}</td>
                <td>${escapeHtml(l.name || '—')}</td>
                <td style="text-align:right;">${l.conversationId ? `<button class="read-btn" data-conv="${l.conversationId}">Читать</button>` : ''}</td>
              </tr>`).join('')}</tbody>
          </table>`
        : '<p style="font-size:13px; color:var(--dim);">Пока нет собранных контактов. Лиды появятся, когда посетители оставят email или телефон в виджете.</p>';

      document.querySelectorAll('#leadsBody [data-conv]').forEach((b) => {
        b.addEventListener('click', () => openConversationModal(agent, b.dataset.conv));
      });
    } catch (err) {
      document.getElementById('leadsBody').innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  }

  async function openConversationModal(agent, conversationId) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal conv-modal">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
          <h2 style="margin:0;">История диалога</h2>
          <button type="button" id="convClose" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;">✕</button>
        </div>
        <div class="conv-messages" id="convMessages"><p style="color:var(--muted);">Загрузка…</p></div>
      </div>
    `;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    backdrop.querySelector('#convClose').addEventListener('click', close);

    try {
      const data = await api.getConversationMessages(agent.id, conversationId);
      const msgs = (data.messages || []).filter((m) => m.role !== 'system');
      document.getElementById('convMessages').innerHTML = msgs.length
        ? msgs.map((m) => `<div class="conv-msg ${m.role === 'user' ? 'user' : 'assistant'}">${escapeHtml(m.content)}</div>`).join('')
        : '<p style="color:var(--dim);">Сообщений нет.</p>';
    } catch (err) {
      document.getElementById('convMessages').innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  }

  async function renderAnalyticsTab(agent, container) {
    container.innerHTML = `<div id="analyticsBody"><p style="color:var(--muted);">Загрузка…</p></div>`;
    let s;
    try {
      const data = await api.getAnalytics(agent.id, 30);
      s = data.summary;
    } catch (err) {
      document.getElementById('analyticsBody').innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
      return;
    }
    const fb = s.feedback || { positive: 0, negative: 0 };
    const f = s.funnel || { loaded: 0, opened: 0, chatStarted: 0, openRate: 0, chatRate: 0 };
    const res = s.resolution || { aiPct: 0, transferPct: 100 };
    const maxFunnel = Math.max(1, f.loaded, f.opened, f.chatStarted);
    const donutBg = `conic-gradient(#35DDA1 0% ${res.aiPct}%, #9B7BF0 ${res.aiPct}% 100%)`;

    document.getElementById('analyticsBody').innerHTML = `
      <div class="an-cards">
        <div class="an-card"><div class="num">${s.conversations}</div><div class="lbl">Диалогов (30 дн.)</div></div>
        <div class="an-card"><div class="num">${s.messages}</div><div class="lbl">Сообщений</div></div>
        <div class="an-card"><div class="num">${s.leads}</div><div class="lbl">Лидов</div></div>
        <div class="an-card"><div class="num">${f.chatStarted}</div><div class="lbl">Начатых переписок</div></div>
        <div class="an-card"><div class="num" style="color:#35DDA1;">${fb.positive}</div><div class="lbl"><span class="an-dot" style="background:#35DDA1;"></span>Хороших ответов</div></div>
        <div class="an-card"><div class="num" style="color:#F0616D;">${fb.negative}</div><div class="lbl"><span class="an-dot" style="background:#F0616D;"></span>Плохих ответов</div></div>
      </div>

      <div class="an-banner">
        <div class="ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#35DDA1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></div>
        <div style="flex:1;">
          <div class="eyebrow">Сэкономленное время</div>
          <div class="big">${escapeHtml(s.savedTime.text)}</div>
          <div class="sub">Рассчитано на основе ${s.savedTime.closedByAi} закрытых ИИ диалогов (в среднем 5 мин на диалог)</div>
        </div>
      </div>

      <div class="an-grid g64">
        <div class="an-panel">
          <h4>Воронка конверсии виджета</h4>
          <div class="desc">Путь посетителя от показа до диалога</div>
          <div class="an-funnel">
            <div class="an-frow"><div class="top"><span class="name">Показы виджета</span><span class="val">${f.loaded}</span></div><div class="an-fbar"><div style="width:${Math.round((f.loaded / maxFunnel) * 100)}%;"></div></div></div>
            <div class="an-frow"><div class="top"><span class="name">Открытия (диалоги) <span class="pct">· ${Math.min(100, f.openRate)}%</span></span><span class="val">${f.opened}</span></div><div class="an-fbar"><div style="width:${Math.round((f.opened / maxFunnel) * 100)}%;"></div></div></div>
            <div class="an-frow"><div class="top"><span class="name">Начатые переписки <span class="pct">· ${Math.min(100, f.chatRate)}%</span></span><span class="val">${f.chatStarted}</span></div><div class="an-fbar"><div style="width:${Math.round((f.chatStarted / maxFunnel) * 100)}%;"></div></div></div>
          </div>
          <div class="an-triggers">
            <div class="t">Источники диалогов (Триггеры)</div>
            ${(s.triggers || []).map((t) => `<div class="an-trow"><span>${escapeHtml(t.label)}</span><span class="cnt">${t.count}</span></div>`).join('') || '<div class="an-empty">Пока нет данных по триггерам</div>'}
          </div>
        </div>

        <div class="an-panel" style="display:flex; flex-direction:column;">
          <h4>Уровень автономности</h4>
          <div class="desc">Resolution Rate</div>
          <div class="an-donut-wrap"><div class="an-donut" style="background:${donutBg};"><div class="hole"><div class="p">${res.aiPct}%</div><div class="l">автономность</div></div></div></div>
          <div class="an-legend">
            <div class="row"><span class="k"><span class="sq" style="background:#35DDA1;"></span>ИИ ответил сам</span><span>${res.aiPct}%</span></div>
            <div class="row"><span class="k"><span class="sq" style="background:#9B7BF0;"></span>Переведено на менеджера</span><span>${res.transferPct}%</span></div>
          </div>
        </div>
      </div>

      <div class="an-grid g11">
        <div class="an-panel">
          <h4>О чём спрашивают клиенты</h4>
          <div class="desc">Самые частые темы диалогов</div>
          ${(s.topics && s.topics.length) ? `<div class="an-topics">${s.topics.map((t) => `<div><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-size:13px;color:#C9CFDB;">${escapeHtml(t.name)}</span><span style="font-size:13px;color:#8B92A5;">${t.pct}%</span></div><div class="an-tbar"><div style="width:${t.pct}%;"></div></div></div>`).join('')}</div>` : '<div class="an-empty">Анализ тем появится, когда накопятся завершённые диалоги.</div>'}
        </div>

        <div class="an-panel">
          <h4>Топ рекомендаций ИИ</h4>
          <div class="desc">Товары, которые чаще всего советовал ассистент</div>
          ${(s.topProducts && s.topProducts.length) ? `<div class="an-prod">${s.topProducts.map((p, i) => `<div class="an-prow"><div class="thumb"></div><div class="info"><div class="nm">${escapeHtml(p.name || '—')}</div><div class="cnt">предложено <span style="color:#35DDA1;font-weight:600;">${p.count} ${p.count === 1 ? 'раз' : 'раз'}</span></div></div><div class="rank">#${i + 1}</div></div>`).join('')}</div>` : '<div class="an-empty">Пока ИИ не рекомендовал товары.</div>'}
        </div>
      </div>

      <div class="an-panel" style="margin-top:16px;">
        <h4>Вопросы без ответа</h4>
        <div class="desc">Вопросы, на которые не нашлось релевантного контекста в базе знаний — кандидаты на добавление в Q&amp;A.</div>
        <div id="unansList" style="margin-top:16px;"></div>
      </div>
    `;

    function renderUnanswered(list) {
      const box = document.getElementById('unansList');
      box.innerHTML = (list || []).map((q) => `
        <div class="an-unans-row" data-id="${q.id}"><span class="q">${escapeHtml(q.question || '—')}</span><button data-resolve="${q.id}">Решено</button></div>
      `).join('') || '<div class="an-empty">Пока нет неотвеченных вопросов 🎉</div>';
      box.querySelectorAll('[data-resolve]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            await api.resolveUnanswered(agent.id, btn.dataset.resolve);
            box.querySelector(`.an-unans-row[data-id="${btn.dataset.resolve}"]`)?.remove();
            if (!box.querySelector('.an-unans-row')) box.innerHTML = '<div class="an-empty">Пока нет неотвеченных вопросов 🎉</div>';
            toast('Отмечено как решённое');
          } catch (err) { toast(err.message); btn.disabled = false; }
        });
      });
    }
    renderUnanswered(s.unansweredQuestions);
  }

  // ---------- boot ----------
  // ---------- boot ----------
  function initLangSwitcher() {
    const bindBtns = () => {
      document.querySelectorAll('.lang-btn-ua').forEach((btn) => {
        btn.addEventListener('click', () => {
          applyLanguage('uk');
        });
      });
      document.querySelectorAll('.lang-btn-ru').forEach((btn) => {
        btn.addEventListener('click', () => {
          applyLanguage('ru');
        });
      });
      document.querySelectorAll('.lang-btn-en').forEach((btn) => {
        btn.addEventListener('click', () => {
          applyLanguage('en');
        });
      });
    };
    bindBtns();
  }

  function applyLanguage(selectedLang) {
    lang = selectedLang;
    try {
      localStorage.setItem('emble.lang', lang);
    } catch (e) {}
    
    // Update active switcher buttons style
    document.querySelectorAll('.lang-btn-ua').forEach((btn) => {
      btn.style.color = lang === 'uk' ? '#818CF8' : '#6B7280';
    });
    document.querySelectorAll('.lang-btn-ru').forEach((btn) => {
      btn.style.color = lang === 'ru' ? '#818CF8' : '#6B7280';
    });
    document.querySelectorAll('.lang-btn-en').forEach((btn) => {
      btn.style.color = lang === 'en' ? '#818CF8' : '#6B7280';
    });

    document.documentElement.lang = lang;

    // Translate any static elements in dashboard.html that have data-i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      const authMap = {
        auth_login_tab: t('Вход'),
        auth_register_tab: t('Регистрация'),
        auth_login_title: t('С возвращением'),
        auth_login_sub: t('Войдите, чтобы управлять агентами.'),
        auth_email: 'Email',
        auth_password: t('Пароль'),
        auth_login_btn: t('Войти'),
        auth_demo: t('Демо-доступ:'),
        auth_seed: t('(после npm run seed)'),
        auth_reg_title: t('Создать аккаунт'),
        auth_reg_sub: t('Бесплатный тариф навсегда, без карты.'),
        auth_reg_org: t('Название организации'),
        auth_reg_pass_hint: t('Минимум 8 символов'),
        auth_reg_btn: t('Создать агента бесплатно'),
        auth_logout: t('Выйти'),
        dash_my_agents: t('Мои агенты'),
        dash_agents_desc: t('Створіть ШІ-агента та отримайте код для вставки на сайт.'),
        dash_create_agent: t('+ Создать агента'),
        modal_new_agent: t('Новый агент'),
        modal_name: t('Название'),
        modal_template: t('Шаблон поведения'),
        modal_cancel: t('Отмена'),
        modal_create: t('Создать'),
      };
      if (authMap[key]) {
        el.textContent = authMap[key];
      }
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      const placeholderMap = {
        modal_name_placeholder: t('Например, Поддержка сайта'),
      };
      if (placeholderMap[key]) {
        el.placeholder = placeholderMap[key];
      }
    });

    // Re-render active view to apply translation dynamically
    if (appView.style.display === 'block') {
      if (agentsListView.style.display === 'block') {
        loadAgents();
      } else if (currentAgent) {
        const activeTabBtn = document.querySelector('#detailTabs .tab-btn.active');
        const currentTab = activeTabBtn ? activeTabBtn.dataset.tab : 'overview';
        renderAgentDetail(currentAgent);
        const tabBtn = document.querySelector(`#detailTabs .tab-btn[data-tab="${currentTab}"]`);
        if (tabBtn) {
          tabBtn.click();
        }
      }
    }
  }

  initLangSwitcher();
  applyLanguage(lang);

  if (api.isAuthed()) {
    enterApp();
  } else {
    authView.style.display = 'flex';
    appView.style.display = 'none';
  }
})();

(function () {
  let lang = null;
  try {
    lang = localStorage.getItem('emble.lang');
  } catch (e) {}
  if (!lang) lang = 'uk';

  const TRANSLATIONS = {
    uk: {
      page_title: 'Emble — ШІ-агенти для вашого сайту за 5 хвилин',
      nav_templates: 'Шаблони',
      nav_customize: 'Кастомізація',
      nav_integration: 'Інтеграція',
      nav_how: 'Як це працює',
      nav_login: 'Увійти',
      hero_badge: 'Нове: ШІ-агенти на GPT-4o та Claude',
      hero_title: 'Оживіть ваш сайт розумними<br><span class="grad">ШІ-агентами</span> за 5 хвилин',
      hero_desc: 'Налаштуйте логіку ШІ, оформіть віджет під свій бренд та вбудуйте на сайт одним рядком коду. Без розробників та складних інтеграцій.',
      hero_cta_panel: 'Увійти в панель',
      hero_cta_how: 'Як це працює',
      demo_step1: 'Крок 1 · Вибір агента',
      demo_title: 'Панель керування віджетом',
      demo_foot: 'Зміни застосовуються до прев\'ю миттєво',
      w_status: 'онлайн',
      w_input_placeholder: 'Напишіть повідомлення…',
      ff_eyebrow: 'Форм-фактори',
      ff_title: 'Один агент — будь-який формат',
      ff_desc: 'Оберіть, як віджет живе на сторінці. Логіка залишається незмінною — змінюється лише оболонка.',
      ff_floating_desc: 'Плаваючий куточок — класика для підтримки на всьому сайті.',
      ff_inline_desc: 'Вбудовується прямо в тіло статті чи лендингу як частина контенту.',
      ff_side_desc: 'Панель збоку на пів екрана для складних консультацій.',
      ff_minimal_desc: 'Ненав\'язлива хмарка-підказка без відкритого вікна чату.',
      custom_step2: 'Крок 2 · Кастомізація',
      custom_title: 'Зберіть віджет під свій бренд',
      custom_desc: 'Аватар, фірмові кольори, привітання та швидкі відповіді — без жодного рядка CSS.',
      custom_avatar: 'Аватар асистента',
      custom_color: 'Фірмовий колір',
      custom_welcome: 'Привітальне повідомлення',
      custom_welcome_box: 'Вітаю! Я ваш ШІ-асистент. Чим можу допомогти сьогодні?',
      custom_replies: 'Швидкі відповіді (Quick Replies)',
      reply_prices: 'Дізнатись ціни',
      reply_demo: 'Замовити демо',
      reply_contacts: 'Зв\'язатись з нами',
      reply_add: '+ додати',
      preview_agent_name: 'Ваш асистент',
      preview_agent_status: 'на зв\'язку',
      preview_agent_msg: 'Вітаю! Я ваш ШІ-асистент. Чим можу допомогти?',
      preview_input_placeholder: 'Напишіть повідомлення…',
      sb_eyebrow: 'Жива пісочниця',
      sb_title: 'Спробуйте віджет прямо тут',
      sb_desc: 'Перемикайте форму, положення, тему та акцент — вікно браузера оновлюється миттєво, як на реальному сайті.',
      sb_form: 'Форма',
      sb_pos: 'Положення',
      sb_theme: 'Тема сайту',
      sb_accent: 'Акцент',
      sb_widget_open: 'Віджет відкритий',
      uc_eyebrow: 'Сценарії в дії',
      uc_title: 'Не просто чат — він вирішує завдання',
      uc_desc: 'Агент рекомендує товари, відстежує доставку та кваліфікує ліди прямо в діалозі.',
      int_eyebrow: 'Крок 3 · Інтеграція',
      int_title: 'Один рядок — і агент на сайті',
      int_desc: 'Вставте скрипт перед закриваючим тегом body. Віджет завантажиться асинхронно і не сповільнить сторінку.',
      how_eyebrow: 'Як це працює',
      how_title: 'Три прості кроки до запуску',
      how_step1_title: 'Навчіть ШІ',
      how_step1_desc: 'Завантажте текст, посилання або базу знань — або просто опишіть поведінку промптом.',
      how_step2_title: 'Налаштуйте дизайн',
      how_step2_desc: 'Оберіть форму, фірмові кольори, аватар та швидкі відповіді у візуальному конструкторі.',
      how_step3_title: 'Вставте код',
      how_step3_desc: 'Один рядок на Tilda, WordPress, Shopify чи Webflow — і агент уже працює.',
      cta_title: 'Керуйте своїми ШІ-агентами',
      cta_desc: 'Увійдіть в панель за вашим логіном та паролем — створюйте, налаштовуйте та вбудовуйте агентів на свій сайт.',
      cta_btn: 'Увійти в панель',
      footer_copy: '© 2026 · Усі права захищені',
      footer_contacts: 'Контакти',
      copied: 'Скопійовано',
      copy_code: 'Copy Code',
    },
    ru: {
      page_title: 'Emble — ИИ-агенты для вашего сайта за 5 минут',
      nav_templates: 'Шаблоны',
      nav_customize: 'Кастомизация',
      nav_integration: 'Интеграция',
      nav_how: 'Как это работает',
      nav_login: 'Войти',
      hero_badge: 'Новое: ИИ-агенты на GPT-4o и Claude',
      hero_title: 'Оживите ваш сайт умными<br><span class="grad">ИИ-агентами</span> за 5 минут',
      hero_desc: 'Настройте логику ИИ, оформите виджет под свой бренд и встройте на сайт одной строкой кода. Без разработчиков и сложных интеграций.',
      hero_cta_panel: 'Войти в панель',
      hero_cta_how: 'Как это работает',
      demo_step1: 'Шаг 1 · Выбор агента',
      demo_title: 'Панель управления виджетом',
      demo_foot: 'Изменения применяются к превью мгновенно',
      w_status: 'онлайн',
      w_input_placeholder: 'Напишите сообщение…',
      ff_eyebrow: 'Форм-факторы',
      ff_title: 'Один агент — любой формат',
      ff_desc: 'Выберите, как виджет живёт на странице. Логика остаётся прежней — меняется только оболочка.',
      ff_floating_desc: 'Плавающая кнопка в углу — классика для поддержки на всём сайте.',
      ff_inline_desc: 'Встраиется прямо в тело статьи или лендинга как часть контента.',
      ff_side_desc: 'Выезжающая шторка на пол-экрана для сложных консультаций.',
      ff_minimal_desc: 'Ненавязчивое облачко-подсказка без открытого окна чата.',
      custom_step2: 'Шаг 2 · Кастомизация',
      custom_title: 'Соберите виджет под свой бренд',
      custom_desc: 'Аватар, фирменные цвета, приветствие и быстрые ответы — без единой строки CSS.',
      custom_avatar: 'Аватар ассистента',
      custom_color: 'Фирменный цвет',
      custom_welcome: 'Приветственное сообщение',
      custom_welcome_box: 'Здравствуйте! Я ваш ИИ-ассистент. Чем могу помочь сегодня?',
      custom_replies: 'Быстыре ответы (Quick Replies)',
      reply_prices: 'Узнать цены',
      reply_demo: 'Заказать демо',
      reply_contacts: 'Связаться с нами',
      reply_add: '+ добавить',
      preview_agent_name: 'Ваш ассистент',
      preview_agent_status: 'на связи',
      preview_agent_msg: 'Здравствуйте! Я ваш ИИ-ассистент. Чем могу помочь?',
      preview_input_placeholder: 'Напишите сообщение…',
      sb_eyebrow: 'Живая песочница',
      sb_title: 'Покрутите виджет прямо здесь',
      sb_desc: 'Переключайте форму, положение, тему и акцент — окно браузера обновляется мгновенно, как на реальном сайте.',
      sb_form: 'Форма',
      sb_pos: 'Положение',
      sb_theme: 'Тема сайта',
      sb_accent: 'Акцент',
      sb_widget_open: 'Виджет открыт',
      uc_eyebrow: 'Сценарии в действии',
      uc_title: 'Не просто чат — он решает задачи',
      uc_desc: 'Агент рекомендует товары, отслеживает доставку и квалифицирует лиды прямо в диалоге.',
      int_eyebrow: 'Шаг 3 · Интеграция',
      int_title: 'Одна строка — и агент на сайте',
      int_desc: 'Вставьте скрипт перед закрывающим тегом body. Виджет подгрузится асинхронно и не замедлит страницу.',
      how_eyebrow: 'Как это работает',
      how_title: 'Три простых шага до запуска',
      how_step1_title: 'Обучите ИИ',
      how_step1_desc: 'Загрузите текст, ссылки или базу знаний — либо просто опишите поведение промптом.',
      how_step2_title: 'Настройте дизайн',
      how_step2_desc: 'Выберите форму, фирменные цвета, аватар и быстрые ответы в визуальном конструкторе.',
      how_step3_title: 'Вставьте код',
      how_step3_desc: 'Одна строка на Tilda, WordPress, Shopify или Webflow — и агент уже работает.',
      cta_title: 'Управляйте своими ИИ-агентами',
      cta_desc: 'Войдите в панель по вашему логину и паролю — создавайте, настраивайте и встраивайте агентов на свой сайт.',
      cta_btn: 'Войти в панель',
      footer_copy: '© 2026 · Все права защищены',
      footer_contacts: 'Контакты',
      copied: 'Скопировано',
      copy_code: 'Copy Code',
    }
  };

  const DATA = {
    uk: {
      TEMPLATES: [
        {
          id: 'support', name: 'Чат-підтримка', desc: 'Відповідає на запитання клієнтів 24/7',
          accent: '#6366F1', accent2: '#8B5CF6', glow: 'rgba(99,102,241,0.45)', chipBg: 'rgba(99,102,241,0.08)', initial: 'Ч',
          greeting: 'Вітаю! Я на зв\'язку 24/7 — розкажіть, чим допомогти.',
          replies: ['Статус замовлення', 'Оформити повернення', 'Покликати оператора'],
        },
        {
          id: 'sales', name: 'Помічник з продажів', desc: 'Веде клієнта до покупки',
          accent: '#10B981', accent2: '#34D399', glow: 'rgba(16,185,129,0.42)', chipBg: 'rgba(16,185,129,0.08)', initial: 'П',
          greeting: 'Шукаєте щось конкретне? Допоможу підібрати підходящий варіант.',
          replies: ['Підібрати тариф', 'Порівняти плани', 'Отримати знижку'],
        },
        {
          id: 'leads', name: 'Генератор лідів', desc: 'Збирає та кваліфікує контакти',
          accent: '#8B5CF6', accent2: '#A78BFA', glow: 'rgba(139,92,246,0.44)', chipBg: 'rgba(139,92,246,0.08)', initial: 'Г',
          greeting: 'Залиште контакт — надішлемо персональне демо під ваше завдання.',
          replies: ['Замовити демо', 'Завантажити прайс', 'Замовити дзвінок'],
        },
      ],
      SCENARIOS: {
        products: {
          label: '🛍️ Рекомендація товарів', emoji: '🛍️', botName: 'Асистент магазину',
          title: 'Підбирає товар як живий продавець',
          desc: 'Агент уточнює потребу, враховує бюджет і пропонує конкретні позиції з ціною та кнопкою покупки — прямо в чаті.',
          points: ['Розуміє запит природною мовою', 'Показує картки з ціною та знижкою', 'Веде клієнта в кошик без переходу зі сторінки'],
          userMsg: 'Порадьте кросівки для бігу до 4000 грн',
          botMsg: 'Звичайно! Під біг і такий бюджет чудово підійдуть два варіанти 👇',
          replies: ['Показати ще', 'Є розмір 42?', 'Порівняти моделі'],
        },
        delivery: {
          label: '📦 Запитання про доставку', emoji: '📦', botName: 'Підтримка доставки',
          title: 'Знає правила доставки магазину',
          desc: 'Агент навчений на умовах вашого магазину і впевнено відповідає на уточнюючі питання — які служби доступні, терміни та способи оплати.',
          points: ['Знає доступні служби та способи доставки', 'Відповідає за правилами з вашої бази знань', 'Знімає навантаження з підтримки 24/7'],
          userMsg: 'Чи можу я оформити доставку Новою Поштою?',
          botMsg: 'Секунду, уточню за правилами магазину 👇',
          replies: ['Терміни доставки', 'Вартість', 'Оплата при отриманні'],
        },
        leads: {
          label: '🎯 Збір ліда', emoji: '🎯', botName: 'Менеджер з продажів',
          title: 'Кваліфікує та збирає контакти',
          desc: 'Агент з\'ясовує завдання, відповідає на заперечення та акуратно збирає контакт, передаючи теплий лід у вашу CRM.',
          points: ['Ставить кваліфікуючі запитання', 'Збирає ім\'я та контакт у форму', 'Передає лід у CRM автоматично'],
          userMsg: 'Хочу зрозуміти, чи підійде це для мого бізнесу',
          botMsg: 'Підберемо рішення під ваше завдання. Залиште контакт — надішлемо персональне демо 👇',
          replies: ['Скільки коштує?', 'Є інтеграції?', 'Замовити дзвінок'],
        },
      },
      UC_PRODUCTS: [
        { name: 'Aero Run 2', tag: 'Хіт', price: '2 800 грн', old: '3 400 грн', swatch: 'linear-gradient(135deg,#6366F1,#8B5CF6)' },
        { name: 'Swift Trail', tag: '-20%', price: '3 000 грн', old: '3 700 грн', swatch: 'linear-gradient(135deg,#10B981,#34D399)' },
      ],
      UC_DELIVERY: 'Так, звичайно! Ми відправляємо Новою Поштою — як у відділення, так і кур\'єром до дверей. Термін доставки зазвичай 1–3 дні, оплата за тарифом перевізника. Доступна післяплата — можна сплатити при отриманні.',
      pg_replies_float: ['Тарифи', 'Демо'],
      pg_fw_status2: 'розгорнута консультація',
      pg_fw_name_consultant: 'Консультант',
      pg_fw_name_assistant: 'Ваш асистент',
      pg_bubble_consultant: 'Вітаю! Розповійте про завдання — підберу рішення та оформимо заявку.',
      pg_bubble_user: 'Потрібна інтеграція з CRM',
      pg_bubble_assistant: 'Привіт! Чим можу допомогти сьогодні?',
      pg_iw_name_inline: 'Вбудований асистент',
      pg_bubble_inline: 'Готовий відповісти на запитання прямо в статті — запитуйте що завгодно.',
      pg_chips_inline: ['Дізнатись ціни', 'Замовити демо'],
    },
    ru: {
      TEMPLATES: [
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
      ],
      SCENARIOS: {
        products: {
          label: '🛍️ Рекомендация товаров', emoji: '🛍️', botName: 'Ассистент магазина',
          title: 'Подбирает товар как живой продавец',
          desc: 'Агент уточняет потребность, учитывает бюджет и предлагает конкретные позиции с ценой и кнопкой покупки — прямо в чате.',
          points: ['Понимает запрос на естественном языке', 'Показывает карточки с ценой и скидкой', 'Ведет клиента в корзину без ухода со страницы'],
          userMsg: 'Посоветуйте кроссовки для бега до 4000 грн',
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
          points: ['Задает квалифицирующие вопросы', 'Собирает имя и контакт в форму', 'Передает лид в CRM автоматически'],
          userMsg: 'Хочу понять, подойдет ли это для моего бизнеса',
          botMsg: 'Подберем решение под вашу задачу. Оставьте контакт — пришлем персональное демо 👇',
          replies: ['Сколько стоит?', 'Есть интеграции?', 'Заказать звонок'],
        },
      },
      UC_PRODUCTS: [
        { name: 'Aero Run 2', tag: 'Хит', price: '2 800 грн', old: '3 400 грн', swatch: 'linear-gradient(135deg,#6366F1,#8B5CF6)' },
        { name: 'Swift Trail', tag: '-20%', price: '3 000 грн', old: '3 700 грн', swatch: 'linear-gradient(135deg,#10B981,#34D399)' },
      ],
      UC_DELIVERY: 'Да, конечно! Мы отправляем Новой Почтой — как в отделение, так и курьером до двери. Срок доставки обычно 1–3 дня, оплата по тарифу перевозчика. Доступен наложенный платеж — можно оплатить при получении.',
      pg_replies_float: ['Тарифы', 'Демо'],
      pg_fw_status2: 'развернутая консультация',
      pg_fw_name_consultant: 'Консультант',
      pg_fw_name_assistant: 'Ваш ассистент',
      pg_bubble_consultant: 'Здравствуйте! Расскажите о задаче — подберу решение и оформим заявку.',
      pg_bubble_user: 'Нужна интеграция с CRM',
      pg_bubble_assistant: 'Привет! Чем могу помочь сегодня?',
      pg_iw_name_inline: 'Встроенный ассистент',
      pg_bubble_inline: 'Готов ответить на вопросы прямо в статье — спросите что угодно.',
      pg_chips_inline: ['Тарифы', 'Демо'],
    }
  };

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
    const list = DATA[lang].TEMPLATES;
    templateList.innerHTML = list.map((t) => `
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
    const list = DATA[lang].TEMPLATES;
    const t = list.find((x) => x.id === activeTemplateId);
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
    const chipsLabels = lang === 'uk' ? ['Дізнатись ціни', 'Замовити демо'] : ['Узнать цены', 'Заказать демо'];
    brandPreviewChips.innerHTML = chipsLabels.map((label) =>
      `<span style="font-size:12px; padding:7px 11px; border-radius:999px; border:1px solid ${brand.color}; color:${brand.color};">${label}</span>`
    ).join('');
  }

  const copyBtn = document.getElementById('copyCodeBtn');
  const copyLabel = document.getElementById('copyCodeLabel');
  if (copyBtn && copyLabel) {
    copyBtn.addEventListener('click', () => {
      const tag = 'scr' + 'ipt';
      const code = `<${tag} src="https://cdn.emble.ai/embed.js" data-agent="agent-x9f2c" async></${tag}>`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).catch(() => {});
      }
      copyBtn.classList.add('copied');
      copyLabel.textContent = TRANSLATIONS[lang].copied;
      clearTimeout(copyBtn._t);
      copyBtn._t = setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyLabel.textContent = TRANSLATIONS[lang].copy_code;
      }, 1800);
    });
  }

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
    const l = DATA[lang];
    pgSeg(pgForm, [['floating', 'Floating Chat'], ['panel', 'Side Panel'], ['inline', 'Inline Block']], 'form');
    pgSeg(pgPos, [['left', lang === 'uk' ? 'Ліворуч' : 'Слева'], ['right', lang === 'uk' ? 'Праворуч' : 'Справа']], 'pos');
    pgSeg(pgTheme, [['dark', lang === 'uk' ? 'Темна' : 'Тёмная'], ['light', lang === 'uk' ? 'Світла' : 'Светлая']], 'theme');
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
        <div class="pg-iw-head" style="background:${acc};"><span class="pg-iw-av">AI</span><span class="pg-iw-name">${l.pg_iw_name_inline}</span></div>
        <div class="pg-iw-body">
          <div class="pg-bubble" style="background:${light ? '#EEF0F5' : 'rgba(255,255,255,0.06)'}; color:${light ? '#3A3F4C' : '#D8DBE3'};">${l.pg_bubble_inline}</div>
          <div class="pg-chips">${l.pg_chips_inline.map(chip => `<span class="pg-chip" style="border-color:${acc}; color:${acc};">${chip}</span>`).join('')}</div>
        </div>
      </div>`;
    } else {
      html += `<div class="pg-cards"><div class="pg-card" style="background:${blockCard};"></div><div class="pg-card" style="background:${blockCard};"></div></div>`;
    }

    if (isFloating && pg.open) {
      html += `<div class="pg-float-window" style="${side}:26px; box-shadow:0 30px 60px rgba(0,0,0,0.5), 0 0 40px ${glow};">
        <div class="pg-fw-head" style="background:${acc};"><span class="pg-iw-av">AI</span><span class="pg-fw-meta"><span class="pg-fw-name">${l.pg_fw_name_assistant}</span><span class="pg-fw-status"><span class="pg-online"></span> ${TRANSLATIONS[lang].w_status}</span></span></div>
        <div class="pg-fw-body">
          <div class="pg-bubble" style="background:rgba(255,255,255,0.06); color:#D8DBE3;">${l.pg_bubble_assistant}</div>
          <div class="pg-chips">${l.pg_replies_float.map(chip => `<span class="pg-chip" style="border-color:${acc}; color:${acc};">${chip}</span>`).join('')}</div>
          <div class="pg-input-row"><span class="pg-input">${lang === 'uk' ? 'Повідомлення…' : 'Сообщение…'}</span><span class="pg-send" style="background:${acc};">${SEND_SVG}</span></div>
        </div>
      </div>`;
    }
    if (isFloating) {
      html += `<div class="pg-launcher" style="${side}:26px; background:${acc}; box-shadow:0 12px 30px ${glow};">${CHAT_SVG}</div>`;
    }
    if (isPanel) {
      const borderSide = pg.pos === 'left' ? 'right' : 'left';
      html += `<div class="pg-panel" style="${side}:0; border-${borderSide}:1px solid rgba(255,255,255,0.1); box-shadow:0 0 60px ${glow};">
        <div class="pg-panel-head" style="background:${acc};"><span class="pg-iw-av">AI</span><span class="pg-fw-meta"><span class="pg-fw-name">${l.pg_fw_name_consultant}</span><span class="pg-fw-status2">${l.pg_fw_status2}</span></span></div>
        <div class="pg-panel-body">
          <div class="pg-bubble" style="background:rgba(255,255,255,0.06); color:#D8DBE3; margin-bottom:12px;">${l.pg_bubble_consultant}</div>
          <div class="pg-bubble-user" style="background:${acc};">${l.pg_bubble_user}</div>
        </div>
        <div class="pg-panel-foot"><span class="pg-input">${lang === 'uk' ? 'Повідомлення…' : 'Сообщение…'}</span><span class="pg-send" style="background:${acc};">${SEND_SVG}</span></div>
      </div>`;
    }
    pgPage.innerHTML = html;
  }
  if (pgPage) {
    pgToggle.addEventListener('click', () => { pg.open = !pg.open; renderPlayground(); });
  }

  // ---------- Сценарии в действии ----------
  const ARROW_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M17 7H9M17 7v8" stroke="#6366F1" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CHECK_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#6366F1" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  let ucActive = 'products';
  const ucTabs = document.getElementById('ucTabs');
  const ucNarrative = document.getElementById('ucNarrative');
  const ucChat = document.getElementById('ucChat');

  function renderUseCases() {
    const order = ['products', 'delivery', 'leads'];
    ucTabs.innerHTML = order.map((id) =>
      `<button type="button" class="uc-tab${id === ucActive ? ' active' : ''}" data-id="${id}">${DATA[lang].SCENARIOS[id].label}</button>`
    ).join('');
    ucTabs.querySelectorAll('.uc-tab').forEach((b) =>
      b.addEventListener('click', () => { ucActive = b.dataset.id; renderUseCases(); }));

    const s = DATA[lang].SCENARIOS[ucActive];
    ucNarrative.innerHTML =
      `<div class="uc-emoji">${s.emoji}</div>` +
      `<h3>${s.title}</h3>` +
      `<p>${s.desc}</p>` +
      `<div class="uc-points">${s.points.map((p) =>
        `<div class="uc-point"><span class="uc-check">${CHECK_SVG}</span><span>${p}</span></div>`).join('')}</div>`;

    let scenarioBlock = '';
    if (ucActive === 'products') {
      scenarioBlock = `<div class="uc-products">${DATA[lang].UC_PRODUCTS.map((pr) =>
        `<div class="uc-prod">
          <div class="uc-prod-img" style="background:${pr.swatch};"><span class="uc-prod-tag">${pr.tag}</span></div>
          <div class="uc-prod-body">
            <div class="uc-prod-name">${pr.name}</div>
            <div class="uc-prod-price"><b>${pr.price}</b><s>${pr.old}</s></div>
            <a href="#" class="uc-prod-link">${lang === 'uk' ? 'Перейти до товару' : 'Перейти к товару'} ${ARROW_SVG}</a>
          </div>
        </div>`).join('')}</div>`;
    } else if (ucActive === 'delivery') {
      scenarioBlock = `<div class="uc-msg-bot" style="max-width:88%; border-radius:14px;">${DATA[lang].UC_DELIVERY}</div>`;
    } else {
      scenarioBlock = `<div class="uc-lead">
        <div class="uc-lead-title">${lang === 'uk' ? 'Залиште контакт — підготуємо демо' : 'Оставьте контакт — подготовим демо'}</div>
        <div class="uc-lead-fields">
          <span class="uc-lead-input">${lang === 'uk' ? 'Ваше ім\'я' : 'Ваше имя'}</span>
          <span class="uc-lead-input">${lang === 'uk' ? 'Email або телефон' : 'Email или телефон'}</span>
          <span class="uc-lead-btn">${lang === 'uk' ? 'Отримати демо' : 'Получить демо'}</span>
        </div>
      </div>`;
    }

    ucChat.innerHTML =
      `<div class="uc-chat-head">
        <span class="uc-chat-av">AI</span>
        <span style="flex:1;"><span class="uc-chat-name">${s.botName}</span><span class="uc-chat-typing"><span class="pg-online"></span> ${lang === 'uk' ? 'друкує…' : 'печатает…'}</span></span>
      </div>
      <div class="uc-chat-body">
        <div class="uc-msg-user">${s.userMsg}</div>
        <div class="uc-msg-bot">${s.botMsg}</div>
        ${scenarioBlock}
        <div class="uc-chips">${s.replies.map((r) => `<span class="uc-chip">${r}</span>`).join('')}</div>
      </div>`;
  }

  // --- Языковой переключатель ---
  const btnUa = document.getElementById('btnLangUa');
  const btnRu = document.getElementById('btnLangRu');

  function updateSwitcherStyles() {
    if (!btnUa || !btnRu) return;
    if (lang === 'uk') {
      btnUa.style.color = '#818CF8';
      btnRu.style.color = '#6B7280';
    } else {
      btnUa.style.color = '#6B7280';
      btnRu.style.color = '#818CF8';
    }
  }

  function applyLanguage() {
    document.documentElement.lang = lang === 'uk' ? 'uk' : 'ru';
    
    // Переводим все статические элементы с data-i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
        if (el.tagName === 'TITLE') {
          document.title = TRANSLATIONS[lang][key];
        } else {
          el.innerHTML = TRANSLATIONS[lang][key];
        }
      }
    });

    // Обновляем копирайты и кнопки
    if (copyLabel) copyLabel.textContent = TRANSLATIONS[lang].copy_code;

    // Перерисовываем динамические блоки
    renderTemplateList();
    renderWidgetPreview();
    renderColorRow();
    renderBrandPreview();
    if (pgPage) renderPlayground();
    if (ucTabs) renderUseCases();
    updateSwitcherStyles();
  }

  if (btnUa && btnRu) {
    btnUa.addEventListener('click', () => {
      lang = 'uk';
      try { localStorage.setItem('emble.lang', 'uk'); } catch (e) {}
      applyLanguage();
    });
    btnRu.addEventListener('click', () => {
      lang = 'ru';
      try { localStorage.setItem('emble.lang', 'ru'); } catch (e) {}
      applyLanguage();
    });
  }

  // Инициализация
  applyLanguage();
})();

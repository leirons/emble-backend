/**
 * Emble Widget — встраиваемый скрипт ИИ-агента.
 * Использование: <script src="https://cdn.emble.ai/embed.js" data-agent="agent-x9f2c" async></script>
 * Необязательно: data-api="https://api.emble.ai" — если API отдаётся не с того же домена, что embed.js.
 */
(function () {
  'use strict';

  var scriptTag = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var AGENT_SLUG = scriptTag.getAttribute('data-agent');
  if (!AGENT_SLUG) {
    console.error('[Emble] Не задан data-agent на теге <script>');
    return;
  }

  var API_BASE = scriptTag.getAttribute('data-api') || (function () {
    // scriptTag.src может быть пустым/относительным при динамической инъекции —
    // new URL() тогда бросает исключение. Падаем на origin страницы-хоста.
    try {
      return new URL(scriptTag.src, document.baseURI).origin;
    } catch (e) {
      return window.location.origin;
    }
  })();
  var VISITOR_KEY = 'emble_visitor_' + AGENT_SLUG;
  var STATE = {
    conversationId: null,
    branding: null,
    agent: null,
    settings: null,
    hasStartFlow: false,
    open: false,
    sending: false,
    emailFormShown: false,
    greeting: '',
  };

  // ---------- helpers ----------

  function getVisitorId() {
    try {
      var id = localStorage.getItem(VISITOR_KEY);
      if (!id) {
        id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(VISITOR_KEY, id);
      }
      return id;
    } catch (e) {
      // localStorage может быть недоступен (приватный режим) — генерируем на лету
      return 'v_' + Math.random().toString(36).slice(2);
    }
  }

  function api(path, opts) {
    return fetch(API_BASE + '/widget/' + AGENT_SLUG + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  }

  // Отправка аналитического события (не блокирует UI). sendBeacon переживает уход со страницы.
  function track(type, payload) {
    try {
      var body = JSON.stringify({ type: type, sessionId: getVisitorId(), conversationId: STATE.conversationId || undefined, payload: payload || {} });
      var url = API_BASE + '/widget/' + AGENT_SLUG + '/events';
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
      }
    } catch (e) {
      /* аналитика не должна ломать виджет */
    }
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'style') node.setAttribute('style', attrs[k]);
        else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (typeof c === 'string') node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    });
    return node;
  }

  // Простой построчный парсер SSE поверх fetch (EventSource не умеет POST с телом).
  async function streamSSE(response, onEvent) {
    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      // Нормализуем CRLF/CR в LF, чтобы граница фрейма (\n\n) ловилась независимо от переносов сервера.
      buffer += decoder.decode(chunk.value, { stream: true }).replace(/\r\n?/g, '\n');
      var parts = buffer.split('\n\n');
      buffer = parts.pop();
      parts.forEach(function (part) {
        var eventType = 'message';
        var dataLines = [];
        part.split('\n').forEach(function (line) {
          if (line.indexOf('event:') === 0) eventType = line.slice(6).trim();
          // По спецификации SSE несколько строк data: конкатенируются через \n.
          else if (line.indexOf('data:') === 0) dataLines.push(line.slice(5).trim());
        });
        if (dataLines.length) {
          try {
            onEvent(eventType, JSON.parse(dataLines.join('\n')));
          } catch (e) {
            /* игнорируем некорректный фрейм */
          }
        }
      });
    }
  }

  // ---------- UI ----------

  var root = el('div', { id: 'emble-widget-root' });
  var shadow = root.attachShadow ? root.attachShadow({ mode: 'open' }) : root;

  function css(brand) {
    return (
      ':host, .emble-root { all: initial; }' +
      '.emble-launcher { position: fixed; ' + posCss() + ' width: 56px; height: 56px; border-radius: 50%; ' +
      'background:' + brand + '; box-shadow: 0 12px 28px rgba(0,0,0,.35); cursor: pointer; display:flex; ' +
      'align-items:center; justify-content:center; z-index: 2147483000; transition: transform .15s ease; }' +
      '.emble-launcher:hover { transform: scale(1.06); }' +
      '.emble-panel { position: fixed; ' + panelPosCss() + ' width: 340px; max-width: calc(100vw - 32px); ' +
      'height: 480px; max-height: calc(100vh - 120px); border-radius: 16px; overflow: hidden; ' +
      'background: #11151F; box-shadow: 0 24px 60px rgba(0,0,0,.5); display: none; flex-direction: column; ' +
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif; z-index: 2147483000; }' +
      '.emble-panel.open { display: flex; }' +
      '.emble-header { padding: 14px 16px; display:flex; align-items:center; gap:10px; background:' + brand + '; }' +
      '.emble-header .name { color:#fff; font-weight:600; font-size:14px; }' +
      '.emble-header .status { color:rgba(255,255,255,.85); font-size:11.5px; display:flex; align-items:center; gap:4px; }' +
      '.emble-status-dot { display:inline-block; width:7px; height:7px; border-radius:50%; background:#10B981; animation: emble-pulse 2s ease-in-out infinite; flex-shrink:0; }' +
      '@keyframes emble-pulse { 0%,100%{ opacity:1; } 50%{ opacity:.35; } }' +
      '.emble-typing { display:flex; align-items:center; gap:4px; padding:12px 14px; }' +
      '.emble-typing-dot { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,.35); animation: emble-bounce 1.4s ease-in-out infinite; }' +
      '.emble-typing-dot:nth-child(2){ animation-delay:.2s; }' +
      '.emble-typing-dot:nth-child(3){ animation-delay:.4s; }' +
      '@keyframes emble-bounce { 0%,60%,100%{ transform:translateY(0); opacity:.35; } 30%{ transform:translateY(-6px); opacity:.9; } }' +
      '.emble-close { margin-left:auto; cursor:pointer; color:#fff; opacity:.85; font-size:18px; line-height:1; background:none; border:none; }' +
      '.emble-back { cursor:pointer; color:#fff; opacity:.9; font-size:24px; line-height:1; background:none; border:none; padding:0 6px 3px 0; }' +
      '.emble-home { flex:1; overflow-y:auto; padding:16px 14px; display:none; flex-direction:column; gap:10px; }' +
      '.emble-home.show { display:flex; }' +
      '.emble-home-greeting { font-size:13px; line-height:1.45; color:#D8DBE3; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.06); padding:10px 13px; border-radius:4px 14px 14px 14px; margin-bottom:4px; }' +
      '.emble-menu-card { display:flex; align-items:center; gap:12px; padding:14px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); cursor:pointer; transition:background .12s ease; }' +
      '.emble-menu-card:hover { background:rgba(255,255,255,.08); }' +
      '.emble-menu-ic { width:34px; height:34px; border-radius:10px; flex:0 0 auto; display:flex; align-items:center; justify-content:center; background:' + brand + '; }' +
      '.emble-menu-tx { flex:1; color:#E5E7EB; font-size:13.5px; font-weight:600; }' +
      '.emble-menu-chev { color:#5B6472; font-size:18px; }' +
      '.emble-info { flex:1; overflow-y:auto; padding:14px; display:none; flex-direction:column; }' +
      '.emble-info.show { display:flex; }' +
      '.emble-faq-item { margin-bottom:8px; }' +
      '.emble-faq-q { padding:11px 13px; border-radius:10px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); cursor:pointer; font-size:13px; color:#E5E7EB; display:flex; justify-content:space-between; gap:8px; }' +
      '.emble-faq-a { padding:10px 13px 2px; font-size:12.5px; line-height:1.5; color:#9CA3AF; white-space:pre-wrap; display:none; }' +
      '.emble-faq-item.open .emble-faq-a { display:block; }' +
      '.emble-contacts { font-size:13px; line-height:1.65; color:#D8DBE3; white-space:pre-wrap; }' +
      '.emble-cwrap { display:flex; flex-direction:column; }' +
      '.emble-cc { display:flex; align-items:center; gap:12px; padding:12px 13px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.06); border-radius:12px; margin-bottom:9px; }' +
      '.emble-cc-ic { display:flex; align-items:center; justify-content:center; width:37px; height:37px; border-radius:10px; flex-shrink:0; }' +
      '.emble-cc-label { display:block; color:rgba(255,255,255,.45); font-size:11px; }' +
      '.emble-cc-value { display:block; color:#fff; font-size:14px; font-weight:600; margin-top:2px; word-break:break-word; }' +
      '.emble-sec-head { display:flex; align-items:center; justify-content:space-between; margin:18px 0 10px; }' +
      '.emble-sec-title { color:rgba(255,255,255,.5); font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; }' +
      '.emble-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:600; }' +
      '.emble-badge.open { background:rgba(74,222,128,.14); color:#4ade80; }' +
      '.emble-badge.closed { background:rgba(255,255,255,.06); color:rgba(255,255,255,.5); }' +
      '.emble-badge-dot { width:6px; height:6px; border-radius:50%; background:currentColor; }' +
      '.emble-sched { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.06); border-radius:12px; padding:4px 14px; }' +
      '.emble-sched-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,.05); }' +
      '.emble-sched-row.last { border-bottom:none; }' +
      '.emble-sched-day { font-size:13px; color:rgba(255,255,255,.7); }' +
      '.emble-sched-hours { font-size:13px; color:rgba(255,255,255,.7); }' +
      '.emble-social-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }' +
      '.emble-social { display:flex; align-items:center; justify-content:center; height:46px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.06); transition:background .12s ease; }' +
      '.emble-social:hover { background:rgba(255,255,255,.08); }' +
      '.emble-body { flex:1; overflow-y:auto; padding:14px 14px 8px; display:flex; flex-direction:column; gap:10px; }' +
      // ACM-20: убираем «ползунок» (нативный скроллбар) внутри виджета — скролл остаётся рабочим
      // (колёсико/тач/перетаскивание), но чанковый OS-слайдер больше не появляется при открытии.
      '.emble-home, .emble-info, .emble-body { scrollbar-width: none; -ms-overflow-style: none; }' +
      '.emble-home::-webkit-scrollbar, .emble-info::-webkit-scrollbar, .emble-body::-webkit-scrollbar { width:0; height:0; }' +
      '.emble-msg { max-width:82%; padding:9px 12px; border-radius:4px 14px 14px 14px; font-size:13px; ' +
      'line-height:1.45; color:#D8DBE3; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.06); align-self:flex-start; white-space:pre-wrap; }' +
      '.emble-msg.user { align-self:flex-end; background:' + brand + '; color:#fff; border-color:transparent; border-radius:14px 4px 14px 14px; }' +
      '.emble-quick { display:flex; flex-wrap:wrap; gap:7px; padding: 0 14px 10px; }' +
      '.emble-chip { font-size:12px; padding:7px 11px; border-radius:999px; border:1px solid ' + brand + '; ' +
      'color:' + brand + '; background: transparent; cursor:pointer; }' +
      '.emble-footer { display:flex; align-items:center; gap:8px; padding:12px 14px; border-top:1px solid rgba(255,255,255,.08); }' +
      '.emble-input { flex:1; height:38px; border-radius:10px; background:rgba(255,255,255,.04); ' +
      'border:1px solid rgba(255,255,255,.12); color:#E5E7EB; padding:0 12px; font-size:13px; outline:none; }' +
      '.emble-send { width:38px; height:38px; border-radius:10px; background:' + brand + '; border:none; ' +
      'cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }' +
      '.emble-powered { text-align:center; font-size:10.5px; color:#5B6472; padding:4px 0 8px; }' +
      '.emble-fb-row { display:flex; gap:6px; margin-top:4px; }' +
      '.emble-fb { cursor:pointer; font-size:12px; opacity:.55; background:none; border:none; padding:2px; }' +
      '.emble-fb:hover { opacity:.85; }' +
      '.emble-fb.active { opacity:1; }' +
      '.emble-email-link { cursor:pointer; color:#8B93A7; font-size:15px; padding:0 4px; flex:0 0 auto; background:none; border:none; }' +
      '.emble-email-form { border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.03); ' +
      'border-radius:12px; padding:12px; margin-top:6px; }' +
      '.emble-proactive { position:fixed; ' + panelPosCss() + ' max-width:220px; background:#11151F; ' +
      'border:1px solid rgba(255,255,255,.14); border-radius:14px; padding:12px 14px; font-size:13px; ' +
      'line-height:1.4; color:#E5E7EB; box-shadow:0 16px 40px rgba(0,0,0,.45); cursor:pointer; z-index:2147483000; }'
    );
  }

  function posCss() {
    var pos = (STATE.branding && STATE.branding.position) || 'bottom-right';
    return pos === 'bottom-left' ? 'left:20px; bottom:20px;' : 'right:20px; bottom:20px;';
  }
  function panelPosCss() {
    var pos = (STATE.branding && STATE.branding.position) || 'bottom-right';
    return pos === 'bottom-left' ? 'left:20px; bottom:88px;' : 'right:20px; bottom:88px;';
  }

  var styleEl = el('style', {}, []);
  var launcher = el('div', { class: 'emble-launcher', onClick: function () {
    if (!STATE.open) track('trigger_fired', { triggerId: 'manual_click' });
    togglePanel();
  } }, []);
  launcher.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H9l-5 4V5z" fill="#fff"/></svg>';

  var messagesEl = el('div', { class: 'emble-body' });
  var quickEl = el('div', { class: 'emble-quick' });
  var inputEl = el('input', { class: 'emble-input', placeholder: 'Напишите сообщение…' });
  var sendBtn = el('button', { class: 'emble-send', onClick: onSend });
  sendBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 8 6 8-16-8z" fill="#fff"/></svg>';
  // Ручной ввод email посетителем → source='manual' (отличается от авто-фолбэка бота 'email_fallback').
  var emailLinkBtn = el('button', { class: 'emble-email-link', title: 'Оставить email', onClick: function () { showEmailForm({ source: 'manual' }); } }, ['✉']);

  var nameEl = el('span', { class: 'name' }, ['Ассистент']);
  var statusDot = el('span', { class: 'emble-status-dot' });
  var statusEl = el('span', { class: 'status' }, [statusDot, 'онлайн']);
  var headerText = el('span', { style: 'flex:1;' }, [nameEl, document.createElement('br'), statusEl]);
  var backBtn = el('button', { class: 'emble-back', onClick: showHome, title: 'Назад в меню' }, ['‹']);
  backBtn.style.display = 'none';
  var header = el('div', { class: 'emble-header' }, [backBtn, headerText, el('button', { class: 'emble-close', onClick: togglePanel }, ['✕'])]);

  var homeEl = el('div', { class: 'emble-home' });
  var infoEl = el('div', { class: 'emble-info' });
  var footerEl = el('div', { class: 'emble-footer' }, [inputEl, sendBtn, emailLinkBtn]);

  var panel = el('div', { class: 'emble-panel' }, [
    header,
    homeEl,
    messagesEl,
    infoEl,
    quickEl,
    footerEl,
    el('div', { class: 'emble-powered' }, ['Работает на Emble']),
  ]);

  var MENU_ICONS = {
    chat: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H9l-5 4V5z" fill="#fff"/></svg>',
    faq: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9.5 9a2.5 2.5 0 115 0c0 1.7-2.5 2-2.5 4M12 17.5h.01" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
    contacts: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 13a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };

  // ---------- Экраны стартового меню ----------
  function hasStartMenu() {
    return STATE.startMenu && STATE.startMenu.enabled && (STATE.startMenu.items || []).length > 0;
  }

  function setView(view) {
    STATE.view = view;
    var onHome = view === 'home';
    homeEl.classList.toggle('show', onHome);
    infoEl.classList.toggle('show', view === 'faq' || view === 'contacts');
    messagesEl.style.display = view === 'chat' ? 'flex' : 'none';
    quickEl.style.display = view === 'chat' ? 'flex' : 'none';
    footerEl.style.display = view === 'chat' ? 'flex' : 'none';
    // Кнопка «назад» — только когда есть меню и мы не на домашнем экране.
    backBtn.style.display = hasStartMenu() && !onHome ? 'block' : 'none';
  }

  function showHome() {
    if (!hasStartMenu()) return;
    homeEl.innerHTML = '';
    if (STATE.greeting) {
      homeEl.appendChild(el('div', { class: 'emble-home-greeting' }, [STATE.greeting]));
    }
    (STATE.startMenu.items || []).forEach(function (item) {
      var card = el('div', { class: 'emble-menu-card', onClick: function () { openMenuItem(item); } }, []);
      var ic = el('span', { class: 'emble-menu-ic' });
      ic.innerHTML = MENU_ICONS[item.type] || MENU_ICONS.chat;
      card.appendChild(ic);
      card.appendChild(el('span', { class: 'emble-menu-tx' }, [item.title || '']));
      card.appendChild(el('span', { class: 'emble-menu-chev' }, ['›']));
      homeEl.appendChild(card);
    });
    setView('home');
  }

  function openMenuItem(item) {
    if (item.type === 'faq') showFaqView();
    else if (item.type === 'contacts') showContactsView(item);
    else showChatView();
  }

  function showChatView() {
    setView('chat');
    // Первый вход в чат — показать приветствие, быстрые ответы и стартовый сценарий.
    if (!STATE.chatInited) {
      STATE.chatInited = true;
      if (STATE.greeting) appendMessage('assistant', STATE.greeting);
      renderQuickReplies(STATE.branding && STATE.branding.quickReplies);
      if (!STATE.conversationId) {
        // Сеть может быть недоступна — глотаем ошибку, чтобы не было unhandledrejection на странице хоста.
        initConversation().then(function () { if (STATE.hasStartFlow) advanceFlow(null); }).catch(function () {});
      }
    }
  }

  function showFaqView() {
    setView('faq');
    infoEl.innerHTML = '';
    var faq = STATE.faq || [];
    if (faq.length === 0) {
      infoEl.appendChild(el('div', { class: 'emble-contacts' }, ['Пока нет частых вопросов.']));
      return;
    }
    faq.forEach(function (qa) {
      var item = el('div', { class: 'emble-faq-item' }, []);
      var q = el('div', { class: 'emble-faq-q' }, [qa.question, el('span', { class: 'emble-menu-chev' }, ['▾'])]);
      var a = el('div', { class: 'emble-faq-a' }, [qa.answer]);
      q.addEventListener('click', function () { item.classList.toggle('open'); });
      item.appendChild(q);
      item.appendChild(a);
      infoEl.appendChild(item);
    });
  }

  // --- Иконки для экрана контактов ---
  var CONTACT_ICONS = {
    phone: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1l-2.1 2.2z" fill="currentColor"/></svg>',
    email: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="2"/><path d="M4 7l8 6 8-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    address: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="2"/></svg>',
  };
  var SOCIAL_META = {
    telegram: { color: '#4aa3e0', label: 'Telegram', icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M21 4 3 11l5 2 2 6 3-3 4 3 4-15z" fill="currentColor"/></svg>' },
    whatsapp: { color: '#4ade80', label: 'WhatsApp', icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.5 8.5c0 3 2.5 5.5 5.5 5.5.6 0 1-.5 1-1s-.6-1-1.1-1-.9.6-1.3.4C11 11.7 10.3 11 10 10c-.2-.5.5-.8.5-1.3S9.9 7.5 9.5 7.5s-1 .4-1 1z" fill="currentColor"/></svg>' },
    viber: { color: '#7360f2', label: 'Viber', icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 3c4 0 7 2.7 7 7 0 4.3-3 7-7 7-.7 0-1.4-.1-2-.3L6 18l1-3.2A6.8 6.8 0 0 1 5 10c0-4.3 3-7 7-7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 9c.2 2 1.5 3.3 3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' },
    instagram: { color: '#E1306C', label: 'Instagram', icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="2"/><circle cx="16.5" cy="7.5" r="1.2" fill="currentColor"/></svg>' },
  };
  var SOCIAL_ORDER = ['telegram', 'whatsapp', 'viber', 'instagram'];

  function timeToMinutes(t) {
    var m = /^(\d{1,2}):(\d{2})$/.exec((t || '').trim());
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  function isOpenNow(schedule) {
    if (!schedule || !schedule.length) return null;
    var now = new Date();
    var todayIdx = (now.getDay() + 6) % 7; // 0=Пн … 6=Вс
    var day = schedule[todayIdx];
    if (!day || day.enabled === false) return false;
    var from = timeToMinutes(day.from);
    var to = timeToMinutes(day.to);
    if (from == null || to == null) return null;
    var cur = now.getHours() * 60 + now.getMinutes();
    return cur >= from && cur < to;
  }

  function contactCard(brand, iconKey, label, value, href) {
    var tag = href ? 'a' : 'div';
    var attrs = { class: 'emble-cc' };
    if (href) { attrs.href = href; attrs.style = 'text-decoration:none;'; }
    var card = el(tag, attrs, []);
    var ic = el('span', { class: 'emble-cc-ic' });
    ic.style.color = brand;
    ic.style.background = 'color-mix(in srgb, ' + brand + ' 16%, transparent)';
    ic.innerHTML = CONTACT_ICONS[iconKey];
    var txt = el('span', { style: 'flex:1; min-width:0;' }, [
      el('span', { class: 'emble-cc-label' }, [label]),
      el('span', { class: 'emble-cc-value' }, [value]),
    ]);
    card.appendChild(ic);
    card.appendChild(txt);
    return card;
  }

  function showContactsView(item) {
    setView('contacts');
    infoEl.innerHTML = '';
    var brand = (STATE.branding && STATE.branding.brandColor) || '#c9105f';
    var c = item.contacts || {};

    // Легаси: если структурированных данных нет, но есть текст — показываем его.
    if (!c.phone && !c.email && !c.address && !(c.schedule && c.schedule.length) && !c.socials && item.content) {
      infoEl.appendChild(el('div', { class: 'emble-contacts' }, [item.content]));
      return;
    }

    var wrap = el('div', { class: 'emble-cwrap' });

    // --- Контактные карточки ---
    if (c.phone) wrap.appendChild(contactCard(brand, 'phone', 'Телефон', c.phone, 'tel:' + c.phone.replace(/[^\d+]/g, '')));
    if (c.email) wrap.appendChild(contactCard(brand, 'email', 'Почта', c.email, 'mailto:' + c.email));
    if (c.address) wrap.appendChild(contactCard(brand, 'address', 'Адрес', c.address, 'https://maps.google.com/?q=' + encodeURIComponent(c.address)));

    // --- График работы ---
    if (c.schedule && c.schedule.length) {
      var open = isOpenNow(c.schedule);
      var todayIdx = (new Date().getDay() + 6) % 7;
      var head = el('div', { class: 'emble-sec-head' }, []);
      head.appendChild(el('span', { class: 'emble-sec-title' }, ['График работы']));
      if (open !== null) {
        var badge = el('span', { class: 'emble-badge ' + (open ? 'open' : 'closed') }, []);
        badge.appendChild(el('span', { class: 'emble-badge-dot' }));
        badge.appendChild(document.createTextNode(open ? 'Открыто' : 'Закрыто'));
        head.appendChild(badge);
      }
      wrap.appendChild(head);

      var table = el('div', { class: 'emble-sched' });
      c.schedule.forEach(function (d, i) {
        var active = i === todayIdx;
        var off = d.enabled === false;
        var hours = off ? 'Выходной' : ((d.from || '') + (d.from && d.to ? '–' : '') + (d.to || ''));
        var row = el('div', { class: 'emble-sched-row' + (i === c.schedule.length - 1 ? ' last' : '') }, []);
        var name = el('span', { class: 'emble-sched-day' }, [d.label || '']);
        var val = el('span', { class: 'emble-sched-hours' }, [hours || '—']);
        if (active) { name.style.fontWeight = '700'; name.style.color = '#fff'; }
        if (off) val.style.color = 'rgba(255,255,255,.35)';
        else if (active) { val.style.color = brand; val.style.fontWeight = '700'; }
        row.appendChild(name);
        row.appendChild(val);
        table.appendChild(row);
      });
      wrap.appendChild(table);
    }

    // --- Соцсети (только заполненные) ---
    var socials = c.socials || {};
    var filled = SOCIAL_ORDER.filter(function (k) { return socials[k]; });
    if (filled.length) {
      wrap.appendChild(el('div', { class: 'emble-sec-title', style: 'margin:18px 0 10px;' }, ['Мы в соцсетях']));
      var grid = el('div', { class: 'emble-social-grid' });
      filled.forEach(function (k) {
        var meta = SOCIAL_META[k];
        var a = el('a', { class: 'emble-social', href: socials[k], target: '_blank', title: meta.label, style: 'text-decoration:none;' }, []);
        a.style.color = meta.color;
        a.innerHTML = meta.icon;
        grid.appendChild(a);
      });
      wrap.appendChild(grid);
    }

    if (!wrap.children.length) {
      wrap.appendChild(el('div', { class: 'emble-contacts' }, ['Контактная информация не указана.']));
    }
    infoEl.appendChild(wrap);
  }

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') onSend();
  });

  function togglePanel() {
    STATE.open = !STATE.open;
    panel.classList.toggle('open', STATE.open);
    hideProactiveBadge();
    // «Диалог» = каждое открытие чата: трекаем КАЖДОЕ открытие панели.
    if (STATE.open) {
      track('widget_opened');
      // Пользователь взаимодействовал с виджетом → проактивное сообщение больше не показываем.
      STATE.interacted = true;
      if (STATE.proactiveTimer) { clearTimeout(STATE.proactiveTimer); STATE.proactiveTimer = null; }
    }
    if (STATE.open && !STATE.viewInited) {
      STATE.viewInited = true;
      // Стартовое меню включено → показываем домашний экран, иначе сразу чат.
      if (hasStartMenu()) showHome();
      else showChatView();
    }
  }

  function renderFlowButtons(buttons) {
    quickEl.innerHTML = '';
    (buttons || []).forEach(function (btn) {
      quickEl.appendChild(
        el('span', { class: 'emble-chip', onClick: function () {
          appendMessage('user', btn.label);
          advanceFlow(btn.nextStepId, btn.label);
        } }, [btn.label])
      );
    });
  }

  async function advanceFlow(stepId, userLabel) {
    try {
      var res = await api('/conversations/' + STATE.conversationId + '/flow/advance', {
        method: 'POST',
        body: JSON.stringify({ stepId: stepId || null }),
      });
      var data = await res.json();
      if (data.message) appendMessage('assistant', data.message);
      // Шаг сценария перевёл диалог на оператора → форма сбора email (если включена).
      if (data.escalate) {
        quickEl.innerHTML = '';
        handleEscalation();
        return;
      }
      if (data.handoffToAI) {
        quickEl.innerHTML = '';
        // Пришли к AI-шагу по кнопке → пусть ИИ сразу ответит на её тему.
        // (Сообщение кнопки уже показано, поэтому не дублируем его — skipEcho.)
        if (userLabel) {
          sendText(userLabel, { skipEcho: true });
        } else {
          renderQuickReplies(STATE.branding && STATE.branding.quickReplies);
        }
      } else {
        renderFlowButtons(data.buttons);
      }
    } catch (e) {
      /* сценарий недоступен — просто остаёмся в обычном чате */
    }
  }

  function appendFeedback(msgEl, messageId) {
    var upBtn = el('button', { class: 'emble-fb', onClick: function () { sendFeedback(messageId, 1, upBtn, downBtn); } }, ['👍']);
    var downBtn = el('button', { class: 'emble-fb', onClick: function () { sendFeedback(messageId, -1, upBtn, downBtn); } }, ['👎']);
    msgEl.appendChild(el('div', { class: 'emble-fb-row' }, [upBtn, downBtn]));
  }

  function sendFeedback(messageId, rating, upBtn, downBtn) {
    upBtn.classList.toggle('active', rating === 1);
    downBtn.classList.toggle('active', rating === -1);
    track('feedback_given', { rating: rating, messageId: messageId });
    api('/conversations/' + STATE.conversationId + '/messages/' + messageId + '/feedback', {
      method: 'POST',
      body: JSON.stringify({ rating: rating }),
    }).catch(function () {});
  }

  // Универсальная форма сбора email. opts: { source, prompt, success }.
  function showEmailForm(opts) {
    opts = opts || {};
    if (STATE.emailFormShown) return;
    STATE.emailFormShown = true;
    if (!STATE.open) togglePanel();
    if (STATE.view !== 'chat') showChatView();

    var source = opts.source || 'email_fallback';
    var successText = opts.success || 'Спасибо! Мы свяжемся с вами по email.';
    var promptText = opts.prompt != null ? opts.prompt : 'Оставьте email — мы напишем вам, если бот не сможет помочь.';

    var emailInput = el('input', { class: 'emble-input', type: 'email', placeholder: 'Ваш email' });
    var submit = function () { submitEmailFallback(emailInput.value, formEl, source, successText); };
    var confirmBtn = el('button', { class: 'emble-send', onClick: submit }, []);
    confirmBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 8 6 8-16-8z" fill="#fff"/></svg>';
    emailInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });

    var rows = [];
    if (promptText) rows.push(el('div', { style: 'font-size:12px; color:#9CA3AF; margin-bottom:8px;' }, [promptText]));
    rows.push(el('div', { style: 'display:flex; gap:8px;' }, [emailInput, confirmBtn]));
    var formEl = el('div', { class: 'emble-email-form' }, rows);
    messagesEl.appendChild(formEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    try { emailInput.focus(); } catch (e) {}
  }

  async function submitEmailFallback(email, formEl, source, successText) {
    if (!email || email.indexOf('@') === -1) return;
    try {
      await api('/leads', {
        method: 'POST',
        body: JSON.stringify({ email: email, conversationId: STATE.conversationId, capturedFields: { source: source || 'email_fallback' } }),
      });
      formEl.remove();
      appendMessage('assistant', successText || 'Спасибо! Мы свяжемся с вами по email.');
    } catch (e) {
      /* оставляем форму — пользователь может попробовать снова */
    }
  }

  // Эскалация на оператора: если включён сбор email — показываем сообщение и форму;
  // иначе диалог просто переходит на оператора (статус уже выставлен сервером).
  function handleEscalation() {
    var s = STATE.settings || {};
    if (!s.enableEmailOnEscalation) return;
    var msg = s.escalationEmailMessage ||
      'Менеджер ответит вам в ближайшее время. Пожалуйста, оставьте свой email, чтобы мы прислали ответ, если вы закроете сайт.';
    appendMessage('assistant', msg);
    showEmailForm({ source: 'escalation', prompt: '', success: 'Спасибо, контакт сохранён!' });
  }

  var proactiveEl = null;
  function showProactiveBadge(text, triggerId) {
    // Не показываем, если чат открыт, уже показан, нет текста ИЛИ виджет уже нажимали.
    if (STATE.open || STATE.interacted || proactiveEl || !text) return;
    track('trigger_fired', { triggerId: triggerId || 'timer_20m' });
    proactiveEl = el('div', { class: 'emble-proactive', onClick: function () { onProactiveClick(); } }, [text]);
    shadow.appendChild(proactiveEl);
    setTimeout(hideProactiveBadge, 12000);
  }
  function hideProactiveBadge() {
    if (proactiveEl) {
      proactiveEl.remove();
      proactiveEl = null;
    }
  }

  // Клик по проактивному пузырьку — это авто-триггер виджета (не действие пользователя в чате).
  // Открываем чат; если включён сбор email — сразу показываем форму с source='auto', чтобы
  // проактивно собранные лиды были отличимы в CRM от ручных ('manual') и эскалационных ('escalation').
  function onProactiveClick() {
    hideProactiveBadge();
    togglePanel();
    var s = STATE.settings || {};
    if (s.emailFallbackEnabled) {
      showEmailForm({
        source: 'auto',
        prompt: 'Оставьте email — мы напишем вам с ответом или спецпредложением.',
        success: 'Спасибо! Мы свяжемся с вами по email.',
      });
    }
  }

  function appendMessage(role, text) {
    var msg = el('div', { class: 'emble-msg' + (role === 'user' ? ' user' : '') }, [text]);
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return msg;
  }

  // Пузырёк «печатает…» — три анимированные точки, пока ждём/стримим ответ ассистента.
  function showTypingIndicator() {
    var bubble = el('div', { class: 'emble-msg emble-typing' }, [
      el('span', { class: 'emble-typing-dot' }),
      el('span', { class: 'emble-typing-dot' }),
      el('span', { class: 'emble-typing-dot' }),
    ]);
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function renderQuickReplies(replies) {
    quickEl.innerHTML = '';
    (replies || []).forEach(function (text) {
      quickEl.appendChild(
        el('span', { class: 'emble-chip', onClick: function () { sendText(text); } }, [text])
      );
    });
  }

  async function initConversation() {
    var visitorId = getVisitorId();
    var res = await api('/conversations', { method: 'POST', body: JSON.stringify({ visitorId: visitorId }) });
    var data = await res.json();
    STATE.conversationId = data.conversationId;
  }

  function onSend() {
    var text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    sendText(text);
  }

  async function sendText(text, opts) {
    opts = opts || {};
    if (STATE.sending) return;
    STATE.sending = true;
    if (!opts.skipEcho) appendMessage('user', text);
    quickEl.innerHTML = '';

    var typingEl = showTypingIndicator();
    var assistantEl = appendMessage('assistant', '');
    assistantEl.style.display = 'none';
    try {
      // Диалог создаём здесь (внутри try), чтобы сетевая ошибка на этом шаге тоже
      // показала сообщение об ошибке и сбросила STATE.sending, а не «подвесила» виджет.
      if (!STATE.conversationId) await initConversation();

      var res = await api('/conversations/' + STATE.conversationId + '/messages', {
        method: 'POST',
        body: JSON.stringify({ text: text }),
      });

      if (!res.ok || !res.body) {
        assistantEl.textContent = 'Не удалось получить ответ. Попробуйте позже.';
        return;
      }

      await streamSSE(res, function (event, data) {
        if (event === 'delta') {
          if (typingEl) { typingEl.remove(); typingEl = null; assistantEl.style.display = ''; }
          // Фрейм без text не должен дописывать литеральное "undefined".
          if (data && typeof data.text === 'string') assistantEl.textContent += data.text;
          messagesEl.scrollTop = messagesEl.scrollHeight;
        } else if (event === 'error') {
          assistantEl.textContent = data.message || 'Произошла ошибка.';
        } else if (event === 'escalated') {
          handleEscalation();
        } else if (event === 'done') {
          if (data.messageId) appendFeedback(assistantEl, data.messageId);
        }
      });
    } catch (e) {
      assistantEl.textContent = 'Не удалось получить ответ. Проверьте соединение.';
    } finally {
      if (typingEl) { typingEl.remove(); typingEl = null; }
      // Показываем пузырёк, если в нём есть текст (ответ ИЛИ сообщение об ошибке);
      // пустой пузырёк (ничего не пришло) убираем, чтобы не мигать пустотой.
      if (assistantEl.textContent) assistantEl.style.display = '';
      else assistantEl.remove();
      STATE.sending = false;
    }
  }

  // Выбор приветствия для новых/вернувшихся посетителей (решение целиком на стороне браузера).
  // Читаем флаг ДО записи, чтобы в рамках первого визита показать «новое» приветствие.
  function computeGreeting() {
    var s = STATE.settings || {};
    var base = (STATE.branding && STATE.branding.greeting) || '';
    if (!s.enableReturningGreeting) return base;
    var visited = false;
    try { visited = localStorage.getItem('emble_visited') === 'true'; } catch (e) {}
    if (visited) return s.greetingReturning || s.greetingNew || base;
    try { localStorage.setItem('emble_visited', 'true'); } catch (e) {}
    return s.greetingNew || base;
  }

  async function boot() {
    try {
      var res = await api('/config');
      var data = await res.json();
      STATE.agent = data.agent;
      STATE.branding = data.branding;
      STATE.settings = data.settings || {};
      STATE.hasStartFlow = !!data.hasStartFlow;
      STATE.startMenu = data.startMenu || { enabled: false, items: [] };
      STATE.faq = data.faq || [];
    } catch (e) {
      STATE.branding = {};
      STATE.settings = {};
      STATE.startMenu = { enabled: false, items: [] };
      STATE.faq = [];
      console.error('[Emble] Не удалось загрузить конфигурацию виджета', e);
    }

    var brand = (STATE.branding && STATE.branding.brandColor) || '#6366F1';
    styleEl.textContent = css(brand);
    nameEl.textContent = (STATE.agent && STATE.agent.name) || 'Ассистент';

    // Приветствие выбираем один раз при загрузке (и здесь же помечаем визит в localStorage).
    STATE.greeting = computeGreeting();

    if (!STATE.settings.emailFallbackEnabled) emailLinkBtn.style.display = 'none';

    // Приветствие и быстрые ответы показываются при входе в чат (showChatView) —
    // чтобы не мелькать под домашним экраном стартового меню.

    shadow.appendChild(styleEl);
    shadow.appendChild(launcher);
    shadow.appendChild(panel);
    document.body.appendChild(root);

    track('widget_loaded'); // виджет отрисован на странице (показ кружочка)

    // Проактивное сообщение — только если за N секунд виджет НЕ открывали (не нажимали).
    if (STATE.settings.proactiveEnabled && STATE.settings.proactiveMessage) {
      STATE.proactiveTimer = setTimeout(function () {
        STATE.proactiveTimer = null;
        if (STATE.interacted || STATE.open) return;
        showProactiveBadge(STATE.settings.proactiveMessage, 'timer_20m');
      }, Math.max(1, STATE.settings.proactiveDelaySeconds || 15) * 1000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

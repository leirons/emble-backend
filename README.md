# Emble Backend

Backend B2B SaaS-конструктора ИИ-ассистентов. Стек: **Node.js + Express.js** (без фреймворков вроде NestJS — по требованию), PostgreSQL + pgvector, Redis + BullMQ, S3-совместимое хранилище, OpenAI/Anthropic.

## Быстрый старт

```bash
cp .env.example .env        # заполнить хотя бы OPENAI_API_KEY, S3_*, JWT_*
docker compose up -d postgres redis
npm install
npm run migrate             # применяет src/db/migrations/*.sql
npm run seed                 # опционально: демо-организация + агент, логин demo@emble.ai / password123
npm run dev                  # API на http://localhost:4000
npm run worker:dev           # отдельный процесс — обработка базы знаний (в другом терминале)
```

Открыть `http://localhost:4000/widget-demo.html` — тестовая страница со встроенным виджетом
(вставлен `<script src="/embed.js" data-agent="..." data-api="http://localhost:4000" async>`).
В продакшене `data-api` не нужен — embed.js берёт origin из своего собственного `src`
(`<script src="https://cdn.emble.ai/embed.js" data-agent="agent-x9f2c" async>`).

## Структура

```
src/
  index.js              # Express-приложение, монтирование роутов
  worker.js              # отдельный процесс BullMQ — обработка базы знаний (RAG ingestion)
  config/env.js           # чтение переменных окружения
  db/                     # pg Pool, миграции (raw SQL), сид
  lib/                    # redis, s3, queue, jwt, errors, logger, llm/ (OpenAI+Anthropic gateway)
  middleware/              # auth (JWT), rate limit, валидация zod, CORS/whitelist для виджета
  modules/
    auth/                  # регистрация/логин/refresh
    organizations/          # орг. аккаунт, участники команды
    agents/                  # CRUD агентов, шаблоны Support/Sales/Leads, брендинг, домены
    knowledge/                # источники знаний (файл/URL/текст), извлечение, чанкинг, embeddings
    chat/                      # RAG + промпт-билдер + стриминг LLM + история диалогов
    widget/                     # публичный API для embed.js (без авторизации дашборда)
    leads/                       # захват контактов (шаблон "Генератор лидов")
    analytics/                   # события и агрегированные метрики
    billing/                      # тарифы, Stripe checkout + webhook, метеринг лимитов
    usage/                         # учёт сообщений/токенов по организации в месяц
public/
  embed.js                # встраиваемый виджет (vanilla JS, Shadow DOM, SSE-стриминг)
  widget-demo.html          # локальная страница для проверки интеграции
```

## Ключевые эндпоинты

**Dashboard API** (JWT, `Authorization: Bearer <accessToken>`):
`POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`,
`GET /organizations/me`, `POST /organizations/members`,
`POST /agents`, `GET /agents`, `PATCH /agents/:id`, `POST /agents/:id/publish`,
`PATCH /agents/:id/branding`, `POST /agents/:id/domains`,
`POST /agents/:id/knowledge/file|url|text`, `GET /agents/:id/knowledge`,
`GET /agents/:id/conversations`, `GET /agents/:id/leads`, `GET /agents/:id/analytics`,
`GET /billing/plans`, `POST /billing/checkout`.

**Public Widget API** (без авторизации, домен проверяется по whitelist агента):
`GET /widget/:agentSlug/config`, `POST /widget/:agentSlug/conversations`,
`POST /widget/:agentSlug/conversations/:id/messages` (ответ — SSE-поток),
`POST /widget/:agentSlug/leads`.

## Важные примечания

- **Домены виджета**: пока у агента не добавлен ни один домен в `widget_domains`, публичный
  API разрешает запросы с любого origin (удобно на этапе интеграции). Добавьте домен через
  `POST /agents/:id/domains`, чтобы ограничить встраивание только вашим сайтом.
- **RAG**: embeddings считаются только через OpenAI (`text-embedding-3-small`), даже если чат
  работает на Claude — у Anthropic нет своего embeddings API.
- **Лимиты по тарифам** (`src/db/migrations/001_init.sql`, таблица `plans`) проверяются при
  создании агента (`agent_limit`) и перед отправкой сообщения в чате (`message_limit`/мес).
- Приглашение участника команды (`POST /organizations/members`) в MVP возвращает временный
  пароль в ответе API — в проде это должно уйти письмом, а не в JSON-ответе.
- Этот код не запускался в реальном окружении в рамках текущей сессии (песочница без диска/сети
  для `npm install`) — перед деплоем прогоните `npm install`, `npm run migrate` и пройдитесь
  по сценарию: регистрация → создание агента → загрузка базы знаний → публикация →
  вставка `embed.js` на тестовую страницу → диалог в виджете.

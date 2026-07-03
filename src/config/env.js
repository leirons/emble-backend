import 'dotenv/config';

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    // Не бросаем исключение на старте модуля — только предупреждаем,
    // чтобы можно было импортировать конфиг в скриптах (migrate/seed) без всех секретов.
    // eslint-disable-next-line no-console
    console.warn(`[config] переменная окружения ${name} не задана`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:4000',
  dashboardOrigin: process.env.DASHBOARD_ORIGIN || 'http://localhost:3000',

  databaseUrl: required('DATABASE_URL', 'postgres://emble:emble@localhost:5432/emble'),
  // KV_URL — имя, под которым строку подключения (rediss://) отдаёт интеграция Vercel KV / Upstash.
  redisUrl: process.env.REDIS_URL || process.env.KV_URL || 'redis://localhost:6379',

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'auto',
    bucket: process.env.S3_BUCKET || 'emble-uploads',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
  },

  llm: {
    defaultProvider: process.env.DEFAULT_LLM_PROVIDER || 'openai',
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      chatModel: process.env.ANTHROPIC_CHAT_MODEL || 'claude-3-5-sonnet-latest',
    },
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  widget: {
    cdnBaseUrl: process.env.WIDGET_CDN_BASE_URL || 'https://cdn.emble.ai',
  },
};

export default env;

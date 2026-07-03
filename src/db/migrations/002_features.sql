-- Emble backend — расширенные возможности конструктора агентов:
-- Q&A-пары, каталог товаров, синхронизация базы знаний, сценарии (ветки),
-- настройки поведения, custom actions (webhooks / function calling), feedback.

-- =========================
-- Q&A пары
-- =========================
CREATE TABLE IF NOT EXISTS agent_qa_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_qa_pairs_agent_id ON agent_qa_pairs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_qa_pairs_embedding
  ON agent_qa_pairs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =========================
-- Каталог товаров
-- =========================
CREATE TABLE IF NOT EXISTS agent_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'RUB',
  url TEXT,
  image_url TEXT,
  category TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_products_agent_id ON agent_products(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_products_embedding
  ON agent_products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =========================
-- Теги и синхронизация базы знаний
-- =========================
ALTER TABLE knowledge_sources
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sync_interval_minutes INT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- =========================
-- Сценарии (ветки диалога)
-- =========================
CREATE TABLE IF NOT EXISTS agent_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  definition JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_flows_agent_id ON agent_flows(agent_id);

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS active_flow_id UUID REFERENCES agent_flows(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS flow_step_id TEXT;

-- =========================
-- Настройки поведения агента (proactive / exit-intent / эскалация / язык / email-fallback)
-- =========================
CREATE TABLE IF NOT EXISTS agent_settings (
  agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  proactive_enabled BOOLEAN NOT NULL DEFAULT false,
  proactive_message TEXT,
  proactive_delay_seconds INT NOT NULL DEFAULT 15,
  exit_intent_enabled BOOLEAN NOT NULL DEFAULT false,
  exit_intent_message TEXT,
  escalation_enabled BOOLEAN NOT NULL DEFAULT true,
  escalation_keywords TEXT[] NOT NULL DEFAULT '{"оператор","человек","живой человек","менеджер"}',
  auto_language BOOLEAN NOT NULL DEFAULT true,
  email_fallback_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- Custom actions (webhooks / function calling)
-- =========================
CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST' CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH')),
  url TEXT NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}',
  body_template JSONB NOT NULL DEFAULT '{}',
  param_schema JSONB NOT NULL DEFAULT '{}',
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('llm_tool', 'event')),
  event_name TEXT CHECK (event_name IN ('lead_captured', 'conversation_escalated', 'conversation_started')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_agent_id ON agent_actions(agent_id);

CREATE TABLE IF NOT EXISTS agent_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES agent_actions(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  request_body JSONB,
  response_status INT,
  response_snippet TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_action_logs_action_id ON agent_action_logs(action_id);

-- =========================
-- Оценка ответов (👍/👎)
-- =========================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS feedback SMALLINT CHECK (feedback IN (-1, 1));

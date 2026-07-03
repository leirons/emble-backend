-- Аналитика виджета: сессии в событиях + таблица неотвеченных вопросов.

ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(agent_id, event_type, session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(agent_id, created_at);

CREATE TABLE IF NOT EXISTS unanswered_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_unanswered_agent_status ON unanswered_questions(agent_id, status);

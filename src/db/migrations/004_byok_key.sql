-- BYOK (Bring Your Own Key): собственный OpenAI API-ключ агента.
-- Если задан — используется вместо серверного ключа для эмбеддингов и генерации.
ALTER TABLE agent_settings
  ADD COLUMN IF NOT EXISTS openai_api_key TEXT;

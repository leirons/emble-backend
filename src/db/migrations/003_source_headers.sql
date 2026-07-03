-- Заголовки/авторизация для URL-источников базы знаний (доступ к защищённым страницам/API).
ALTER TABLE knowledge_sources
  ADD COLUMN IF NOT EXISTS request_headers JSONB NOT NULL DEFAULT '{}';

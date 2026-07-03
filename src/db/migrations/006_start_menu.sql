-- Стартовое меню виджета (домашний экран): конфиг элементов.
-- Формат: { "enabled": bool, "items": [{ "type": "chat|faq|contacts", "title": "...", "content": "..." }] }
ALTER TABLE agent_branding
  ADD COLUMN IF NOT EXISTS start_menu JSONB NOT NULL DEFAULT '{"enabled":false,"items":[]}';

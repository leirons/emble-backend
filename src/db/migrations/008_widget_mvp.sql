-- ТЗ MVP «Обновление логики виджета»:
--   1. Сбор email при эскалации на оператора (тумблер + кастомное сообщение).
--   2. Персонализация приветствия для новых/вернувшихся посетителей.
-- (Exit-Intent выводится из строя на фронтенде и в API-конфиге; столбцы БД оставлены
--  как легаси, чтобы не ломать историю миграций и существующие данные.)

ALTER TABLE agent_settings
  ADD COLUMN IF NOT EXISTS enable_email_on_escalation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_email_message TEXT,
  ADD COLUMN IF NOT EXISTS enable_returning_greeting BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS greeting_new TEXT,
  ADD COLUMN IF NOT EXISTS greeting_returning TEXT;

-- Тип контакта, который собирает форма захвата лида в виджете: email (по умолчанию) или телефон.
-- Владелец агента выбирает его переключателем в настройках; виджет показывает соответствующее поле.
ALTER TABLE agent_settings
  ADD COLUMN IF NOT EXISTS lead_contact_type TEXT NOT NULL DEFAULT 'email'
  CHECK (lead_contact_type IN ('email', 'phone'));

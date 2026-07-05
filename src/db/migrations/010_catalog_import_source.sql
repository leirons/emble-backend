-- Источник фида для фонового импорта каталога: URL, заголовки, формат и маппинг полей.
-- Позволяет создавать задачу импорта мгновенно (без скачивания в запросе) — фоновая
-- prepare-фаза сама качает и парсит фид по этому конфигу, затем заполняет rows_data/total_rows.
ALTER TABLE catalog_import_jobs
  ADD COLUMN IF NOT EXISTS source_config JSONB;

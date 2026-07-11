-- Стиль карточек товаров-рекомендаций в виджете:
--   'image'    — баннер = фото товара (picture), с градиентным фолбэком, если фото нет;
--   'gradient' — всегда красивый градиентный квадрат (фото игнорируется).
ALTER TABLE agent_branding
  ADD COLUMN IF NOT EXISTS product_card_style TEXT NOT NULL DEFAULT 'image'
  CHECK (product_card_style IN ('image', 'gradient'));

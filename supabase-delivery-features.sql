-- Campos para frete grátis, promoções e tempo estimado de entrega
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS free_shipping boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_text text,
  ADD COLUMN IF NOT EXISTS delivery_time_min integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS delivery_time_max integer NOT NULL DEFAULT 50;

CREATE INDEX IF NOT EXISTS idx_restaurants_free_shipping ON restaurants(free_shipping);

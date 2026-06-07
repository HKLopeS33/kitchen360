-- Adiciona categoria de estabelecimento (restaurante, mercado, conveniência, farmácia)
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'restaurante'
    CHECK (category IN ('restaurante', 'mercado', 'conveniencia', 'farmacia'));

CREATE INDEX IF NOT EXISTS idx_restaurants_category ON restaurants(category);

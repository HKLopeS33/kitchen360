-- Adiciona as categorias "pizzaria" e "hamburgueria" ao conjunto permitido
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_category_check;

ALTER TABLE restaurants
  ADD CONSTRAINT restaurants_category_check
    CHECK (category IN ('restaurante', 'mercado', 'conveniencia', 'farmacia', 'pizzaria', 'hamburgueria'));

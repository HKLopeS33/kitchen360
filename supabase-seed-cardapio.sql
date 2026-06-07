-- ============================================================
-- CARDÁPIO FITNESS - IntegraFit (chelyd.b@gmail.com)
-- Execute no SQL Editor do Supabase
-- ============================================================

do $$
declare
  v_restaurant_id uuid;
begin
  -- Busca o restaurante pelo email do dono
  select r.id into v_restaurant_id
  from public.restaurants r
  join auth.users u on u.id = r.owner_id
  where u.email = 'chelyd.b@gmail.com'
  limit 1;

  if v_restaurant_id is null then
    raise exception 'Restaurante não encontrado para chelyd.b@gmail.com. Cadastre o restaurante no app primeiro.';
  end if;

  -- Remove itens antigos do restaurante (para evitar duplicatas)
  delete from public.menu_items where restaurant_id = v_restaurant_id;

  -- Insere os 10 itens
  insert into public.menu_items (restaurant_id, name, description, price, category, image_url, available) values

  -- PRATOS
  (v_restaurant_id,
   'Frango Grelhado com Batata Doce',
   'Peito de frango grelhado temperado com ervas finas, acompanhado de batata doce assada e brócolis no vapor.',
   28.90, 'Pratos',
   'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true),

  (v_restaurant_id,
   'Bowl de Salmão com Quinoa',
   'Salmão grelhado sobre quinoa cozida com edamame, cenoura ralada, pepino e molho shoyu light.',
   42.90, 'Pratos',
   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
   true),

  (v_restaurant_id,
   'Marmita Fit Completa',
   'Arroz integral, feijão carioca, carne moída temperada, legumes refogados e salada verde.',
   24.90, 'Pratos',
   'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80',
   true),

  -- SALADAS
  (v_restaurant_id,
   'Salada Caesar Proteica',
   'Alface americana, frango grelhado desfiado, croutons integrais, parmesão e molho caesar light.',
   22.90, 'Saladas',
   'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&q=80',
   true),

  (v_restaurant_id,
   'Bowl Detox de Frutas',
   'Base de iogurte grego, morango, banana, kiwi, granola sem açúcar e mel silvestre.',
   19.90, 'Saladas',
   'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=600&q=80',
   true),

  -- LANCHES
  (v_restaurant_id,
   'Wrap de Atum Fitness',
   'Tortilla integral com atum light, cream cheese light, rúcula, tomate cereja e cenoura ralada.',
   18.90, 'Lanches',
   'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80',
   true),

  (v_restaurant_id,
   'Tapioca de Frango com Queijo',
   'Tapioca crocante recheada com frango desfiado temperado e queijo branco light.',
   16.90, 'Lanches',
   'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=600&q=80',
   true),

  -- SUCOS
  (v_restaurant_id,
   'Suco Verde Detox',
   'Couve, maçã verde, gengibre, limão, pepino e água de coco. Rico em antioxidantes.',
   12.90, 'Sucos',
   'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=600&q=80',
   true),

  (v_restaurant_id,
   'Suco de Laranja com Cúrcuma',
   'Suco de laranja natural com cúrcuma e pimenta-do-reino — anti-inflamatório e energizante.',
   11.90, 'Sucos',
   'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80',
   true),

  (v_restaurant_id,
   'Vitamina de Banana com Whey',
   'Banana, leite de amêndoas, whey protein sabor baunilha, aveia e canela. 30g de proteína.',
   16.90, 'Sucos',
   'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&q=80',
   true);

  raise notice 'Cardápio criado com sucesso! 10 itens adicionados ao restaurante %', v_restaurant_id;
end $$;

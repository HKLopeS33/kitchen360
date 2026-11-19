-- =====================================================================
-- PROMOÇÃO LIGADA A UM ITEM DO CARDÁPIO — rode inteiro no SQL Editor.
-- Pode rodar mais de uma vez (idempotente).
--
-- Uma promoção pode apontar para um item do cardápio. Enquanto ela estiver
-- ativa e dentro do prazo, o item custa o preço promocional — no cardápio,
-- no carrinho e, principalmente, no pedido (o banco recalcula o preço).
-- =====================================================================

alter table public.promotions
  add column if not exists menu_item_id uuid references public.menu_items(id) on delete set null;

create index if not exists promotions_menu_item_idx on public.promotions (menu_item_id);

-- Menor preço promocional válido agora para o item (null = sem promoção).
create or replace function public.item_promo_price(p_item_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select min(p.promo_price)
  from public.promotions p
  join public.menu_items m on m.id = p.menu_item_id
  where p.menu_item_id = p_item_id
    and p.restaurant_id = m.restaurant_id
    and p.is_active
    and p.promo_price > 0
    and p.promo_price < m.price
    and p.starts_at <= now()
    and (p.ends_at is null or p.ends_at > now());
$$;

grant execute on function public.item_promo_price(uuid) to anon, authenticated;

-- Pedido: mesmo trigger de antes, agora usando o preço promocional quando houver.
create or replace function public.orders_enforce_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_total numeric(10,2) := 0;
  v_el    jsonb;
  v_qty   int;
  v_item  record;
  v_price numeric(10,2);
  v_promo numeric;
begin
  if public.is_privileged() then
    return new;
  end if;

  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'Pedido sem itens';
  end if;

  for v_el in select * from jsonb_array_elements(new.items) loop
    v_qty := coalesce((v_el->>'quantity')::int, 0);
    if v_qty < 1 or v_qty > 99 then
      raise exception 'Quantidade inválida';
    end if;

    select id, name, category, price into v_item
    from public.menu_items
    where id = (v_el->>'id')::uuid
      and restaurant_id = new.restaurant_id
      and available;

    if not found then
      raise exception 'Item indisponível no cardápio: %', coalesce(v_el->>'name', v_el->>'id');
    end if;

    v_promo := public.item_promo_price(v_item.id);
    v_price := coalesce(v_promo, v_item.price);

    -- Os parênteses importam: sem eles, "lista || objeto || '{}'" acrescenta
    -- o '{}' como um item a mais na lista.
    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'id', v_item.id, 'name', v_item.name, 'category', v_item.category,
        'price', v_price, 'quantity', v_qty
      ) || case when v_promo is not null
                then jsonb_build_object('original_price', v_item.price)
                else '{}'::jsonb end
    );
    v_total := v_total + v_price * v_qty;
  end loop;

  new.items          := v_items;
  new.total          := v_total;
  new.status         := 'awaiting_payment';
  new.payment_status := 'pending';
  new.payment_id     := null;
  return new;
end;
$$;

drop trigger if exists orders_enforce_on_insert on public.orders;
create trigger orders_enforce_on_insert
  before insert on public.orders
  for each row execute function public.orders_enforce_on_insert();

notify pgrst, 'reload schema';

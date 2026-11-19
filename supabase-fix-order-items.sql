-- =====================================================================
-- CORREÇÃO: item vazio ("× R$ NaN") nos pedidos — rode inteiro no SQL Editor.
-- Pode rodar mais de uma vez.
--
-- 1) Corrige o trigger de pedido (a versão anterior acrescentava um item
--    vazio, e o preço original da promoção virava um item separado).
-- 2) Limpa os pedidos já gravados com esse problema.
-- =====================================================================

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

-- Limpeza: junta o "original_price" solto ao item anterior e remove os vazios.
with fixed as (
  select o.id,
         coalesce(jsonb_agg(
           e.el || coalesce(
             case when (n.nxt ? 'original_price') and not (n.nxt ? 'id')
                  then jsonb_build_object('original_price', n.nxt->'original_price') end,
             '{}'::jsonb)
           order by e.ord
         ) filter (where e.el ? 'id'), '[]'::jsonb) as items
  from public.orders o
  cross join lateral jsonb_array_elements(o.items) with ordinality as e(el, ord)
  left join lateral (select o.items -> (e.ord::int) as nxt) n on true
  where exists (select 1 from jsonb_array_elements(o.items) x where not (x ? 'id'))
  group by o.id
)
update public.orders o
set items = f.items
from fixed f
where o.id = f.id;

notify pgrst, 'reload schema';

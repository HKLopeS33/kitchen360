-- =====================================================================
-- NOTIFICAÇÕES DO ESTABELECIMENTO — rode inteiro no SQL Editor.
-- Pode rodar mais de uma vez (idempotente).
--
-- Antes: o aviso de "novo pedido" só disparava quando o pedido era criado
-- já pago. Hoje todo pedido nasce "aguardando pagamento", então o aviso
-- nunca chegava. Agora o estabelecimento é avisado quando o pagamento é
-- confirmado (aguardando pagamento → aguardando aceite) e quando um pedido
-- pago é cancelado pelo pagamento (estorno/contestação).
-- =====================================================================

create or replace function public.notify_restaurant_order_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_qty   int;
begin
  select owner_id into v_owner from public.restaurants where id = new.restaurant_id;
  if v_owner is null then return new; end if;

  select coalesce(sum((e->>'quantity')::int), 0) into v_qty
  from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) e;

  -- Pedido pago (novo, ou que acabou de sair de "aguardando pagamento")
  if new.status = 'pending'
     and (tg_op = 'INSERT' or old.status = 'awaiting_payment') then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_owner, 'new_order',
      'Novo pedido #' || new.order_number,
      coalesce(nullif(new.client_name, ''), 'Cliente') || ' · ' || v_qty ||
        case when v_qty = 1 then ' item · R$ ' else ' itens · R$ ' end ||
        replace(to_char(new.total, 'FM999990.00'), '.', ','),
      jsonb_build_object('order_id', new.id, 'restaurant_id', new.restaurant_id)
    );

  -- Pedido cancelado depois de pago, sem ter sido o próprio dono
  -- (ex.: pagamento estornado ou contestado no Mercado Pago)
  elsif tg_op = 'UPDATE' and new.status = 'cancelled'
        and old.status in ('pending', 'preparing', 'ready')
        and auth.uid() is distinct from v_owner then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_owner, 'order_status',
      'Pedido #' || new.order_number || ' cancelado',
      coalesce(nullif(new.client_name, ''), 'Cliente') || ' · pagamento cancelado ou estornado',
      jsonb_build_object('order_id', new.id, 'restaurant_id', new.restaurant_id)
    );
  end if;

  return new;
end;
$$;

-- Substitui o trigger antigo (que nunca disparava)
drop trigger if exists trg_notify_new_order on public.orders;
drop trigger if exists trg_notify_restaurant_order on public.orders;
create trigger trg_notify_restaurant_order
  after insert or update of status on public.orders
  for each row execute function public.notify_restaurant_order_events();

-- Garante que as notificações cheguem em tempo real ao sino
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

notify pgrst, 'reload schema';

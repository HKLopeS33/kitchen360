-- =====================================================================
-- Sistema de Promoções e Notificações
-- =====================================================================

-- 1) Tabela de promoções dos restaurantes
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade not null,
  title text not null,
  description text,
  type text not null default 'promo' check (type in ('promo', 'combo', 'desconto')),
  badge text,           -- ex: "20% OFF", "R$ 5,00 OFF", "COMBO"
  original_price numeric,
  promo_price numeric,
  image_url text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table promotions enable row level security;

-- Qualquer um pode ver promoções ativas
drop policy if exists "promotions_select_active" on promotions;
create policy "promotions_select_active" on promotions
  for select using (is_active = true);

-- Dono do restaurante gerencia suas promoções
drop policy if exists "promotions_owner_all" on promotions;
create policy "promotions_owner_all" on promotions
  for all using (
    exists (select 1 from restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
  ) with check (
    exists (select 1 from restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
  );

-- Admin vê tudo
drop policy if exists "promotions_admin_select" on promotions;
create policy "promotions_admin_select" on promotions
  for select using (is_admin());


-- 2) Tabela de notificações in-app
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('new_order', 'order_status', 'promotion', 'system')),
  title text not null,
  body text,
  data jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

-- Usuário vê apenas suas notificações
drop policy if exists "notifications_own" on notifications;
create policy "notifications_own" on notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Admin pode inserir notificações para qualquer usuário (promoções etc.)
drop policy if exists "notifications_admin_insert" on notifications;
create policy "notifications_admin_insert" on notifications
  for insert with check (is_admin());


-- 3) Trigger: notifica dono do restaurante sobre novo pedido
create or replace function notify_restaurant_new_order()
returns trigger as $$
declare
  v_owner_id uuid;
  v_restaurant_name text;
begin
  select owner_id, name into v_owner_id, v_restaurant_name
  from restaurants where id = NEW.restaurant_id;

  if v_owner_id is not null then
    insert into notifications (user_id, type, title, body, data)
    values (
      v_owner_id,
      'new_order',
      '🛵 Novo pedido recebido!',
      NEW.client_name || ' fez um pedido em ' || v_restaurant_name,
      jsonb_build_object('order_id', NEW.id, 'restaurant_id', NEW.restaurant_id)
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_new_order on orders;
create trigger trg_notify_new_order
  after insert on orders
  for each row
  when (NEW.status <> 'awaiting_payment')
  execute function notify_restaurant_new_order();


-- 4) Trigger: notifica cliente sobre mudança de status do pedido
create or replace function notify_order_status_change()
returns trigger as $$
declare
  v_title text;
begin
  if OLD.status = NEW.status then return NEW; end if;

  v_title := case NEW.status
    when 'pending'    then '✅ Pedido confirmado!'
    when 'preparing'  then '👨‍🍳 Seu pedido está sendo preparado'
    when 'ready'      then '📦 Pedido pronto para entrega!'
    when 'delivered'  then '🎉 Pedido entregue!'
    when 'cancelled'  then '❌ Pedido cancelado'
    else null
  end;

  if v_title is not null and NEW.client_id is not null then
    insert into notifications (user_id, type, title, body, data)
    values (
      NEW.client_id,
      'order_status',
      v_title,
      'Pedido #' || NEW.order_number || ' — ' || 'R$ ' || NEW.total,
      jsonb_build_object('order_id', NEW.id)
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_order_status on orders;
create trigger trg_notify_order_status
  after update on orders
  for each row execute function notify_order_status_change();

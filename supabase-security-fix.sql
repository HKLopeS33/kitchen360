-- =====================================================================
-- CORREÇÃO DE SEGURANÇA — rode inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem problema (idempotente).
--
-- Corrige:
--   1. Tokens do Mercado Pago legíveis por qualquer pessoa (app_settings
--      e restaurants.mp_access_token) → movidos para tabelas sem acesso
--      pelo app; leitura só pelas Edge Functions (service role).
--   2. Qualquer usuário podia virar admin (no cadastro ou editando o
--      próprio perfil).
--   3. Dono de restaurante podia marcar a própria assinatura como ativa.
--   4. Cliente podia criar pedido já "pago" e com preço inventado.
--   5. Assinaturas vencidas não mudavam de status sozinhas.
--
-- DEPOIS DE RODAR: publique as Edge Functions e o app novo, e GERE NOVOS
-- TOKENS no Mercado Pago (os antigos ficaram expostos).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0) Quem pode mexer em campos sensíveis: admin, Edge Functions
--    (service_role) ou você rodando SQL direto no painel (sem JWT).
-- ---------------------------------------------------------------------
create or replace function public.is_privileged()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') in ('service_role', '')
      or public.is_admin();
$$;


-- ---------------------------------------------------------------------
-- 1) Cadastro: o papel vem do formulário, mas só pode ser cliente ou
--    estabelecimento. "admin" só se define manualmente pelo painel.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'client');
begin
  if v_role not in ('client', 'restaurant_owner') then
    v_role := 'client';
  end if;

  insert into public.profiles (id, email, name, role, address)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'Usuário'),
    v_role,
    coalesce(new.raw_user_meta_data->>'address', '')
  );
  return new;
end;
$$;

-- Perfil: usuário edita nome/telefone/endereço, mas não papel nem e-mail.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_privileged() then
    new.role  := old.role;
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();


-- ---------------------------------------------------------------------
-- 2) Restaurante: dono não altera os campos de assinatura.
-- ---------------------------------------------------------------------
create or replace function public.protect_restaurant_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_privileged() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.subscription_status       := 'trial';
    new.trial_ends_at             := now() + interval '15 days';
    new.subscription_active_until := null;
    new.last_subscription_payment_id := null;
  else
    new.subscription_status       := old.subscription_status;
    new.trial_ends_at             := old.trial_ends_at;
    new.subscription_active_until := old.subscription_active_until;
    new.last_subscription_payment_id := old.last_subscription_payment_id;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_restaurant_subscription on public.restaurants;
create trigger protect_restaurant_subscription
  before insert or update on public.restaurants
  for each row execute function public.protect_restaurant_subscription();


-- ---------------------------------------------------------------------
-- 3) Segredos: tabelas sem nenhuma policy → o app (anon/authenticated)
--    não lê nem escreve. Só Edge Functions (service role) e as funções
--    abaixo acessam.
-- ---------------------------------------------------------------------
create table if not exists public.platform_secrets (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_secrets (
  restaurant_id   uuid primary key references public.restaurants(id) on delete cascade,
  mp_access_token text not null,
  updated_at      timestamptz not null default now()
);

alter table public.platform_secrets   enable row level security;
alter table public.restaurant_secrets enable row level security;
revoke all on public.platform_secrets   from anon, authenticated;
revoke all on public.restaurant_secrets from anon, authenticated;

-- Copia os tokens existentes e apaga dos lugares públicos.
insert into public.platform_secrets (key, value)
select key, value from public.app_settings where key = 'admin_mp_token'
on conflict (key) do update set value = excluded.value, updated_at = now();

delete from public.app_settings where key = 'admin_mp_token';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'restaurants' and column_name = 'mp_access_token'
  ) then
    insert into public.restaurant_secrets (restaurant_id, mp_access_token)
    select id, trim(mp_access_token) from public.restaurants
    where coalesce(trim(mp_access_token), '') <> ''
    on conflict (restaurant_id) do update set mp_access_token = excluded.mp_access_token, updated_at = now();

    alter table public.restaurants drop column mp_access_token;
  end if;
end $$;

-- app_settings: leitura pública só do que é público (valor da mensalidade).
drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all" on public.app_settings
  for select using (key = 'monthly_fee' or public.is_admin());


-- Funções que o app usa para salvar/consultar tokens sem nunca lê-los.
create or replace function public.set_admin_mp_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores';
  end if;
  if coalesce(trim(p_token), '') = '' then
    delete from public.platform_secrets where key = 'admin_mp_token';
  else
    insert into public.platform_secrets (key, value) values ('admin_mp_token', trim(p_token))
    on conflict (key) do update set value = excluded.value, updated_at = now();
  end if;
end;
$$;

create or replace function public.admin_mp_token_configured()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
     and exists (select 1 from public.platform_secrets where key = 'admin_mp_token');
$$;

create or replace function public.set_restaurant_mp_token(p_restaurant_id uuid, p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.restaurants where id = p_restaurant_id and owner_id = auth.uid()
  ) and not public.is_admin() then
    raise exception 'Sem permissão para este estabelecimento';
  end if;
  if coalesce(trim(p_token), '') = '' then
    delete from public.restaurant_secrets where restaurant_id = p_restaurant_id;
  else
    insert into public.restaurant_secrets (restaurant_id, mp_access_token)
    values (p_restaurant_id, trim(p_token))
    on conflict (restaurant_id) do update set mp_access_token = excluded.mp_access_token, updated_at = now();
  end if;
end;
$$;

create or replace function public.restaurant_mp_token_configured(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    exists (select 1 from public.restaurants where id = p_restaurant_id and owner_id = auth.uid())
    or public.is_admin()
  ) and exists (select 1 from public.restaurant_secrets where restaurant_id = p_restaurant_id);
$$;

revoke all on function public.set_admin_mp_token(text)                   from public, anon;
revoke all on function public.admin_mp_token_configured()                from public, anon;
revoke all on function public.set_restaurant_mp_token(uuid, text)        from public, anon;
revoke all on function public.restaurant_mp_token_configured(uuid)       from public, anon;
grant execute on function public.set_admin_mp_token(text)                to authenticated;
grant execute on function public.admin_mp_token_configured()             to authenticated;
grant execute on function public.set_restaurant_mp_token(uuid, text)     to authenticated;
grant execute on function public.restaurant_mp_token_configured(uuid)    to authenticated;


-- ---------------------------------------------------------------------
-- 4) Pedidos: preço e status definidos pelo banco, não pelo navegador.
-- ---------------------------------------------------------------------
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

    v_items := v_items || jsonb_build_object(
      'id', v_item.id, 'name', v_item.name, 'category', v_item.category,
      'price', v_item.price, 'quantity', v_qty
    );
    v_total := v_total + v_item.price * v_qty;
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


-- ---------------------------------------------------------------------
-- 5) Assinaturas vencidas passam para "Vencido" automaticamente.
-- ---------------------------------------------------------------------
create or replace function public.refresh_subscription_statuses()
returns void
language sql
security definer
set search_path = public
as $$
  update public.restaurants
     set subscription_status = 'past_due'
   where (subscription_status = 'trial'  and trial_ends_at < now())
      or (subscription_status = 'active' and subscription_active_until is not null
                                         and subscription_active_until < now());
$$;

revoke all on function public.refresh_subscription_statuses() from public, anon, authenticated;

select public.refresh_subscription_statuses();  -- corrige os atuais já agora

-- Agenda para rodar a cada hora (pg_cron vem no Supabase; se der erro aqui,
-- ative "pg_cron" em Database → Extensions e rode só este bloco de novo).
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'refresh-subscriptions';
select cron.schedule('refresh-subscriptions', '0 * * * *', $$select public.refresh_subscription_statuses();$$);

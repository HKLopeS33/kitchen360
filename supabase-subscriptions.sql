-- =====================================================================
-- Sistema de assinatura/mensalidade dos restaurantes (controlado por
-- um perfil "admin" / superusuário) + período de teste de 15 dias.
-- =====================================================================

-- 1) Tabela de configurações globais da plataforma (valor único da
--    mensalidade, definido pelo superusuário e aplicado a todos).
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into app_settings (key, value)
values ('monthly_fee', '49.90')
on conflict (key) do nothing;

alter table app_settings enable row level security;

-- Qualquer usuário autenticado pode LER as configurações (ex: valor da
-- mensalidade exibido na tela de cadastro do restaurante).
drop policy if exists "app_settings_select_all" on app_settings;
create policy "app_settings_select_all" on app_settings
  for select using (true);

-- Apenas administradores podem alterar.
drop policy if exists "app_settings_admin_write" on app_settings;
create policy "app_settings_admin_write" on app_settings
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );


-- 2) Campos de assinatura/teste no restaurante.
alter table restaurants
  add column if not exists subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'past_due', 'suspended')),
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '15 days'),
  add column if not exists subscription_active_until timestamptz,
  add column if not exists accepted_terms_at timestamptz;

comment on column restaurants.subscription_status is
  'trial = nos primeiros 15 dias grátis; active = mensalidade em dia; past_due = venceu, aguardando pagamento; suspended = bloqueado pelo admin';
comment on column restaurants.trial_ends_at is
  'Data em que o período de teste de 15 dias termina';
comment on column restaurants.subscription_active_until is
  'Data até quando a mensalidade paga garante acesso à plataforma';


-- 3) Permite que administradores leiam e atualizem todos os
--    restaurantes (necessário para o painel de gestão de assinaturas).
drop policy if exists "restaurants_admin_select_all" on restaurants;
create policy "restaurants_admin_select_all" on restaurants
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "restaurants_admin_update_all" on restaurants;
create policy "restaurants_admin_update_all" on restaurants
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 4) Permite que administradores leiam todos os perfis (para ver nome/
--    e-mail dos donos de restaurante na lista de assinaturas).
drop policy if exists "profiles_admin_select_all" on profiles;
create policy "profiles_admin_select_all" on profiles
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

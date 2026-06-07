-- ============================================================
-- SETUP SUPABASE - Cardápio Fitness | Floresta - PE
-- Execute no SQL Editor do painel do Supabase
-- ============================================================

-- 1. Tabela de perfis (ligada ao auth.users)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text not null,
  role       text not null default 'client' check (role in ('client', 'restaurant_owner', 'admin')),
  created_at timestamptz not null default now()
);

-- 2. Tabela de restaurantes
create table if not exists public.restaurants (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  description   text not null default '',
  phone         text not null default '',
  address       text not null default '',
  city          text not null default 'Floresta',
  state         text not null default 'PE',
  open_time     time not null default '08:00',
  close_time    time not null default '18:00',
  is_open_today boolean not null default false,
  image_url     text,
  created_at    timestamptz not null default now(),
  -- Um dono só pode ter um restaurante
  unique (owner_id)
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;

-- PROFILES: usuário vê apenas o próprio perfil
create policy "Usuário vê próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuário atualiza próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Perfil é criado pelo backend (service role) via trigger
create policy "Inserir perfil próprio"
  on public.profiles for insert
  with check (auth.uid() = id);

-- RESTAURANTS: qualquer um pode listar
create policy "Qualquer um pode listar restaurantes"
  on public.restaurants for select
  using (true);

-- Dono gerencia o próprio restaurante
create policy "Dono cria restaurante"
  on public.restaurants for insert
  with check (auth.uid() = owner_id);

create policy "Dono atualiza restaurante"
  on public.restaurants for update
  using (auth.uid() = owner_id);

create policy "Dono deleta restaurante"
  on public.restaurants for delete
  using (auth.uid() = owner_id);

-- ============================================================
-- Dados de exemplo (opcional, remova se não quiser)
-- ============================================================
-- Insira manualmente um restaurante de exemplo após criar a conta
-- de dono no app, ou use os dados abaixo ajustando o owner_id:
--
-- insert into public.restaurants (owner_id, name, description, phone, address, open_time, close_time, is_open_today)
-- values (
--   'UUID_DO_USUARIO_DONO',
--   'Fit Grill Floresta',
--   'Refeições saudáveis e saborosas no coração de Floresta',
--   '(87) 99999-0001',
--   'Rua Principal, 100, Centro',
--   '11:00',
--   '22:00',
--   true
-- );

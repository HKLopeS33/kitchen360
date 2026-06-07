-- Execute no SQL Editor do Supabase

create table if not exists public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  description   text not null default '',
  price         numeric(10,2) not null default 0,
  category      text not null default 'Geral',
  image_url     text,
  available     boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.menu_items enable row level security;

-- Qualquer um pode ver os itens disponíveis
create policy "Listar itens do cardápio"
  on public.menu_items for select
  using (true);

-- Só o dono do restaurante pode gerenciar os itens
create policy "Dono cria itens"
  on public.menu_items for insert
  with check (
    auth.uid() = (select owner_id from public.restaurants where id = restaurant_id)
  );

create policy "Dono atualiza itens"
  on public.menu_items for update
  using (
    auth.uid() = (select owner_id from public.restaurants where id = restaurant_id)
  );

create policy "Dono deleta itens"
  on public.menu_items for delete
  using (
    auth.uid() = (select owner_id from public.restaurants where id = restaurant_id)
  );

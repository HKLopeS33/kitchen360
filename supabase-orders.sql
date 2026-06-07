-- Tabela de pedidos
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_number   serial,
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  client_id      uuid references auth.users(id) on delete set null,
  client_name    text not null default 'Cliente',
  client_email   text not null default '',
  items          jsonb not null default '[]',
  total          numeric(10,2) not null default 0,
  delivery_address text not null default '',
  status         text not null default 'pending'
                 check (status in ('pending','preparing','ready','delivered','cancelled')),
  notes          text not null default '',
  created_at     timestamptz not null default now()
);

alter table public.orders enable row level security;

-- Cliente pode criar pedido
create policy "Cliente cria pedido"
  on public.orders for insert
  with check (auth.uid() = client_id);

-- Cliente vê seus próprios pedidos
create policy "Cliente vê seus pedidos"
  on public.orders for select
  using (auth.uid() = client_id);

-- Dono do restaurante vê pedidos do seu restaurante
create policy "Restaurante vê seus pedidos"
  on public.orders for select
  using (
    auth.uid() = (select owner_id from public.restaurants where id = restaurant_id)
  );

-- Dono atualiza status dos pedidos
create policy "Restaurante atualiza status"
  on public.orders for update
  using (
    auth.uid() = (select owner_id from public.restaurants where id = restaurant_id)
  );

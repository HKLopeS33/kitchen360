-- Garante, no nível do banco, que apenas contas com perfil "client"
-- consigam criar pedidos (mesmo que alguém tente burlar a interface).
-- Donos de estabelecimento (restaurant_owner) não podem realizar pedidos/pagamentos.

drop policy if exists "Cliente cria pedido" on public.orders;

create policy "Cliente cria pedido"
  on public.orders for insert
  with check (
    auth.uid() = client_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'client'
    )
  );

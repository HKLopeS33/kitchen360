-- Adiciona endereço ao perfil do cliente, para preencher
-- automaticamente o endereço de entrega ao fazer pedidos
alter table public.profiles
  add column if not exists address text not null default '';

-- Atualiza o trigger de criação de perfil para também salvar o endereço
-- informado no cadastro (vindo de raw_user_meta_data->>'address')
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, address)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'Usuário'),
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    coalesce(new.raw_user_meta_data->>'address', '')
  );
  return new;
end;
$$;

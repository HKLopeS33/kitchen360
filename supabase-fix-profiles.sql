-- Trigger que cria o perfil automaticamente quando um usuário se registra
-- O nome e role vêm dos metadados passados no signUp

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'Usuário'),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$;

-- Remove trigger se já existir e recria
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Remove a policy de insert manual (o trigger já cuida disso)
drop policy if exists "Inserir perfil próprio" on public.profiles;

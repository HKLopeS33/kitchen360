-- =====================================================================
-- CORREÇÃO: as políticas de admin criadas em supabase-subscriptions.sql
-- causam RECURSÃO INFINITA (a policy de "profiles" consulta "profiles"
-- para checar o papel do usuário, disparando a si mesma de novo — o
-- Postgres responde com erro 500 em qualquer SELECT na tabela).
--
-- A correção é checar o papel do usuário através de uma função
-- "security definer", que ignora RLS internamente e não recursiona.
-- Rode este arquivo INTEIRO no SQL Editor do Supabase.
-- =====================================================================

-- 1) Função auxiliar que verifica se o usuário logado é admin,
--    sem acionar as políticas de RLS de "profiles" (evita recursão).
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- 2) Recria as políticas problemáticas usando a função is_admin().
drop policy if exists "profiles_admin_select_all" on profiles;
create policy "profiles_admin_select_all" on profiles
  for select using (is_admin());

drop policy if exists "restaurants_admin_select_all" on restaurants;
create policy "restaurants_admin_select_all" on restaurants
  for select using (is_admin());

drop policy if exists "restaurants_admin_update_all" on restaurants;
create policy "restaurants_admin_update_all" on restaurants
  for update using (is_admin()) with check (is_admin());

drop policy if exists "app_settings_admin_write" on app_settings;
create policy "app_settings_admin_write" on app_settings
  for all using (is_admin()) with check (is_admin());

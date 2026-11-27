-- =====================================================================
-- MENSALIDADE + COMISSÃO POR PEDIDO (split do Mercado Pago)
-- Rode inteiro no SQL Editor. Pode rodar mais de uma vez.
--
-- O estabelecimento conecta a conta dele pelo botão "Conectar com Mercado
-- Pago" (OAuth). A partir daí, em cada pagamento o Mercado Pago separa
-- sozinho a comissão do app (application_fee) e manda o resto à loja.
-- =====================================================================

-- 1) Dados da conexão (só o servidor lê) ------------------------------
alter table public.restaurant_secrets add column if not exists mp_refresh_token   text;
alter table public.restaurant_secrets add column if not exists mp_user_id         text;
alter table public.restaurant_secrets add column if not exists mp_token_expires_at timestamptz;
alter table public.restaurant_secrets add column if not exists mp_connected_via   text not null default 'manual';

-- Situação pública (sem segredo): mostra "Conectado" no painel.
alter table public.restaurants add column if not exists mp_oauth_connected boolean not null default false;
alter table public.restaurants add column if not exists mp_connected_at    timestamptz;

-- "state" do OAuth: amarra o retorno do Mercado Pago a quem iniciou.
create table if not exists public.mp_oauth_states (
  state         text primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id       uuid not null,
  created_at    timestamptz not null default now()
);
alter table public.mp_oauth_states enable row level security;
revoke all on public.mp_oauth_states from anon, authenticated;

-- 2) Comissão registrada em cada pedido -------------------------------
alter table public.orders add column if not exists platform_fee numeric(10,2);

-- 3) Valores do plano -------------------------------------------------
insert into public.app_settings (key, value, updated_at) values ('monthly_fee', '49.00', now())
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.app_settings (key, value, updated_at) values ('commission_percent', '2.5', now())
on conflict (key) do nothing;

-- Mensalidade e comissão são públicas (aparecem na política e no cadastro).
drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all" on public.app_settings
  for select using (key in ('monthly_fee', 'commission_percent') or public.is_admin());

-- 4) Resumo de comissões para o admin ---------------------------------
create or replace function public.admin_commission_summary(p_from timestamptz, p_to timestamptz)
returns table (restaurant_id uuid, restaurant_name text, orders_count bigint, gross numeric, commission numeric)
language sql stable security definer set search_path = public
as $$
  select r.id, r.name, count(o.id), coalesce(sum(o.total), 0), coalesce(sum(o.platform_fee), 0)
  from public.orders o
  join public.restaurants r on r.id = o.restaurant_id
  where public.is_admin()
    and o.created_at >= p_from and o.created_at < p_to
    and o.status not in ('awaiting_payment', 'cancelled')
    and o.platform_fee is not null
  group by r.id, r.name
  order by 5 desc;
$$;
grant execute on function public.admin_commission_summary(timestamptz, timestamptz) to authenticated;

notify pgrst, 'reload schema';

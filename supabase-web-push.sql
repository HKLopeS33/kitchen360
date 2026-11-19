-- =====================================================================
-- NOTIFICAÇÃO NO CELULAR COM O APP FECHADO (Web Push) — rode inteiro no
-- SQL Editor. Pode rodar mais de uma vez.
--
-- 1) Guarda os aparelhos que ativaram as notificações.
-- 2) Toda notificação nova (pedido novo, status do pedido...) chama a
--    função "push", que entrega no celular mesmo com o app fechado.
-- =====================================================================

-- Necessário para o banco chamar a função (já vem no Supabase).
create extension if not exists pg_net with schema extensions;

-- 1) Aparelhos inscritos ------------------------------------------------
create table if not exists public.push_subscriptions (
  endpoint     text primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_own_select" on public.push_subscriptions;
create policy "push_own_select" on public.push_subscriptions
  for select using (user_id = auth.uid());

-- Grava/troca o aparelho para o usuário logado (um aparelho = um dono por vez).
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 then raise exception 'Endpoint inválido'; end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, user_agent)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql security definer set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;

-- 2) Disparo ------------------------------------------------------------
alter table public.notifications add column if not exists pushed_at timestamptz;

create or replace function public.notifications_send_push()
returns trigger
language plpgsql security definer set search_path = public, extensions
as $$
begin
  -- Só chama a função se o usuário tem algum aparelho inscrito.
  if exists (select 1 from public.push_subscriptions where user_id = new.user_id) then
    perform net.http_post(
      url     := 'https://lafrpypxfioqvtvilqbp.supabase.co/functions/v1/push',
      body    := jsonb_build_object('notification_id', new.id),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return new;
exception when others then
  -- Push nunca pode impedir a notificação (nem o pedido) de ser gravado.
  return new;
end;
$$;

drop trigger if exists trg_notifications_send_push on public.notifications;
create trigger trg_notifications_send_push
  after insert on public.notifications
  for each row execute function public.notifications_send_push();

notify pgrst, 'reload schema';

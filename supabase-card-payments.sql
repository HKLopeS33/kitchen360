-- =====================================================================
-- PAGAMENTO COM CARTÃO DENTRO DO APP — rode inteiro no SQL Editor.
-- Pode rodar mais de uma vez (idempotente).
--
-- O formulário de cartão do Mercado Pago precisa da Public Key da conta
-- que vai receber. Ela é pública por natureza (fica no navegador), então
-- pode ser lida pelo app — diferente do Access Token, que continua secreto.
-- =====================================================================

-- Public Key de cada estabelecimento (recebe os pedidos).
alter table public.restaurants add column if not exists mp_public_key text;

-- Public Key do admin (recebe as mensalidades) fica em app_settings e passa
-- a ser legível pelo app, junto com o valor da mensalidade.
drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all" on public.app_settings
  for select using (key in ('monthly_fee', 'admin_mp_public_key') or public.is_admin());

-- Adiciona colunas de pagamento na tabela orders
alter table public.orders
  add column if not exists payment_method  text not null default 'pix'
    check (payment_method in ('pix', 'credit_card', 'debit_card')),
  add column if not exists payment_status  text not null default 'pending',
  add column if not exists payment_id      text;

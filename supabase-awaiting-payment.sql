-- Adiciona o status "awaiting_payment": o pedido fica nesse estado
-- enquanto o cliente ainda não confirmou o pagamento no Mercado Pago.
-- O estabelecimento só passa a ver o pedido quando o pagamento é aprovado
-- (status muda para 'pending' via webhook do Mercado Pago).

alter table public.orders drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('awaiting_payment','pending','preparing','ready','delivered','cancelled'));

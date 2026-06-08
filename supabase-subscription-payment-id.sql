-- Salva o payment_id do último pagamento de assinatura aprovado
-- Evita que o mesmo pagamento seja processado duas vezes (idempotência no webhook)
alter table restaurants
  add column if not exists last_subscription_payment_id text;

-- Adiciona a coluna para o token de pagamento próprio de cada restaurante (Modelo 3: cada um recebe na própria conta MP)
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS mp_access_token text;

-- Observação: a leitura desse campo deve ser restrita ao próprio dono e ao backend (Edge Function com service role).
-- A política de SELECT pública de restaurants não deve expor esse campo — por isso, o ideal é nunca fazer
-- "select *" no client para listagem pública. Se a policy atual usa select *, podemos criar uma view pública
-- sem esse campo. Por enquanto, o campo só é preenchido/lido pelo próprio dono autenticado (RLS já garante
-- que owner_id = auth.uid() para update/select do próprio registro) e pela Edge Function via service role key.

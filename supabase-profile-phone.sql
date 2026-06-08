-- Adiciona campo de telefone/contato ao perfil do usuário (editável em "Meus dados")
alter table profiles
  add column if not exists phone text;

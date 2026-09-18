-- Vínculo técnico para autoria/auditoria; não cria senha ou sessão do sistema maior.
ALTER TABLE ca_admins ADD COLUMN IF NOT EXISTS host_subject VARCHAR(200);
ALTER TABLE ca_admins ADD COLUMN IF NOT EXISTS host_email VARCHAR(254);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ca_admins_host_subject
  ON ca_admins(host_subject) WHERE host_subject IS NOT NULL;
ALTER TABLE ca_atualizacoes ALTER COLUMN autor_nome TYPE VARCHAR(254);

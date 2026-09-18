-- A capa é opcional; posts existentes passam a usar a ilustração padrão.
ALTER TABLE ca_atualizacoes ADD COLUMN capa_imagem_id UUID
  REFERENCES ca_imagens(id) ON DELETE SET NULL;
CREATE INDEX ix_ca_posts_capa ON ca_atualizacoes(capa_imagem_id)
  WHERE capa_imagem_id IS NOT NULL;

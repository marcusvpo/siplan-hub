-- Não adivinhar o sistema de versões antigas sem vínculo inequívoco.
DO $$
BEGIN
  IF EXISTS (
    SELECT v.id FROM ca_versoes v
    LEFT JOIN ca_atualizacoes a ON a.versao_id = v.id
    LEFT JOIN ca_atualizacao_produto ap ON ap.atualizacao_id = a.id
    GROUP BY v.id HAVING COUNT(DISTINCT ap.produto_id) <> 1
  ) THEN
    RAISE EXCEPTION 'Há versões antigas sem sistema ou com múltiplos sistemas. Defina os vínculos antes da migração 003.';
  END IF;
END $$;

ALTER TABLE ca_versoes ADD COLUMN produto_id BIGINT REFERENCES ca_produtos(id) ON DELETE RESTRICT;
UPDATE ca_versoes v SET produto_id = (
  SELECT MIN(ap.produto_id) FROM ca_atualizacoes a
  JOIN ca_atualizacao_produto ap ON ap.atualizacao_id = a.id WHERE a.versao_id = v.id
);
ALTER TABLE ca_versoes ALTER COLUMN produto_id SET NOT NULL;
ALTER TABLE ca_versoes DROP CONSTRAINT ca_versoes_codigo_key;
ALTER TABLE ca_versoes ADD CONSTRAINT ca_versoes_sistema_codigo_key UNIQUE (produto_id, codigo);

ALTER TABLE ca_atualizacoes ADD COLUMN tipo VARCHAR(20);
UPDATE ca_atualizacoes a SET tipo = COALESCE((
  SELECT CASE WHEN i.tipo = 'descontinuado' THEN 'aviso' ELSE i.tipo END
  FROM ca_itens i WHERE i.atualizacao_id = a.id ORDER BY i.ordem, i.id LIMIT 1
), 'novidade');
ALTER TABLE ca_atualizacoes ALTER COLUMN tipo SET NOT NULL;
ALTER TABLE ca_atualizacoes ADD CONSTRAINT ca_post_tipo CHECK (tipo IN ('novidade','melhoria','correcao','aviso'));
ALTER TABLE ca_atualizacoes ADD COLUMN corpo_formato VARCHAR(4) NOT NULL DEFAULT 'text' CHECK (corpo_formato IN ('text','html'));
CREATE INDEX ix_ca_posts_tipo_versao ON ca_atualizacoes (versao_id, tipo, publicado_em DESC);

CREATE TABLE ca_imagens (
  id UUID PRIMARY KEY,
  admin_id BIGINT NOT NULL REFERENCES ca_admins(id),
  dados BYTEA NOT NULL,
  mime_type VARCHAR(30) NOT NULL CHECK (mime_type = 'image/webp'),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE ca_post_imagens (
  post_id BIGINT NOT NULL REFERENCES ca_atualizacoes(id) ON DELETE CASCADE,
  imagem_id UUID NOT NULL REFERENCES ca_imagens(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, imagem_id)
);
CREATE INDEX ix_ca_post_imagens_imagem ON ca_post_imagens(imagem_id);

CREATE TABLE ca_reacoes (
  post_id BIGINT NOT NULL REFERENCES ca_atualizacoes(id) ON DELETE CASCADE,
  visitante_token_hash CHAR(64) NOT NULL,
  tipo VARCHAR(7) NOT NULL CHECK (tipo IN ('like','dislike')),
  motivo VARCHAR(1000),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, visitante_token_hash),
  CHECK ((tipo='like' AND motivo IS NULL) OR
    (tipo='dislike' AND motivo IS NOT NULL AND length(trim(motivo)) BETWEEN 1 AND 1000))
);
CREATE INDEX ix_ca_reacoes_motivos ON ca_reacoes(post_id, atualizado_em DESC, visitante_token_hash)
  WHERE tipo='dislike';

-- Um evento por ação de compartilhamento concluída; o UUID torna retries idempotentes.
CREATE TABLE ca_compartilhamentos (
  evento_id UUID PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES ca_atualizacoes(id) ON DELETE CASCADE,
  visitante_token_hash CHAR(64) NOT NULL,
  canal VARCHAR(8) NOT NULL CHECK (canal IN ('copiar','nativo')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_ca_compartilhamentos_post ON ca_compartilhamentos(post_id);

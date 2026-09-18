CREATE TABLE IF NOT EXISTS ca_versoes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE CHECK (length(trim(codigo)) > 0),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ca_atualizacoes
  ADD COLUMN IF NOT EXISTS versao_id BIGINT;

INSERT INTO ca_versoes (codigo)
SELECT DISTINCT trim(versao)
  FROM ca_atualizacoes
 WHERE trim(versao) <> ''
ON CONFLICT (codigo) DO NOTHING;

UPDATE ca_atualizacoes a
   SET versao_id = v.id
  FROM ca_versoes v
 WHERE v.codigo = trim(a.versao)
   AND a.versao_id IS NULL;

ALTER TABLE ca_atualizacoes
  ALTER COLUMN versao_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ca_atualizacoes_versao_id_fkey'
      AND conrelid = 'ca_atualizacoes'::regclass
  ) THEN
    ALTER TABLE ca_atualizacoes
      ADD CONSTRAINT ca_atualizacoes_versao_id_fkey
      FOREIGN KEY (versao_id) REFERENCES ca_versoes(id) ON DELETE RESTRICT;
  END IF;
END $$;

DROP INDEX IF EXISTS ix_ca_atualizacoes_versao;
ALTER TABLE ca_atualizacoes DROP COLUMN IF EXISTS versao;

CREATE INDEX IF NOT EXISTS ix_ca_atualizacoes_versao_id
  ON ca_atualizacoes (versao_id, publicado_em DESC);

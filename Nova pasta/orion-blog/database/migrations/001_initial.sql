CREATE TABLE IF NOT EXISTS ca_produtos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  descricao VARCHAR(255),
  cor_hex CHAR(7) CHECK (cor_hex IS NULL OR cor_hex ~ '^#[0-9A-Fa-f]{6}$'),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem SMALLINT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ca_admins (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ca_atualizacoes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL CHECK (length(trim(titulo)) > 0),
  slug VARCHAR(220) NOT NULL UNIQUE,
  versao VARCHAR(30) NOT NULL CHECK (length(trim(versao)) > 0),
  resumo VARCHAR(400),
  corpo TEXT,
  destaque BOOLEAN NOT NULL DEFAULT FALSE,
  critico BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(12) NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'agendado', 'publicado', 'arquivado')),
  publicado_em TIMESTAMPTZ,
  autor_id BIGINT REFERENCES ca_admins(id),
  autor_nome VARCHAR(150),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ca_atualizacoes_listagem
  ON ca_atualizacoes (status, publicado_em DESC);
CREATE INDEX IF NOT EXISTS ix_ca_atualizacoes_versao
  ON ca_atualizacoes (versao);

CREATE TABLE IF NOT EXISTS ca_atualizacao_produto (
  atualizacao_id BIGINT NOT NULL REFERENCES ca_atualizacoes(id) ON DELETE CASCADE,
  produto_id BIGINT NOT NULL REFERENCES ca_produtos(id) ON DELETE RESTRICT,
  PRIMARY KEY (atualizacao_id, produto_id)
);

CREATE TABLE IF NOT EXISTS ca_itens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  atualizacao_id BIGINT NOT NULL REFERENCES ca_atualizacoes(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'novidade'
    CHECK (tipo IN ('novidade', 'melhoria', 'correcao', 'aviso', 'descontinuado')),
  titulo VARCHAR(200) NOT NULL CHECK (length(trim(titulo)) > 0),
  descricao TEXT,
  modulo VARCHAR(120),
  ticket_ref VARCHAR(60),
  ordem SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_ca_itens_atualizacao
  ON ca_itens (atualizacao_id, ordem);

CREATE TABLE IF NOT EXISTS ca_anexos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  atualizacao_id BIGINT NOT NULL REFERENCES ca_atualizacoes(id) ON DELETE CASCADE,
  item_id BIGINT REFERENCES ca_itens(id) ON DELETE CASCADE,
  caminho VARCHAR(500) NOT NULL,
  nome_original VARCHAR(255),
  mime_type VARCHAR(100),
  tamanho_bytes BIGINT CHECK (tamanho_bytes IS NULL OR tamanho_bytes >= 0),
  legenda VARCHAR(255),
  ordem SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ca_passos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES ca_itens(id) ON DELETE CASCADE,
  ordem SMALLINT NOT NULL DEFAULT 0,
  texto TEXT NOT NULL CHECK (length(trim(texto)) > 0),
  anexo_id BIGINT REFERENCES ca_anexos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ca_leituras (
  visitante_token_hash CHAR(64) NOT NULL,
  atualizacao_id BIGINT NOT NULL REFERENCES ca_atualizacoes(id) ON DELETE CASCADE,
  lido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (visitante_token_hash, atualizacao_id)
);

CREATE INDEX IF NOT EXISTS ix_ca_leituras_atualizacao
  ON ca_leituras (atualizacao_id);

CREATE TABLE IF NOT EXISTS ca_admin_sessoes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id BIGINT NOT NULL REFERENCES ca_admins(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  csrf_token_hash CHAR(64) NOT NULL,
  expira_em TIMESTAMPTZ NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ca_admin_sessoes_expiracao
  ON ca_admin_sessoes (expira_em);

CREATE TABLE IF NOT EXISTS ca_auditoria (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id BIGINT REFERENCES ca_admins(id) ON DELETE SET NULL,
  acao VARCHAR(80) NOT NULL,
  entidade VARCHAR(80) NOT NULL,
  entidade_id BIGINT,
  ip INET,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ca_produtos (nome, slug, descricao, cor_hex, ordem)
VALUES
  ('OrionTN', 'oriontn', 'Tabelionato de Notas', '#1F6E5A', 1),
  ('OrionPRO', 'orionpro', 'Protesto', '#2C5A8A', 2),
  ('OrionREG', 'orionreg', 'Registro', '#7D3535', 3)
ON CONFLICT (slug) DO NOTHING;

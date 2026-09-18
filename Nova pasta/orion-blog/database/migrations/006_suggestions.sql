CREATE TABLE ca_sugestoes (
  id UUID PRIMARY KEY,
  nome VARCHAR(100) NOT NULL CHECK (length(btrim(nome)) > 0),
  cartorio VARCHAR(180) NOT NULL CHECK (length(btrim(cartorio)) > 0),
  sugestao TEXT NOT NULL CHECK (length(btrim(sugestao)) BETWEEN 1 AND 4000),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

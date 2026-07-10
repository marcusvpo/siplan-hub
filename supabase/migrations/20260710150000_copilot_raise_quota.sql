-- Migration: sobe a cota diaria padrao do Copiloto.
-- O copiloto passou a chamar a Messages API direto (Haiku), sem o overhead do
-- agente Claude Code, e a contabilizacao de tokens agora pondera cache_read.
-- Com isso o custo real por pergunta caiu muito; o teto de 50k era baixo demais.

ALTER TABLE public.copilot_access ALTER COLUMN daily_token_limit SET DEFAULT 200000;

-- Sobe quem ainda estava no default antigo (50000). Quem o admin ajustou a mao
-- (valor diferente de 50000) fica como esta.
UPDATE public.copilot_access
SET daily_token_limit = 200000
WHERE daily_token_limit = 50000;

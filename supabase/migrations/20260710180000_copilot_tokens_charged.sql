-- Migration: registra os tokens efetivamente COBRADOS na cota (ponderados).
-- Ate agora o painel somava tokens_in+tokens_out (bruto), que difere do que a
-- cota debita (cache_read pesa 0.1, cache_write 1.25). Esta coluna guarda o valor
-- cobrado por job para o painel e o custo por resposta baterem com a cota.

ALTER TABLE public.copilot_jobs ADD COLUMN IF NOT EXISTS tokens_charged INTEGER NOT NULL DEFAULT 0;

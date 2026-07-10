-- Migration: feedback do usuario (👍/👎) e sugestoes de follow-up por resposta.
-- - feedback: 1 (util), -1 (nao util), NULL (sem avaliacao). O usuario avalia a
--   propria resposta (a policy de UPDATE self ja existe).
-- - followups: perguntas de acompanhamento sugeridas pelo modelo (separadas por "|").

ALTER TABLE public.copilot_jobs ADD COLUMN IF NOT EXISTS feedback SMALLINT;
ALTER TABLE public.copilot_jobs ADD COLUMN IF NOT EXISTS followups TEXT;

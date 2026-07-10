-- Migration: escopo por pergunta + suporte a chat multi-turno.
-- - scope: filtro opcional do portfolio enviado ao modelo ('ativos' = so projetos
--   com alguma etapa nao concluida). Reduz ruido e tokens.
-- - indice por (user_id, created_at) para o worker montar o historico recente
--   (ultimas trocas) de forma barata no modo multi-turno.

ALTER TABLE public.copilot_jobs ADD COLUMN IF NOT EXISTS scope TEXT;

CREATE INDEX IF NOT EXISTS idx_copilot_jobs_user_created
  ON public.copilot_jobs(user_id, created_at DESC);

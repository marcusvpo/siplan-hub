-- Migration: cancelamento de jobs + RPC atomica para remover modelo disponivel
-- (aba 5 - Modelos Editor). Complementa a geracao automatica.

-- ---------------------------------------------------------------------------
-- 1. Cancelamento de jobs
--    - novo status 'cancelled'
--    - flag cancel_requested: o frontend liga; o worker checa durante a geracao
--      e mata o Claude se estiver ligada.
-- ---------------------------------------------------------------------------
ALTER TABLE public.model_generation_jobs
  DROP CONSTRAINT IF EXISTS model_generation_jobs_status_check;
ALTER TABLE public.model_generation_jobs
  ADD CONSTRAINT model_generation_jobs_status_check
  CHECK (status IN ('pending', 'processing', 'done', 'error', 'cancelled'));

ALTER TABLE public.model_generation_jobs
  ADD COLUMN IF NOT EXISTS cancel_requested BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 2. RPC: remove um modelo disponivel de modelos_editor_available_files de forma
--    atomica (por id), sem o frontend reescrever o array inteiro -> evita
--    sobrescrever modelos gerados pelo worker (lost-update).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_available_model(p_project_id UUID, p_file_id TEXT)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE public.projects
  SET modelos_editor_available_files = COALESCE((
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(COALESCE(modelos_editor_available_files, '[]'::jsonb)) AS elem
    WHERE elem->>'id' <> p_file_id
  ), '[]'::jsonb)
  WHERE id = p_project_id;
$$;

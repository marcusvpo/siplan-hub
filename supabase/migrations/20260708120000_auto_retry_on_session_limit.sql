-- Migration: retomada automatica quando o Claude bate o limite de sessao (tokens)
-- Quando a geracao falha por "limite de sessao/uso" (nao por bug), o worker nao marca
-- o job como 'error'. Em vez disso, devolve para a fila (status 'pending') com um
-- carimbo `retry_after` no futuro e SEM consumir tentativa. O claim so pega jobs
-- pendentes cujo `retry_after` ja passou -> o job fica "na fila" (nao vira erro
-- vermelho) e o worker o retenta sozinho assim que os tokens voltam.

-- 1. Coluna de agendamento da proxima tentativa (NULL = elegivel imediatamente)
ALTER TABLE public.model_generation_jobs ADD COLUMN IF NOT EXISTS retry_after TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.dtc_ai_jobs           ADD COLUMN IF NOT EXISTS retry_after TIMESTAMP WITH TIME ZONE;

-- 2. Claim de modelo passa a respeitar retry_after
CREATE OR REPLACE FUNCTION public.claim_model_generation_job(p_worker_id TEXT)
RETURNS public.model_generation_jobs
LANGUAGE plpgsql
AS $$
DECLARE
  v_job public.model_generation_jobs;
BEGIN
  UPDATE public.model_generation_jobs
  SET status = 'processing',
      worker_id = p_worker_id,
      started_at = NOW(),
      attempts = attempts + 1,
      retry_after = NULL
  WHERE id = (
    SELECT id
    FROM public.model_generation_jobs
    WHERE status = 'pending'
      AND (retry_after IS NULL OR retry_after <= NOW())
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING * INTO v_job;

  RETURN v_job; -- NULL se nao havia job elegivel
END;
$$;

-- 3. Claim de DTC (resumo/melhorar-texto) idem
CREATE OR REPLACE FUNCTION public.claim_dtc_ai_job(p_worker_id TEXT)
RETURNS public.dtc_ai_jobs
LANGUAGE plpgsql
AS $$
DECLARE
  v_job public.dtc_ai_jobs;
BEGIN
  UPDATE public.dtc_ai_jobs
  SET status = 'processing',
      worker_id = p_worker_id,
      started_at = NOW(),
      attempts = attempts + 1,
      retry_after = NULL
  WHERE id = (
    SELECT id
    FROM public.dtc_ai_jobs
    WHERE status = 'pending'
      AND (retry_after IS NULL OR retry_after <= NOW())
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING * INTO v_job;

  RETURN v_job; -- NULL se nao havia job elegivel
END;
$$;

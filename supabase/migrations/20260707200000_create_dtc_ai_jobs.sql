-- Migration: fila de geracao com IA das "Consideracoes finais" da Transicao (DTC)
-- O frontend (tela /implantadores/transicao, aba Relato Tecnico, item 6) insere um
-- job (status 'pending') ao clicar em "Gerar com IA". O mesmo worker da VM que gera
-- os modelos reivindica o job de forma atomica, le os campos pertinentes do DTC em
-- projects.customFields.dtc, roda a CLI do Claude Code para resumir o processo, e
-- devolve o texto em result_text. O frontend observa via Realtime, converte o texto
-- para Lexical e injeta no editor para o analista revisar antes de salvar.

CREATE TABLE IF NOT EXISTS public.dtc_ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  target_field TEXT NOT NULL DEFAULT 'finalConsiderations',
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'done', 'error', 'cancelled')) DEFAULT 'pending',
  result_text TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  requested_by TEXT,
  worker_id TEXT,
  cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
  progress TEXT,
  progress_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS (mesmo padrao do repo; o worker usa service_role e ignora RLS)
ALTER TABLE public.dtc_ai_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo em dtc_ai_jobs" ON public.dtc_ai_jobs
  FOR ALL USING (true) WITH CHECK (true);

-- Indices
CREATE INDEX IF NOT EXISTS idx_dtc_ai_jobs_project_id ON public.dtc_ai_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_dtc_ai_jobs_status ON public.dtc_ai_jobs(status);
CREATE INDEX IF NOT EXISTS idx_dtc_ai_jobs_pending ON public.dtc_ai_jobs(created_at) WHERE status = 'pending';

-- Trigger updated_at (funcao ja existe globalmente)
DROP TRIGGER IF EXISTS update_dtc_ai_jobs_updated_at ON public.dtc_ai_jobs;
CREATE TRIGGER update_dtc_ai_jobs_updated_at
  BEFORE UPDATE ON public.dtc_ai_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime: frontend observa status/progresso; worker observa INSERTs
ALTER PUBLICATION supabase_realtime ADD TABLE public.dtc_ai_jobs;

-- ---------------------------------------------------------------------------
-- RPC: claim atomico de um job pendente (garante um worker por job)
-- ---------------------------------------------------------------------------
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
      attempts = attempts + 1
  WHERE id = (
    SELECT id
    FROM public.dtc_ai_jobs
    WHERE status = 'pending'
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING * INTO v_job;

  RETURN v_job; -- NULL se nao havia job pendente
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: reaper - devolve jobs travados (worker morreu em processing) para a fila
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.requeue_stuck_dtc_ai_jobs(p_timeout_seconds INTEGER, p_max_attempts INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.dtc_ai_jobs
  SET status = 'pending',
      worker_id = NULL,
      started_at = NULL
  WHERE status = 'processing'
    AND started_at < NOW() - (p_timeout_seconds || ' seconds')::interval
    AND attempts < p_max_attempts;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.dtc_ai_jobs
  SET status = 'error',
      error_message = COALESCE(error_message, 'Excedeu o numero maximo de tentativas'),
      finished_at = NOW()
  WHERE status = 'processing'
    AND started_at < NOW() - (p_timeout_seconds || ' seconds')::interval
    AND attempts >= p_max_attempts;

  RETURN v_count;
END;
$$;

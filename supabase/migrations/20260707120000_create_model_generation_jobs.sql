-- Migration: fila de geracao automatica de modelos JSON (aba 5 - Modelos Editor)
-- O frontend insere um job (status 'pending') ao acionar a geracao. Um worker na VM
-- reivindica o job de forma atomica, roda a CLI do Claude Code, e devolve o JSON
-- fazendo append em projects.modelos_editor_available_files.

CREATE TABLE IF NOT EXISTS public.model_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_file_path TEXT NOT NULL,
  source_file_name TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('minutas', 'qualificacao_partes', 'qualificacao_imovel', 'clausulas')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'done', 'error')) DEFAULT 'pending',
  result_file_path TEXT,
  result_file_id UUID REFERENCES public.project_files(id) ON DELETE SET NULL,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  requested_by TEXT,
  worker_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.model_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Politica RLS (permitir tudo, mesmo padrao do repo; o worker usa service_role e ignora RLS)
CREATE POLICY "Permitir tudo em model_generation_jobs" ON public.model_generation_jobs
  FOR ALL USING (true) WITH CHECK (true);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_model_generation_jobs_project_id ON public.model_generation_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_model_generation_jobs_status ON public.model_generation_jobs(status);
-- Indice parcial para acelerar o claim de jobs pendentes
CREATE INDEX IF NOT EXISTS idx_model_generation_jobs_pending ON public.model_generation_jobs(created_at) WHERE status = 'pending';

-- Trigger para atualizar updated_at automaticamente (funcao ja existe globalmente)
DROP TRIGGER IF EXISTS update_model_generation_jobs_updated_at ON public.model_generation_jobs;
CREATE TRIGGER update_model_generation_jobs_updated_at
  BEFORE UPDATE ON public.model_generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime: o frontend observa mudancas de status; o worker observa INSERTs
ALTER PUBLICATION supabase_realtime ADD TABLE public.model_generation_jobs;

-- ---------------------------------------------------------------------------
-- RPC: claim atomico de um job pendente (garante um worker por job)
-- ---------------------------------------------------------------------------
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
      attempts = attempts + 1
  WHERE id = (
    SELECT id
    FROM public.model_generation_jobs
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
-- RPC: append atomico de um AttachedFile em modelos_editor_available_files
-- Evita o read-modify-write do worker (e reduz risco de lost-update).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_available_model(p_project_id UUID, p_file JSONB)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.projects
  SET modelos_editor_available_files =
        COALESCE(modelos_editor_available_files, '[]'::jsonb) || jsonb_build_array(p_file)
  WHERE id = p_project_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: reaper - devolve jobs travados (worker morreu em processing) para a fila
-- Chamado periodicamente pelo worker. Respeita MAX_ATTEMPTS.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.requeue_stuck_model_jobs(p_timeout_seconds INTEGER, p_max_attempts INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Jobs presos em processing alem do timeout: volta para pending se ainda ha tentativas
  UPDATE public.model_generation_jobs
  SET status = 'pending',
      worker_id = NULL,
      started_at = NULL
  WHERE status = 'processing'
    AND started_at < NOW() - (p_timeout_seconds || ' seconds')::interval
    AND attempts < p_max_attempts;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Excedeu tentativas: marca erro definitivo
  UPDATE public.model_generation_jobs
  SET status = 'error',
      error_message = COALESCE(error_message, 'Excedeu o numero maximo de tentativas'),
      finished_at = NOW()
  WHERE status = 'processing'
    AND started_at < NOW() - (p_timeout_seconds || ' seconds')::interval
    AND attempts >= p_max_attempts;

  RETURN v_count;
END;
$$;

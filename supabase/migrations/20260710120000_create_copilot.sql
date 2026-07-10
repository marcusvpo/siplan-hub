-- Migration: Copiloto Operacional (chat com IA sobre o portfolio de projetos)
-- ---------------------------------------------------------------------------
-- Um usuario habilitado faz uma pergunta em linguagem natural sobre os projetos
-- (ex.: "quais cartorios travados na conversao?"). O frontend insere um job
-- (status 'pending') em copilot_jobs; o mesmo worker da VM que gera modelos e
-- resumos reivindica o job de forma atomica, monta um contexto compacto com as
-- etapas dos projetos (retrieval ESTRUTURADO, sem embeddings), roda o Claude
-- headless e devolve a resposta em result_text. O frontend observa via Realtime.
--
-- Controle de custo/token:
--   - copilot_access: gate POR USUARIO (enabled) + cota diaria de tokens.
--     O admin liga/desliga e define o teto por pessoa na tela do Painel Admin.
--   - A cota e checada na hora do INSERT (RLS) e reforcada no worker; o consumo
--     real e contabilizado apos cada resposta (add_copilot_tokens) e zera por dia.

-- ===========================================================================
-- 1. copilot_access - gate + cota por usuario
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.copilot_access (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  -- Teto de tokens (entrada + saida) por dia. 0 = ilimitado.
  daily_token_limit INTEGER NOT NULL DEFAULT 50000,
  tokens_used_today INTEGER NOT NULL DEFAULT 0,
  -- Dia de referencia da contagem; quando fica no passado, a contagem zera.
  period_reset_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.copilot_access ENABLE ROW LEVEL SECURITY;

-- O usuario ve a propria cota; o admin ve/gerencia todas.
CREATE POLICY "copilot_access self select" ON public.copilot_access
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "copilot_access admin manage" ON public.copilot_access
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP TRIGGER IF EXISTS update_copilot_access_updated_at ON public.copilot_access;
CREATE TRIGGER update_copilot_access_updated_at
  BEFORE UPDATE ON public.copilot_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================================================
-- 2. copilot_jobs - fila de perguntas (clone do padrao dtc_ai_jobs)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.copilot_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'done', 'error', 'cancelled')) DEFAULT 'pending',
  result_text TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  worker_id TEXT,
  cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
  progress TEXT,
  progress_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress_updated_at TIMESTAMP WITH TIME ZONE,
  retry_after TIMESTAMP WITH TIME ZONE,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.copilot_jobs ENABLE ROW LEVEL SECURITY;

-- O usuario ve/atualiza (cancela) apenas os proprios jobs; o admin ve todos.
CREATE POLICY "copilot_jobs self select" ON public.copilot_jobs
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- INSERT so e permitido se o usuario estiver habilitado E dentro da cota diaria.
-- (a cota "zera" quando period_reset_at ficou num dia anterior)
CREATE POLICY "copilot_jobs gated insert" ON public.copilot_jobs
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.copilot_access a
      WHERE a.user_id = auth.uid()
        AND a.enabled = TRUE
        AND (
          a.daily_token_limit = 0
          OR a.period_reset_at < CURRENT_DATE
          OR a.tokens_used_today < a.daily_token_limit
        )
    )
  );

CREATE POLICY "copilot_jobs self update" ON public.copilot_jobs
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_copilot_jobs_user_id ON public.copilot_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_copilot_jobs_status ON public.copilot_jobs(status);
CREATE INDEX IF NOT EXISTS idx_copilot_jobs_pending ON public.copilot_jobs(created_at) WHERE status = 'pending';

DROP TRIGGER IF EXISTS update_copilot_jobs_updated_at ON public.copilot_jobs;
CREATE TRIGGER update_copilot_jobs_updated_at
  BEFORE UPDATE ON public.copilot_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.copilot_jobs;

-- ===========================================================================
-- 3. RPC: claim atomico (respeita retry_after, igual model/dtc)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.claim_copilot_job(p_worker_id TEXT)
RETURNS public.copilot_jobs
LANGUAGE plpgsql
AS $$
DECLARE
  v_job public.copilot_jobs;
BEGIN
  UPDATE public.copilot_jobs
  SET status = 'processing',
      worker_id = p_worker_id,
      started_at = NOW(),
      attempts = attempts + 1,
      retry_after = NULL
  WHERE id = (
    SELECT id
    FROM public.copilot_jobs
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

-- ===========================================================================
-- 4. RPC: reaper - devolve jobs travados para a fila
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.requeue_stuck_copilot_jobs(p_timeout_seconds INTEGER, p_max_attempts INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.copilot_jobs
  SET status = 'pending',
      worker_id = NULL,
      started_at = NULL
  WHERE status = 'processing'
    AND started_at < NOW() - (p_timeout_seconds || ' seconds')::interval
    AND attempts < p_max_attempts;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.copilot_jobs
  SET status = 'error',
      error_message = COALESCE(error_message, 'Excedeu o numero maximo de tentativas'),
      finished_at = NOW()
  WHERE status = 'processing'
    AND started_at < NOW() - (p_timeout_seconds || ' seconds')::interval
    AND attempts >= p_max_attempts;

  RETURN v_count;
END;
$$;

-- ===========================================================================
-- 5. RPC: contabiliza tokens consumidos (chamada pelo worker apos cada resposta)
--    Zera a contagem quando o dia de referencia ja passou.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.add_copilot_tokens(p_user_id UUID, p_tokens INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.copilot_access
  SET tokens_used_today = CASE
        WHEN period_reset_at < CURRENT_DATE THEN GREATEST(0, p_tokens)
        ELSE tokens_used_today + GREATEST(0, p_tokens)
      END,
      period_reset_at = CURRENT_DATE
  WHERE user_id = p_user_id;
END;
$$;

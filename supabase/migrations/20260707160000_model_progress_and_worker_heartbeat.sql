-- Migration: andamento ao vivo dos jobs de geracao + heartbeat do worker
-- (aba 5 - Modelos Editor). Permite mostrar na tela o que o Claude esta fazendo
-- na VM (feed de passos) e se o worker esta online/offline.

-- ---------------------------------------------------------------------------
-- 1. Colunas de progresso no job
--    - progress: texto do passo atual (ex: "Executando comando: python ...")
--    - progress_log: historico dos ultimos passos (array JSON de {at,text,kind})
--    - progress_updated_at: quando o worker escreveu progresso pela ultima vez
-- ---------------------------------------------------------------------------
ALTER TABLE public.model_generation_jobs
  ADD COLUMN IF NOT EXISTS progress TEXT,
  ADD COLUMN IF NOT EXISTS progress_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS progress_updated_at TIMESTAMP WITH TIME ZONE;

-- ---------------------------------------------------------------------------
-- 2. Heartbeat do worker (uma linha por worker_id).
--    O worker faz upsert periodico; o frontend le para mostrar online/offline.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.model_worker_heartbeat (
  worker_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'busy', 'stopping')),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  note TEXT
);

ALTER TABLE public.model_worker_heartbeat ENABLE ROW LEVEL SECURITY;

-- Leitura liberada (nao e dado sensivel); o worker escreve com a secret key (ignora RLS).
DROP POLICY IF EXISTS "Leitura do heartbeat do worker" ON public.model_worker_heartbeat;
CREATE POLICY "Leitura do heartbeat do worker" ON public.model_worker_heartbeat
  FOR SELECT USING (true);

-- Realtime: o selo online/offline e o feed de andamento atualizam sozinhos.
-- (model_generation_jobs ja esta na publicacao; aqui adicionamos o heartbeat.)
ALTER PUBLICATION supabase_realtime ADD TABLE public.model_worker_heartbeat;

-- Migration: estende a fila dtc_ai_jobs para um segundo tipo de job.
-- Alem do 'dtc_summary' (Consideracoes finais da Transicao), passamos a suportar
-- 'improve_text': o botao "Melhorar texto com IA" nas Observacoes & Detalhes da
-- etapa 7 (Pos-Implantacao) na tela de projetos. O frontend enfileira o texto do
-- bloco em input_text; o mesmo worker da VM roda o Claude para reescrever e devolve
-- o texto melhorado em result_text. Jobs antigos/DTC continuam como 'dtc_summary'.

ALTER TABLE public.dtc_ai_jobs
  ADD COLUMN IF NOT EXISTS job_type TEXT NOT NULL DEFAULT 'dtc_summary',
  ADD COLUMN IF NOT EXISTS input_text TEXT;

-- Restringe aos tipos conhecidos (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dtc_ai_jobs_job_type_check'
  ) THEN
    ALTER TABLE public.dtc_ai_jobs
      ADD CONSTRAINT dtc_ai_jobs_job_type_check
      CHECK (job_type IN ('dtc_summary', 'improve_text'));
  END IF;
END$$;

-- O claim atomico (claim_dtc_ai_job) retorna a linha inteira (RETURNS public.dtc_ai_jobs),
-- entao as novas colunas ja acompanham o job reivindicado - sem alteracao na RPC.

-- Migration: adiciona um terceiro tipo de job na fila dtc_ai_jobs.
-- 'summary_blocks': o botao "Gerar resumo com IA" do modulo "Resumo Geral" da etapa 7
-- (Pos-Implantacao). O frontend junta o texto de todos os blocos de Observacoes &
-- Detalhes em input_text; o worker roda o Claude e devolve um resumo rico e
-- estruturado em result_text. Estende o CHECK de job_type (idempotente).

ALTER TABLE public.dtc_ai_jobs DROP CONSTRAINT IF EXISTS dtc_ai_jobs_job_type_check;
ALTER TABLE public.dtc_ai_jobs
  ADD CONSTRAINT dtc_ai_jobs_job_type_check
  CHECK (job_type IN ('dtc_summary', 'improve_text', 'summary_blocks'));

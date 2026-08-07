-- Habilita a aba "Analise de chamados IA" a reutilizar a fila de texto da VM.
-- Cada job continua isolado por requested_by e target_field (chave dos filtros).

alter table public.dtc_ai_jobs
  drop constraint if exists dtc_ai_jobs_job_type_check;

alter table public.dtc_ai_jobs
  add constraint dtc_ai_jobs_job_type_check
  check (job_type = any (array[
    'dtc_summary'::text,
    'improve_text'::text,
    'summary_blocks'::text,
    'voice_note'::text,
    'pos_parecer'::text,
    'panorama_parecer'::text,
    'tickets_analysis'::text
  ]));

create index if not exists idx_dtc_ai_jobs_tickets_analysis
  on public.dtc_ai_jobs (requested_by, target_field, created_at desc)
  where job_type = 'tickets_analysis';

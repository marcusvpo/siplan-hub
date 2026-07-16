-- Adiciona 'pos_parecer' aos job_type validos de dtc_ai_jobs.
-- E o job do botao "Gerar parecer" da aba Analise Pos-Implantacao: o front
-- envia um JSON com os chamados do periodo em input_text e o worker devolve o
-- parecer qualitativo em result_text (mesmo pipeline de texto do improve/summary).

alter table public.dtc_ai_jobs drop constraint if exists dtc_ai_jobs_job_type_check;
alter table public.dtc_ai_jobs add constraint dtc_ai_jobs_job_type_check
  check (job_type = any (array[
    'dtc_summary'::text,
    'improve_text'::text,
    'summary_blocks'::text,
    'voice_note'::text,
    'pos_parecer'::text
  ]));

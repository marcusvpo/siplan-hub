-- Adiciona os tipos de modelo Traslado (601) e Livro (603) ao CHECK de model_type,
-- alem dos ja existentes (minutas, qualificacoes, clausulas).

ALTER TABLE public.model_generation_jobs
  DROP CONSTRAINT IF EXISTS model_generation_jobs_model_type_check;

ALTER TABLE public.model_generation_jobs
  ADD CONSTRAINT model_generation_jobs_model_type_check
  CHECK (model_type IN (
    'minutas',
    'traslado',
    'livro',
    'qualificacao_partes',
    'qualificacao_imovel',
    'clausulas'
  ));

-- Inclui a classificação genérica para motores e ferramentas sem especialidade específica.

ALTER TABLE public.conversion_engines
  DROP CONSTRAINT IF EXISTS conversion_engines_specialty_check,
  ADD CONSTRAINT conversion_engines_specialty_check
    CHECK (specialty IS NULL OR specialty IN ('tn_rc', 'protest', 'ri_td', 'other'));

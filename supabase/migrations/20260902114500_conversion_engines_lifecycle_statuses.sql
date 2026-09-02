-- Separa o ciclo de vida dos motores dos status operacionais dos projetos.

ALTER TABLE public.conversion_engines
  DROP CONSTRAINT IF EXISTS conversion_engines_status_check;

UPDATE public.conversion_engines
SET status = CASE
  WHEN status IN ('engine_ready', 'finished') THEN 'finished'
  WHEN status = 'maintenance' THEN 'maintenance'
  ELSE 'in_development'
END
WHERE status NOT IN ('in_development', 'maintenance', 'finished');

ALTER TABLE public.conversion_engines
  ALTER COLUMN status SET DEFAULT 'in_development',
  ADD CONSTRAINT conversion_engines_status_check
    CHECK (status IN ('in_development', 'maintenance', 'finished'));

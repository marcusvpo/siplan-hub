-- Migration: 20261016181500_seed_implantador_vacations_2026.sql
-- Seed idempotente dos 3 períodos de férias do cronograma de implantações 2026/2027:
--   1. Julio Araujo   (implantador_id = 'julio-araujo')   : 2026-12-21 a 2027-01-04
--   2. Rodrigo Brites (implantador_id = 'rodrigo-brites') : 2026-11-16 a 2026-11-30
--   3. Ricardo Vieira (implantador_id = 'ricardo-vieira') : 2026-12-21 a 2027-01-04

-- Garantir estrutura base caso o banco esteja sendo inicializado do zero
CREATE TABLE IF NOT EXISTS public.implantador_vacations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  implantador_name TEXT NOT NULL,
  implantador_id TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.implantador_vacations ENABLE ROW LEVEL SECURITY;

-- 1. Julio Araujo: 21/12/2026 a 04/01/2027
INSERT INTO public.implantador_vacations (
  implantador_name,
  implantador_id,
  start_date,
  end_date,
  description
)
SELECT
  'Julio Araujo',
  'julio-araujo',
  DATE '2026-12-21',
  DATE '2027-01-04',
  'Férias programadas (21/12 a 04/01)'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.implantador_vacations v
  WHERE (v.implantador_id = 'julio-araujo' OR v.implantador_name ILIKE '%Julio%Araujo%')
    AND v.start_date = DATE '2026-12-21'
    AND v.end_date = DATE '2027-01-04'
);

UPDATE public.implantador_vacations
SET
  implantador_name = 'Julio Araujo',
  implantador_id = 'julio-araujo',
  updated_at = timezone('utc'::text, now())
WHERE (implantador_id IS DISTINCT FROM 'julio-araujo' OR implantador_name IS DISTINCT FROM 'Julio Araujo')
  AND (implantador_id = 'julio-araujo' OR implantador_name ILIKE '%Julio%Araujo%')
  AND start_date = DATE '2026-12-21'
  AND end_date = DATE '2027-01-04';

-- 2. Rodrigo Brites: 16/11/2026 a 30/11/2026
INSERT INTO public.implantador_vacations (
  implantador_name,
  implantador_id,
  start_date,
  end_date,
  description
)
SELECT
  'Rodrigo Brites',
  'rodrigo-brites',
  DATE '2026-11-16',
  DATE '2026-11-30',
  'FÉRIAS RODRIGO BRITES - 16/11 A 30/11'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.implantador_vacations v
  WHERE (v.implantador_id = 'rodrigo-brites' OR v.implantador_name ILIKE '%Rodrigo%Brites%')
    AND v.start_date = DATE '2026-11-16'
    AND v.end_date = DATE '2026-11-30'
);

UPDATE public.implantador_vacations
SET
  implantador_name = 'Rodrigo Brites',
  implantador_id = 'rodrigo-brites',
  updated_at = timezone('utc'::text, now())
WHERE (implantador_id IS DISTINCT FROM 'rodrigo-brites' OR implantador_name IS DISTINCT FROM 'Rodrigo Brites')
  AND (implantador_id = 'rodrigo-brites' OR implantador_name ILIKE '%Rodrigo%Brites%')
  AND start_date = DATE '2026-11-16'
  AND end_date = DATE '2026-11-30';

-- 3. Ricardo Vieira: 21/12/2026 a 04/01/2027
INSERT INTO public.implantador_vacations (
  implantador_name,
  implantador_id,
  start_date,
  end_date,
  description
)
SELECT
  'Ricardo Vieira',
  'ricardo-vieira',
  DATE '2026-12-21',
  DATE '2027-01-04',
  'FÉRIAS VIEIRA 21/12 a 04/01'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.implantador_vacations v
  WHERE (v.implantador_id = 'ricardo-vieira' OR v.implantador_name ILIKE '%Ricardo%Vieira%')
    AND v.start_date = DATE '2026-12-21'
    AND v.end_date = DATE '2027-01-04'
);

UPDATE public.implantador_vacations
SET
  implantador_name = 'Ricardo Vieira',
  implantador_id = 'ricardo-vieira',
  updated_at = timezone('utc'::text, now())
WHERE (implantador_id IS DISTINCT FROM 'ricardo-vieira' OR implantador_name IS DISTINCT FROM 'Ricardo Vieira')
  AND (implantador_id = 'ricardo-vieira' OR implantador_name ILIKE '%Ricardo%Vieira%')
  AND start_date = DATE '2026-12-21'
  AND end_date = DATE '2027-01-04';

-- Adicionar coluna work_hours na tabela projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS work_hours numeric;

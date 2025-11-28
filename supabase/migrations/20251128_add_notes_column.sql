-- Add the missing 'notes' column to the projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS notes JSONB;

-- Notify PostgREST to reload the schema cache (usually automatic, but good to know)
NOTIFY pgrst, 'reload config';

-- Update existing 'todo' statuses to 'in-progress'
UPDATE public.projects SET global_status = 'in-progress' WHERE global_status = 'todo';

-- Alter default value of global_status to 'in-progress'
ALTER TABLE public.projects ALTER COLUMN global_status SET DEFAULT 'in-progress';

-- Create a trigger function to coerce any incoming 'todo' status to 'in-progress'
CREATE OR REPLACE FUNCTION public.coerce_project_global_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.global_status IS NULL OR NEW.global_status = 'todo' THEN
    NEW.global_status := 'in-progress';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate it
DROP TRIGGER IF EXISTS trigger_coerce_global_status ON public.projects;
CREATE TRIGGER trigger_coerce_global_status
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.coerce_project_global_status();

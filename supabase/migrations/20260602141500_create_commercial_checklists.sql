-- Create commercial_checklists table
CREATE TABLE IF NOT EXISTS public.commercial_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    created_by UUID REFERENCES auth.users(id),
    created_by_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted')),
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commercial_checklists ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read for all on commercial_checklists"
    ON public.commercial_checklists FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated on commercial_checklists"
    ON public.commercial_checklists FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated/pending on commercial_checklists"
    ON public.commercial_checklists FOR UPDATE USING (
        auth.role() = 'authenticated' OR status = 'pending'
    );

CREATE POLICY "Enable delete for authenticated on commercial_checklists"
    ON public.commercial_checklists FOR DELETE TO authenticated USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_commercial_checklists_project_id ON public.commercial_checklists(project_id);

-- Trigger to update updated_at
CREATE TRIGGER update_commercial_checklists_updated_at
BEFORE UPDATE ON public.commercial_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

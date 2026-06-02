-- Add template_id to commercial_checklists
ALTER TABLE public.commercial_checklists 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.form_templates(id);

-- Public RLS Policies for Commercial Checklists client view
-- 1. Allow public select on projects linked to checklists or roadmaps
CREATE POLICY "Allow public select for active commercial checklists and roadmaps" 
ON public.projects 
FOR SELECT 
TO public 
USING (
  EXISTS (SELECT 1 FROM public.commercial_checklists WHERE project_id = projects.id)
  OR 
  EXISTS (SELECT 1 FROM public.roadmaps WHERE project_id = projects.id)
);

-- 2. Allow public select on form_templates of kind 'commercial_checklist'
CREATE POLICY "Allow public select for commercial checklist templates" 
ON public.form_templates 
FOR SELECT 
TO public 
USING (kind = 'commercial_checklist');

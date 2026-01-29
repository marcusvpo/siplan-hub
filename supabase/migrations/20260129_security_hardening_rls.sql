-- Migration: Tighten RLS Policies (Security Hardening)
-- Author: Security Bot
-- Date: 2026-01-29

-- 1. Tighten 'projects' table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em projetos" ON public.projects;

CREATE POLICY "Authenticated users can view projects" 
ON public.projects FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert projects" 
ON public.projects FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects" 
ON public.projects FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete projects" 
ON public.projects FOR DELETE 
TO authenticated 
USING (true);

-- 2. Tighten 'timeline_events' table
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em timeline_events" ON public.timeline_events;

CREATE POLICY "Authenticated users can view timeline" 
ON public.timeline_events FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert timeline" 
ON public.timeline_events FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 3. Tighten 'project_files' table
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em project_files" ON public.project_files;

CREATE POLICY "Authenticated users can view files" 
ON public.project_files FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can upload files" 
ON public.project_files FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete files" 
ON public.project_files FOR DELETE 
TO authenticated 
USING (true);

-- 4. Tighten 'saved_filters' table
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em saved_filters" ON public.saved_filters;

CREATE POLICY "Users can manage their own filters" 
ON public.saved_filters FOR ALL 
TO authenticated 
USING (created_by = auth.uid()::text OR is_public = true)
WITH CHECK (created_by = auth.uid()::text); 

-- 5. Tighten 'project_checklist' table
ALTER TABLE public.project_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em project_checklist" ON public.project_checklist;

CREATE POLICY "Authenticated users can manage checklists" 
ON public.project_checklist FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

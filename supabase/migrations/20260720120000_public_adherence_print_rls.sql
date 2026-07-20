-- Migration: Public RLS Policies for Adherence Form PDF / Print View
-- Author: Siplan HUB Team
-- Date: 2026-07-20

-- 1. Allow public select on projects table for reading project details in public adherence view
DROP POLICY IF EXISTS "Allow public select for adherence print on projects" ON public.projects;
CREATE POLICY "Allow public select for adherence print on projects" 
ON public.projects 
FOR SELECT 
TO public 
USING (true);

-- 2. Allow public select on project_form_responses for adherence forms
DROP POLICY IF EXISTS "Allow public select for adherence print on project_form_responses" ON public.project_form_responses;
CREATE POLICY "Allow public select for adherence print on project_form_responses" 
ON public.project_form_responses 
FOR SELECT 
TO public 
USING (stage = 'adherence');

-- 3. Allow public select on form_templates for adherence stage
DROP POLICY IF EXISTS "Allow public select for adherence print on form_templates" ON public.form_templates;
CREATE POLICY "Allow public select for adherence print on form_templates" 
ON public.form_templates 
FOR SELECT 
TO public 
USING (stage = 'adherence');

-- 4. Allow public select on project_tramites for projects
DROP POLICY IF EXISTS "Allow public select for adherence print on project_tramites" ON public.project_tramites;
CREATE POLICY "Allow public select for adherence print on project_tramites" 
ON public.project_tramites 
FOR SELECT 
TO public 
USING (true);

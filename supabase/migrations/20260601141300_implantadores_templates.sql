-- Create helper function has_permission
CREATE OR REPLACE FUNCTION public.has_permission(user_id UUID, req_resource TEXT, req_action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  has_perm BOOLEAN;
BEGIN
  -- Get user's role from profiles
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  
  -- Admins bypass permission checks
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check if permission exists for user's role
  SELECT EXISTS (
    SELECT 1 
    FROM public.app_role_permissions arp
    JOIN public.app_roles ar ON ar.id = arp.role_id
    JOIN public.app_permissions ap ON ap.id = arp.permission_id
    WHERE ar.name = user_role 
      AND ap.resource = req_resource 
      AND ap.action = req_action
  ) INTO has_perm;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create public.form_templates table
CREATE TABLE IF NOT EXISTS public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('adherence','homologation_checklist')),
  system_type TEXT NOT NULL, -- 'Orion TN' | 'Orion PRO' | 'Orion REG' | 'WebRI' | ...
  version INT NOT NULL,
  schema_json JSONB NOT NULL, -- JSON Schema do form (perguntas, tipos, condicionais)
  ui_json JSONB, -- layout (uiSchema do RJSF)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE (kind, system_type, version)
);

CREATE INDEX IF NOT EXISTS idx_form_templates_kind_system_type_active ON public.form_templates (kind, system_type, is_active);

-- Create public.project_form_responses table
CREATE TABLE IF NOT EXISTS public.project_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.form_templates(id),
  stage TEXT NOT NULL, -- 'adherence' | 'conversion' (homologation)
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved')),
  filled_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_form_responses_project_id_stage ON public.project_form_responses (project_id, stage);

-- Enable RLS
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_form_responses ENABLE ROW LEVEL SECURITY;

-- Policies for public.form_templates
DROP POLICY IF EXISTS ft_read ON public.form_templates;
CREATE POLICY ft_read ON public.form_templates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ft_write ON public.form_templates;
CREATE POLICY ft_write ON public.form_templates FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), 'templates', 'manage'))
WITH CHECK (public.has_permission(auth.uid(), 'templates', 'manage'));

-- Policies for public.project_form_responses
DROP POLICY IF EXISTS pfr_read ON public.project_form_responses;
CREATE POLICY pfr_read ON public.project_form_responses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS pfr_write ON public.project_form_responses;
CREATE POLICY pfr_write ON public.project_form_responses FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Seed new permissions
INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('menu_implantadores', 'view', 'Acesso ao menu de Implantadores'),
  ('templates', 'manage', 'Gerenciar templates de formulários')
ON CONFLICT (resource, action) DO NOTHING;

-- Link new permissions to admin role
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.app_roles r, public.app_permissions p
WHERE r.name = 'admin' 
  AND p.resource IN ('menu_implantadores', 'templates')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Trigger to automatically update updated_at on responses
DROP TRIGGER IF EXISTS update_project_form_responses_updated_at ON public.project_form_responses;
CREATE TRIGGER update_project_form_responses_updated_at
BEFORE UPDATE ON public.project_form_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function and trigger to sync response status with projects table
CREATE OR REPLACE FUNCTION public.sync_project_form_response_status()
RETURNS TRIGGER AS $$
DECLARE
  stage_status TEXT;
  analysis_complete BOOLEAN;
  target_project_id UUID;
  target_stage TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_project_id := OLD.project_id;
    target_stage := OLD.stage;
    stage_status := 'todo';
    analysis_complete := FALSE;
  ELSE
    target_project_id := NEW.project_id;
    target_stage := NEW.stage;
    IF NEW.status = 'draft' THEN
      stage_status := 'in-progress';
      analysis_complete := FALSE;
    ELSIF NEW.status = 'submitted' THEN
      stage_status := 'waiting_adjustment';
      analysis_complete := FALSE;
    ELSIF NEW.status = 'approved' THEN
      stage_status := 'done';
      analysis_complete := TRUE;
    ELSE
      stage_status := 'todo';
      analysis_complete := FALSE;
    END IF;
  END IF;

  -- Update projects table
  IF target_stage = 'adherence' THEN
    UPDATE public.projects
    SET 
      adherence_status = stage_status,
      adherence_analysis_complete = analysis_complete,
      updated_at = now()
    WHERE id = target_project_id;
  ELSIF target_stage = 'conversion' THEN
    -- stage = 'conversion' represents the homologation_checklist
    UPDATE public.projects
    SET 
      conversion_status = stage_status,
      updated_at = now()
    WHERE id = target_project_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_project_form_response ON public.project_form_responses;
CREATE TRIGGER trigger_sync_project_form_response
AFTER INSERT OR UPDATE OR DELETE ON public.project_form_responses
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_form_response_status();


-- Cadastro manual dos motores de conversao.
-- Mantem vinculos opcionais com a fila/projeto para preservar o fluxo legado.

CREATE TABLE IF NOT EXISTS public.conversion_engines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID UNIQUE REFERENCES public.conversion_queue(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  source_system TEXT NOT NULL CHECK (btrim(source_system) <> ''),
  target_system TEXT NOT NULL CHECK (btrim(target_system) <> ''),
  devops_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'in_development'
    CHECK (status IN ('in_development', 'maintenance', 'finished')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversion_engines_status_idx
  ON public.conversion_engines(status);
CREATE INDEX IF NOT EXISTS conversion_engines_systems_idx
  ON public.conversion_engines(source_system, target_system);

DROP TRIGGER IF EXISTS update_conversion_engines_updated_at ON public.conversion_engines;
CREATE TRIGGER update_conversion_engines_updated_at
  BEFORE UPDATE ON public.conversion_engines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.conversion_engines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversion_engines_read ON public.conversion_engines;
CREATE POLICY conversion_engines_read ON public.conversion_engines
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'conversion_engines', 'view'));

DROP POLICY IF EXISTS conversion_engines_create ON public.conversion_engines;
CREATE POLICY conversion_engines_create ON public.conversion_engines
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'conversion_engines', 'create')
    OR public.has_permission(auth.uid(), 'conversion_home', 'execute')
  );

DROP POLICY IF EXISTS conversion_engines_edit ON public.conversion_engines;
CREATE POLICY conversion_engines_edit ON public.conversion_engines
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'conversion_engines', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'conversion_engines', 'edit'));

GRANT SELECT, INSERT, UPDATE ON public.conversion_engines TO authenticated;

INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('conversion_engines', 'create', 'Cadastrar Motores de Conversao')
ON CONFLICT (resource, action) DO UPDATE
  SET description = EXCLUDED.description;

-- Admin recebe a nova permissao e perfis que ja podiam editar motores
-- preservam a capacidade equivalente de cadastrar.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.app_roles r
JOIN public.app_permissions p
  ON p.resource = 'conversion_engines' AND p.action = 'create'
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT existing.role_id, create_permission.id
FROM public.app_role_permissions existing
JOIN public.app_permissions edit_permission
  ON edit_permission.id = existing.permission_id
 AND edit_permission.resource = 'conversion_engines'
 AND edit_permission.action = 'edit'
JOIN public.app_permissions create_permission
  ON create_permission.resource = 'conversion_engines'
 AND create_permission.action = 'create'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Importacao idempotente de qualquer solicitacao antiga ja existente.
INSERT INTO public.conversion_engines (
  queue_id,
  project_id,
  source_system,
  target_system,
  notes,
  status,
  created_by,
  created_by_name,
  created_at,
  updated_at
)
SELECT
  queue.id,
  queue.project_id,
  COALESCE(NULLIF(btrim(project.legacy_system), ''), 'Nao informado'),
  COALESCE(NULLIF(btrim(project.system_type), ''), 'Nao informado'),
  queue.engine_notes,
  CASE
    WHEN queue.engine_status = 'engine_ready' THEN 'finished'
    ELSE 'in_development'
  END,
  queue.engine_requested_by,
  queue.engine_requested_by_name,
  COALESCE(queue.engine_requested_at, now()),
  COALESCE(queue.updated_at, now())
FROM public.conversion_queue queue
JOIN public.projects project ON project.id = queue.project_id
WHERE queue.engine_status IS NOT NULL
ON CONFLICT (queue_id) DO NOTHING;

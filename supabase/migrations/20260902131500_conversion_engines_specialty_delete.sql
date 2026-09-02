-- Especialidade do motor e exclusao protegida por permissao propria.

ALTER TABLE public.conversion_engines
  ADD COLUMN IF NOT EXISTS specialty TEXT;

ALTER TABLE public.conversion_engines
  DROP CONSTRAINT IF EXISTS conversion_engines_specialty_check,
  ADD CONSTRAINT conversion_engines_specialty_check
    CHECK (specialty IS NULL OR specialty IN ('tn_rc', 'protest', 'ri_td'));

CREATE INDEX IF NOT EXISTS conversion_engines_specialty_idx
  ON public.conversion_engines(specialty);

DROP POLICY IF EXISTS conversion_engines_delete ON public.conversion_engines;
CREATE POLICY conversion_engines_delete ON public.conversion_engines
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'conversion_engines', 'delete'));

GRANT DELETE ON public.conversion_engines TO authenticated;

INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('conversion_engines', 'delete', 'Excluir Motores de Conversao')
ON CONFLICT (resource, action) DO UPDATE
  SET description = EXCLUDED.description;

-- Admin e perfis que ja podiam editar motores preservam acesso equivalente.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.app_roles role
JOIN public.app_permissions permission
  ON permission.resource = 'conversion_engines'
 AND permission.action = 'delete'
WHERE role.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT existing.role_id, delete_permission.id
FROM public.app_role_permissions existing
JOIN public.app_permissions edit_permission
  ON edit_permission.id = existing.permission_id
 AND edit_permission.resource = 'conversion_engines'
 AND edit_permission.action = 'edit'
JOIN public.app_permissions delete_permission
  ON delete_permission.resource = 'conversion_engines'
 AND delete_permission.action = 'delete'
ON CONFLICT (role_id, permission_id) DO NOTHING;

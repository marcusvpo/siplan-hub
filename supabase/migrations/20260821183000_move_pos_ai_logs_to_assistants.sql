-- Move a gestão do assistente de pós-implantação para o módulo Assistentes.
-- A visualização e as ações de gestão ficam separadas para não exigir admin_panel.

INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('pos_ai_logs', 'view', 'Visualizar logs e analytics do assistente de pós-implantação'),
  ('pos_ai_logs', 'manage', 'Encerrar e reativar links do assistente de pós-implantação')
ON CONFLICT (resource, action) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.app_roles role
CROSS JOIN public.app_permissions permission
WHERE role.name = 'admin'
  AND permission.resource = 'pos_ai_logs'
ON CONFLICT (role_id, permission_id) DO NOTHING;

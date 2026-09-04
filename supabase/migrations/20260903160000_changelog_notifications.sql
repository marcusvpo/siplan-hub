-- Migration for Changelog & Release Notifications with RBAC filtering

-- 1. Add permission_resource and category to public.notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS permission_resource VARCHAR(50),
  ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'operational';

CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_permission_resource ON public.notifications(permission_resource);

-- 2. Add permissions for Admin Changelog Management in app_permissions catalog
INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('admin_changelog', 'view', 'Visualizar a Central de Novidades e Releases'),
  ('admin_changelog', 'manage', 'Gerenciar e publicar novidades na Central de Releases')
ON CONFLICT (resource, action) DO UPDATE
  SET description = EXCLUDED.description;

-- 3. Grant permissions to admin role
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.app_roles r, public.app_permissions p
WHERE r.name = 'admin' AND p.resource = 'admin_changelog'
ON CONFLICT (role_id, permission_id) DO NOTHING;

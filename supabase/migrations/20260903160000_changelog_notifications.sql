-- Migration for Changelog & Release Notifications with RBAC filtering

-- 1. Add permission_resource and category to public.notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS permission_resource VARCHAR(50),
  ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'operational';

CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_permission_resource ON public.notifications(permission_resource);

-- 2. Add permission for Admin Changelog Management
INSERT INTO public.app_permissions (role, resource, action)
VALUES 
  ('admin', 'admin_changelog', 'view'),
  ('admin', 'admin_changelog', 'manage')
ON CONFLICT (role, resource, action) DO NOTHING;

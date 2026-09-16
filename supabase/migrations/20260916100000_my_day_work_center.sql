-- Central de Trabalho / Meu Dia.
-- A tela agrega dados dos módulos existentes e mantém cada consulta protegida
-- pelas permissões e policies RLS da respectiva origem.

INSERT INTO public.app_permissions (resource, action, description)
VALUES
  ('work_center', 'view', 'Visualizar a Central de Trabalho / Meu Dia'),
  ('work_center', 'create', 'Criar tarefas pessoais no Meu Dia'),
  ('work_center', 'edit', 'Editar tarefas e personalizar o Meu Dia'),
  ('work_center', 'delete', 'Excluir tarefas pessoais do Meu Dia')
ON CONFLICT (resource, action) DO UPDATE
SET description = EXCLUDED.description;

-- A central nasce disponível para os perfis existentes. Os dados agregados
-- continuam limitados pelas permissões que cada perfil já possuía.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT app_role.id, app_permission.id
FROM public.app_roles app_role
JOIN public.app_permissions app_permission
  ON app_permission.resource = 'work_center'
 AND app_permission.action IN ('view', 'create', 'edit', 'delete')
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE TABLE public.my_day_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  due_at TIMESTAMPTZ NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed')),
  linked_path TEXT CHECK (linked_path IS NULL OR linked_path LIKE '/%'),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_my_day_tasks_user_status_due
  ON public.my_day_tasks (user_id, status, due_at);

CREATE TRIGGER update_my_day_tasks_updated_at
BEFORE UPDATE ON public.my_day_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.my_day_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own My Day tasks"
ON public.my_day_tasks FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_center', 'view')
);

CREATE POLICY "Users can create their own My Day tasks"
ON public.my_day_tasks FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_center', 'create')
);

CREATE POLICY "Users can edit their own My Day tasks"
ON public.my_day_tasks FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_center', 'edit')
)
WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_center', 'edit')
);

CREATE POLICY "Users can delete their own My Day tasks"
ON public.my_day_tasks FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_center', 'delete')
);

REVOKE ALL ON public.my_day_tasks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_day_tasks TO authenticated;

CREATE TABLE public.my_day_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  density TEXT NOT NULL DEFAULT 'compact'
    CHECK (density IN ('compact', 'comfortable')),
  widget_order TEXT[] NOT NULL DEFAULT ARRAY[
    'projects', 'insights', 'agenda', 'conversion', 'shortcuts', 'copilot'
  ]::TEXT[],
  hidden_widgets TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  quick_links TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_my_day_preferences_updated_at
BEFORE UPDATE ON public.my_day_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.my_day_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own My Day preferences"
ON public.my_day_preferences FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_center', 'view')
);

CREATE POLICY "Users can create their own My Day preferences"
ON public.my_day_preferences FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_center', 'edit')
);

CREATE POLICY "Users can edit their own My Day preferences"
ON public.my_day_preferences FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_center', 'edit')
)
WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_center', 'edit')
);

REVOKE ALL ON public.my_day_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.my_day_preferences TO authenticated;

INSERT INTO public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
)
SELECT
  'changelog',
  'release_screen',
  'work_center',
  'Nova Central de Trabalho / Meu Dia',
  'A nova tela reúne projetos, filtros interativos, gráficos, agenda pessoal, compromissos, atalhos personalizados e o resumo diário do Copiloto em um só lugar.',
  '/meu-dia'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_screen'
    AND permission_resource = 'work_center'
    AND title = 'Nova Central de Trabalho / Meu Dia'
    AND action_url = '/meu-dia'
);

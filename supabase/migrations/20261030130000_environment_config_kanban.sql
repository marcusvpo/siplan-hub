-- ============================================================================
-- Migration: Kanban de Configuração de Ambiente, Permissões RBAC e Notificações
-- ============================================================================

-- 1. Permissões no catálogo de permissões
INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('environment_config', 'view', 'Visualizar o Kanban de Configuração de Ambiente'),
  ('environment_config', 'edit', 'Gerenciar cards, responsáveis e status do Kanban de Configuração de Ambiente')
ON CONFLICT (resource, action) DO UPDATE
SET description = EXCLUDED.description;

-- 2. Conceder permissões para o perfil admin
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.app_roles r
CROSS JOIN public.app_permissions p
WHERE r.name = 'admin'
  AND p.resource = 'environment_config'
  AND p.action IN ('view', 'edit')
ON CONFLICT DO NOTHING;

-- 3. Preservar permissão de visualização para perfis que já tinham acesso a projetos
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT arp.role_id, target_perm.id
FROM public.app_role_permissions arp
JOIN public.app_permissions source_perm ON source_perm.id = arp.permission_id
JOIN public.app_permissions target_perm
  ON target_perm.resource = 'environment_config'
 AND target_perm.action = 'view'
WHERE source_perm.resource = 'projects'
  AND source_perm.action = 'view'
ON CONFLICT DO NOTHING;

-- 4. Função e trigger para notificação automática para Bruno Fernandes e Alex Silva
CREATE OR REPLACE FUNCTION public.notify_environment_config_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient RECORD;
  v_client_name TEXT;
  v_ticket_num TEXT;
BEGIN
  -- Dispara apenas quando environment_status for para 'in-progress'
  IF NEW.environment_status = 'in-progress' AND (OLD.environment_status IS DISTINCT FROM 'in-progress') THEN
    v_client_name := COALESCE(NEW.client_name, 'Cliente não identificado');
    v_ticket_num := COALESCE(NEW.ticket_number, '');

    -- Encontrar os IDs dos perfis do Bruno Fernandes e do Alex Silva
    FOR v_recipient IN
      SELECT id, full_name, email
      FROM public.profiles
      WHERE (full_name ILIKE '%Bruno%Fernandes%' OR full_name ILIKE '%Alex%Silva%')
    LOOP
      INSERT INTO public.notifications (
        user_id,
        project_id,
        type,
        title,
        message,
        action_url,
        category
      ) VALUES (
        v_recipient.id,
        NEW.id,
        'new_demand',
        'Nova Configuração de Ambiente',
        'Há uma nova configuração de ambiente pendente para o cliente ' || v_client_name || CASE WHEN v_ticket_num <> '' THEN ' (#' || v_ticket_num || ')' ELSE '' END || '.',
        '/deployments/environment-config',
        'alert'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_environment_config ON public.projects;

CREATE TRIGGER trg_notify_environment_config
  AFTER UPDATE OF environment_status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_environment_config_assigned();

-- 5. Notificação de Novidade (Changelog)
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
  'environment_config',
  'Nova Tela: Kanban de Configuração de Ambiente',
  'Disponibilizado o novo Kanban de Configuração de Ambiente na esteira de Implantação, com alertas dinâmicos de proximidade da data de início, sincronização em tempo real com a etapa 4 e gestão de pendências.',
  '/deployments/environment-config'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_screen'
    AND permission_resource = 'environment_config'
    AND action_url = '/deployments/environment-config'
);

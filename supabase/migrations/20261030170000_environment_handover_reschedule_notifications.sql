-- Migration: Handover Automático e Notificação de Reprogramação de Ambiente
-- Data: 2026-10-30

-- 1. Aprimorar a função de notificações da Configuração de Ambiente
CREATE OR REPLACE FUNCTION public.notify_environment_config_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient RECORD;
  v_client_name TEXT;
  v_ticket_num TEXT;
  v_resp_env TEXT;
  v_old_start TEXT;
  v_new_start TEXT;
BEGIN
  v_client_name := COALESCE(NEW.client_name, 'Cliente não identificado');
  v_ticket_num := COALESCE(NEW.ticket_number, '');
  v_resp_env := COALESCE(NEW.environment_responsible, '');

  -- EVENTO 1: Demanda iniciada na etapa 4 (vai para in-progress) -> Notifica Bruno Fernandes e Alex Silva
  IF NEW.environment_status = 'in-progress' AND (OLD.environment_status IS DISTINCT FROM 'in-progress') THEN
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

  -- EVENTO 2: Handover Automático na conclusão do ambiente -> Notifica o Implantador da Fase 1 e todos os Admins
  IF NEW.environment_status = 'done' AND (OLD.environment_status IS DISTINCT FROM 'done') THEN
    FOR v_recipient IN
      -- Admins
      SELECT p.id, p.full_name, p.email
      FROM public.profiles p
      WHERE p.role = 'admin'

      UNION

      -- Implantador Responsável pela Fase 1 (se cadastrado por ID ou nome)
      SELECT p.id, p.full_name, p.email
      FROM public.profiles p
      WHERE (
        (NEW.implementation_responsible_id IS NOT NULL AND p.id = NEW.implementation_responsible_id)
        OR (
          NEW.implementation_responsible IS NOT NULL
          AND NEW.implementation_responsible <> ''
          AND p.full_name ILIKE '%' || TRIM(NEW.implementation_responsible) || '%'
        )
        OR (
          NEW.implementation_phase1->>'responsible' IS NOT NULL
          AND NEW.implementation_phase1->>'responsible' <> ''
          AND p.full_name ILIKE '%' || TRIM(NEW.implementation_phase1->>'responsible') || '%'
        )
      )
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
        'task_completed',
        'Ambiente Concluído: ' || v_client_name,
        'A configuração de ambiente de ' || v_client_name || CASE WHEN v_ticket_num <> '' THEN ' (#' || v_ticket_num || ')' ELSE '' END || ' foi finalizada' || CASE WHEN v_resp_env <> '' THEN ' por ' || v_resp_env ELSE '' END || '. Os dados de acesso já estão disponíveis no Hub para a implantação da Fase 1.',
        '/deployments/environment-config',
        'alert'
      );
    END LOOP;
  END IF;

  -- EVENTO 3: Reprogramação de datas da Fase 1 -> Notifica o Analista do Ambiente e Admins
  IF (NEW.environment_status = 'in-progress' OR v_resp_env <> '') THEN
    v_old_start := COALESCE(OLD.implementation_phase1->>'startDate', OLD.implementation_phase1->>'start_date', OLD.implementation_start_date::text);
    v_new_start := COALESCE(NEW.implementation_phase1->>'startDate', NEW.implementation_phase1->>'start_date', NEW.implementation_start_date::text);

    IF v_new_start IS DISTINCT FROM v_old_start AND v_new_start IS NOT NULL AND v_old_start IS NOT NULL THEN
      FOR v_recipient IN
        -- Admins
        SELECT p.id, p.full_name, p.email
        FROM public.profiles p
        WHERE p.role = 'admin'

        UNION

        -- Responsável pela configuração do ambiente
        SELECT p.id, p.full_name, p.email
        FROM public.profiles p
        WHERE (
          (NEW.environment_responsible_id IS NOT NULL AND p.id = NEW.environment_responsible_id)
          OR (
            v_resp_env <> ''
            AND p.full_name ILIKE '%' || TRIM(v_resp_env) || '%'
          )
        )
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
          'schedule_changed',
          'Reprogramação de Implantação: ' || v_client_name,
          'A data de início da implantação da Fase 1 de ' || v_client_name || CASE WHEN v_ticket_num <> '' THEN ' (#' || v_ticket_num || ')' ELSE '' END || ' foi alterada. O prazo final da configuração de ambiente foi recalculado no Kanban.',
          '/deployments/environment-config',
          'alert'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Recriar o trigger na tabela public.projects
DROP TRIGGER IF EXISTS trg_notify_environment_config ON public.projects;
DROP TRIGGER IF EXISTS trg_notify_environment_events ON public.projects;

CREATE TRIGGER trg_notify_environment_events
  AFTER UPDATE OF environment_status, environment_responsible, implementation_phase1, implementation_start_date ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_environment_config_events();

-- 3. Inserir notificação de Changelog
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
  'release_improvement',
  'environment_config',
  'Melhorias Operacionais na Configuração de Ambiente',
  'Implementado Handover Automático para implantadores e admins na conclusão do ambiente, Alerta Crítico de SLA de ambiente nos cards de /projects, Pílulas de Carga de Trabalho por analista, botão Copiar Acessos em 1 clique e Timeline de auditoria.',
  '/deployments/environment-config'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'environment_config'
    AND title = 'Melhorias Operacionais na Configuração de Ambiente'
);

-- Migration: Padronização de Datas nas Notificações para DD/MM/YYYY
-- Data: 2026-11-05
-- Objetivo: Garantir que datas em notificações (ex: Reprogramação de Implantação)
--           sejam exibidas de forma limpa como 'DD/MM/YYYY', sem UTC ou horários irrelevantes.

-- 1. Função utilitária para converter qualquer representação de data (ISO UTC, timestamp ou YYYY-MM-DD)
--    no formato oficial brasileiro DD/MM/YYYY.
CREATE OR REPLACE FUNCTION public.format_date_br(p_date_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_date_text IS NULL OR TRIM(p_date_text) = '' THEN
    RETURN '';
  END IF;

  -- Se já for DD/MM/YYYY
  IF p_date_text ~ '^\d{2}/\d{2}/\d{4}$' THEN
    RETURN p_date_text;
  END IF;

  -- Se for apenas data YYYY-MM-DD (sem hora)
  IF p_date_text ~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN to_char(p_date_text::date, 'DD/MM/YYYY');
  END IF;

  -- Se for ISO com timestamp/hora (ex: 2026-11-16T15:00:00.000Z)
  IF p_date_text ~ 'T' THEN
    BEGIN
      RETURN to_char((p_date_text::timestamptz AT TIME ZONE 'America/Sao_Paulo'), 'DD/MM/YYYY');
    EXCEPTION WHEN OTHERS THEN
      RETURN substr(p_date_text, 9, 2) || '/' || substr(p_date_text, 6, 2) || '/' || substr(p_date_text, 1, 4);
    END;
  END IF;

  -- Fallbacks seguros
  BEGIN
    RETURN to_char(p_date_text::date, 'DD/MM/YYYY');
  EXCEPTION WHEN OTHERS THEN
    IF p_date_text ~ '^\d{4}-\d{2}-\d{2}' THEN
      RETURN substr(p_date_text, 9, 2) || '/' || substr(p_date_text, 6, 2) || '/' || substr(p_date_text, 1, 4);
    END IF;
    RETURN p_date_text;
  END;
END;
$$;

-- 2. Atualização da função de eventos de configuração de ambiente (notify_environment_config_events)
CREATE OR REPLACE FUNCTION public.notify_environment_config_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  IF NEW.environment_status = 'in-progress' 
     AND (OLD.environment_status IS DISTINCT FROM 'in-progress')
     AND (OLD.environment_status IS DISTINCT FROM 'done')
     AND (OLD.environment_dispatched_at IS NULL) THEN
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

    IF v_new_start IS NOT NULL AND v_old_start IS NOT NULL AND v_new_start <> v_old_start THEN
      FOR v_recipient IN
        SELECT p.id, p.full_name, p.email
        FROM public.profiles p
        WHERE p.role = 'admin'
           OR (v_resp_env <> '' AND p.full_name ILIKE '%' || TRIM(v_resp_env) || '%')
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
          'task_updated',
          'Reprogramação de Implantação: ' || v_client_name,
          'A data de início da Fase 1 de ' || v_client_name || ' foi reprogramada de ' || public.format_date_br(v_old_start) || ' para ' || public.format_date_br(v_new_start) || '. Verifique o novo prazo limite de entrega do ambiente.',
          '/deployments/environment-config',
          'alert'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Atualização da função de eventos de ciclo de vida de etapas (notify_project_stage_lifecycle_events)
CREATE OR REPLACE FUNCTION public.notify_project_stage_lifecycle_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recipient RECORD;
  v_client_name TEXT;
  v_ticket_num TEXT;
  v_resp_env TEXT;
  v_resp_infra TEXT;
  v_old_start TEXT;
  v_new_start TEXT;
  v_impl_resp_id UUID;
  v_impl_resp_name TEXT;
BEGIN
  v_client_name := COALESCE(NEW.client_name, 'Cliente não identificado');
  v_ticket_num := COALESCE(NEW.ticket_number, '');
  v_resp_env := COALESCE(NEW.environment_responsible, '');
  v_resp_infra := COALESCE(NEW.infra_responsible, '');
  v_impl_resp_id := NEW.implementation_responsible_id;
  v_impl_resp_name := COALESCE(NEW.implementation_responsible, NEW.implementation_phase1->>'responsible', '');

  -- EVENTO 1: Infraestrutura Concluída (infra_status -> 'done')
  IF NEW.infra_status = 'done' AND (OLD.infra_status IS DISTINCT FROM 'done') THEN
    FOR v_recipient IN
      SELECT p.id, p.full_name
      FROM public.profiles p
      WHERE p.role = 'admin'
         OR p.full_name ILIKE ANY (ARRAY['%Bruno%Fernandes%', '%Alex%Silva%'])
         OR (v_impl_resp_id IS NOT NULL AND p.id = v_impl_resp_id)
         OR (v_impl_resp_name <> '' AND p.full_name ILIKE '%' || TRIM(v_impl_resp_name) || '%')
    LOOP
      INSERT INTO public.notifications (
        user_id,
        project_id,
        type,
        stage,
        priority,
        title,
        message,
        action_url,
        category
      ) VALUES (
        v_recipient.id,
        NEW.id,
        'task_completed',
        'infra',
        'normal',
        'Análise de Infra Concluída: ' || v_client_name,
        'A análise de infraestrutura do cliente ' || v_client_name || ' foi finalizada' || CASE WHEN v_resp_infra <> '' THEN ' por ' || v_resp_infra ELSE '' END || '.',
        '/projects?id=' || NEW.id,
        'operational'
      );
    END LOOP;
  END IF;

  -- EVENTO 2: Infraestrutura com Bloqueio (infra_status -> 'blocked')
  IF NEW.infra_status = 'blocked' AND (OLD.infra_status IS DISTINCT FROM 'blocked') THEN
    FOR v_recipient IN
      SELECT p.id
      FROM public.profiles p
      WHERE p.role = 'admin'
         OR p.full_name ILIKE ANY (ARRAY['%Bruno%Fernandes%', '%Alex%Silva%'])
    LOOP
      INSERT INTO public.notifications (
        user_id,
        project_id,
        type,
        stage,
        priority,
        title,
        message,
        action_url,
        category
      ) VALUES (
        v_recipient.id,
        NEW.id,
        'issue_reported',
        'infra',
        'urgent',
        'ALERTA: Infraestrutura Bloqueada: ' || v_client_name,
        'A infraestrutura de ' || v_client_name || ' está bloqueada. Motivo: ' || COALESCE(NEW.infra_blocking_reason, 'Pendente de validação técnica.'),
        '/projects?id=' || NEW.id,
        'operational'
      );
    END LOOP;
  END IF;

  -- EVENTO 3: Demanda iniciada na Preparação de Ambiente (environment_status -> 'in-progress')
  IF NEW.environment_status = 'in-progress' AND (OLD.environment_status IS DISTINCT FROM 'in-progress') THEN
    FOR v_recipient IN
      SELECT p.id, p.full_name
      FROM public.profiles p
      WHERE p.role = 'admin'
         OR p.full_name ILIKE ANY (ARRAY['%Bruno%Fernandes%', '%Alex%Silva%'])
    LOOP
      INSERT INTO public.notifications (
        user_id,
        project_id,
        type,
        stage,
        priority,
        title,
        message,
        action_url,
        category
      ) VALUES (
        v_recipient.id,
        NEW.id,
        'status_change',
        'environment',
        'normal',
        'Preparação de Ambiente Iniciada: ' || v_client_name,
        'A configuração de ambiente do cliente ' || v_client_name || ' está em andamento' || CASE WHEN v_resp_env <> '' THEN ' com ' || v_resp_env ELSE '' END || '.',
        '/deployments/environment-config',
        'operational'
      );
    END LOOP;
  END IF;

  -- EVENTO 4: Handover de Ambiente Concluído (environment_status -> 'done')
  IF NEW.environment_status = 'done' AND (OLD.environment_status IS DISTINCT FROM 'done') THEN
    FOR v_recipient IN
      SELECT p.id, p.full_name
      FROM public.profiles p
      WHERE p.role = 'admin'
         OR p.full_name ILIKE ANY (ARRAY['%Bruno%Fernandes%', '%Alex%Silva%'])
         OR (v_impl_resp_id IS NOT NULL AND p.id = v_impl_resp_id)
         OR (v_impl_resp_name <> '' AND p.full_name ILIKE '%' || TRIM(v_impl_resp_name) || '%')
    LOOP
      INSERT INTO public.notifications (
        user_id,
        project_id,
        type,
        stage,
        priority,
        title,
        message,
        action_url,
        category
      ) VALUES (
        v_recipient.id,
        NEW.id,
        'task_completed',
        'environment',
        'high',
        'Ambiente Concluído: ' || v_client_name,
        'A configuração de ambiente de ' || v_client_name || ' foi finalizada. Os acessos ao servidor estão prontos para a implantação da Fase 1.',
        '/deployments/environment-config',
        'operational'
      );
    END LOOP;
  END IF;

  -- EVENTO 5: Reprogramação da Fase 1 -> Notifica Analistas do Ambiente e Admins
  IF (NEW.environment_status = 'in-progress' OR v_resp_env <> '') THEN
    v_old_start := COALESCE(OLD.implementation_phase1->>'startDate', OLD.implementation_phase1->>'start_date', OLD.implementation_start_date::text);
    v_new_start := COALESCE(NEW.implementation_phase1->>'startDate', NEW.implementation_phase1->>'start_date', NEW.implementation_start_date::text);

    IF v_new_start IS NOT NULL AND v_old_start IS NOT NULL AND v_new_start <> v_old_start THEN
      FOR v_recipient IN
        SELECT p.id, p.full_name
        FROM public.profiles p
        WHERE p.role = 'admin'
           OR p.full_name ILIKE ANY (ARRAY['%Bruno%Fernandes%', '%Alex%Silva%'])
           OR (v_resp_env <> '' AND p.full_name ILIKE '%' || TRIM(v_resp_env) || '%')
      LOOP
        INSERT INTO public.notifications (
          user_id,
          project_id,
          type,
          stage,
          priority,
          title,
          message,
          action_url,
          category
        ) VALUES (
          v_recipient.id,
          NEW.id,
          'schedule_changed',
          'environment',
          'high',
          'Reprogramação de Implantação: ' || v_client_name,
          'A data de início da Fase 1 de ' || v_client_name || ' foi reprogramada de ' || public.format_date_br(v_old_start) || ' para ' || public.format_date_br(v_new_start) || '. Verifique o prazo no Kanban.',
          '/deployments/environment-config',
          'operational'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Atualização retroativa das notificações existentes na tabela public.notifications
UPDATE public.notifications
SET message = regexp_replace(
  regexp_replace(
    message,
    '(\d{4})-(\d{2})-(\d{2})T[0-9:.]+Z?',
    '\3/\2/\1',
    'g'
  ),
  '(\d{4})-(\d{2})-(\d{2})',
  '\3/\2/\1',
  'g'
)
WHERE message ~ '\d{4}-\d{2}-\d{2}T'
   OR (category = 'operational' AND message ILIKE '%reprogramada%');

-- 5. Registro oficial de novidade (Changelog)
INSERT INTO public.notifications (
  user_id,
  type,
  category,
  priority,
  permission_resource,
  title,
  message,
  action_url
)
SELECT 
  p.id,
  'release_improvement',
  'changelog',
  'normal',
  'projects',
  'Melhoria nas Notificações e Agendamento no Calendário',
  'As notificações de reprogramação de implantação agora exibem as datas no padrão brasileiro DD/MM/YYYY. Além disso, o modal de edição no Calendário foi aprimorado para aguardar a digitação completa da data antes de validar feriados.',
  '/calendar'
FROM public.profiles p
WHERE p.role = 'admin'
ON CONFLICT DO NOTHING;

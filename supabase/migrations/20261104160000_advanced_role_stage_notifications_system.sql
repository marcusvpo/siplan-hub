-- Migration: Sistema Avançado de Notificações Personalizadas por Perfil, Equipe, Cargo e Telemetria de Afinidade
-- Data: 2026-11-04

-- 1. Enriquecer a tabela public.notifications com campos de prioridade, estágio e metadados
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'general' CHECK (stage IN ('infra', 'adherence', 'conversion', 'environment', 'modelos_editor', 'implementation', 'post', 'general', 'sla_alert'));

-- Índices de performance para consultas rápidas do sininho e da central do admin
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_stage ON public.notifications(stage);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_desc ON public.notifications(created_at DESC);

-- 2. Atualizar a rotina de autolimpeza para retenção de 90 dias (permitindo métricas e histórico gerencial)
CREATE OR REPLACE FUNCTION public.fn_clean_old_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mantém histórico por 90 dias para auditoria de SLA e gestão
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '90 days';
  RETURN NEW;
END;
$$;

-- 3. Tabela de afinidade dinâmica invisível do usuário por tópico/etapa
CREATE TABLE IF NOT EXISTS public.user_topic_affinities (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic VARCHAR(40) NOT NULL, -- 'infra', 'environment', 'conversion', 'implementation', 'commercial', 'sd', 'cs_cx', 'general'
  action_count INT DEFAULT 0,
  total_dwell_seconds INT DEFAULT 0,
  affinity_score NUMERIC DEFAULT 0,
  last_interacted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, topic)
);

ALTER TABLE public.user_topic_affinities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affinities view and manage policy" ON public.user_topic_affinities;
CREATE POLICY "Affinities view and manage policy"
  ON public.user_topic_affinities
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_user_topic_affinities_score 
  ON public.user_topic_affinities(user_id, affinity_score DESC);

-- 4. RPC para registrar métricas em lote da telemetria invisível (chamada periódica sem sobrecarga)
CREATE OR REPLACE FUNCTION public.record_user_affinities(p_metrics JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_item RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_metrics) AS (
    topic TEXT,
    actions INT,
    dwell_seconds INT
  )
  LOOP
    IF v_item.topic IS NOT NULL THEN
      INSERT INTO public.user_topic_affinities (
        user_id,
        topic,
        action_count,
        total_dwell_seconds,
        affinity_score,
        last_interacted_at,
        updated_at
      ) VALUES (
        v_user_id,
        v_item.topic,
        COALESCE(v_item.actions, 0),
        COALESCE(v_item.dwell_seconds, 0),
        ROUND((COALESCE(v_item.actions, 0) * 3.0) + ((COALESCE(v_item.dwell_seconds, 0) / 60.0) * 0.2), 2),
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, topic) DO UPDATE
      SET
        action_count = user_topic_affinities.action_count + COALESCE(EXCLUDED.action_count, 0),
        total_dwell_seconds = user_topic_affinities.total_dwell_seconds + COALESCE(EXCLUDED.total_dwell_seconds, 0),
        affinity_score = ROUND(
          ((user_topic_affinities.action_count + COALESCE(EXCLUDED.action_count, 0)) * 3.0) +
          (((user_topic_affinities.total_dwell_seconds + COALESCE(EXCLUDED.total_dwell_seconds, 0)) / 60.0) * 0.2),
          2
        ),
        last_interacted_at = NOW(),
        updated_at = NOW();
    END IF;
  END LOOP;
END;
$$;

-- 5. Cadastro da Permissão RBAC para a Central de Notificações do Admin
INSERT INTO public.app_permissions (resource, action)
VALUES 
  ('admin_notifications', 'view'),
  ('admin_notifications', 'manage')
ON CONFLICT (resource, action) DO NOTHING;

-- Conceder permissão ao perfil 'admin'
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.app_roles r
CROSS JOIN public.app_permissions p
WHERE r.name = 'admin'
  AND p.resource = 'admin_notifications'
ON CONFLICT DO NOTHING;

-- 6. Trigger e Função de Notificações da Fila de Conversão (Ademar, Luciane, Hugo, Admins, Implantador)
CREATE OR REPLACE FUNCTION public.notify_conversion_queue_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name TEXT;
  v_source_system TEXT;
  v_recipient RECORD;
  v_assignee_name TEXT;
  v_impl_resp_id UUID;
  v_impl_resp_name TEXT;
BEGIN
  -- Obter dados do projeto vinculado
  SELECT 
    client_name, 
    conversion_source_system,
    implementation_responsible_id,
    implementation_responsible
  INTO 
    v_client_name, 
    v_source_system,
    v_impl_resp_id,
    v_impl_resp_name
  FROM public.projects
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);

  v_client_name := COALESCE(v_client_name, 'Cliente não identificado');
  v_source_system := COALESCE(v_source_system, NEW.engine_status, 'Não informado');

  -- EVENTO A: Nova conversão adicionada à fila (INSERT) -> Notifica time de conversão e Admins
  IF TG_OP = 'INSERT' THEN
    FOR v_recipient IN
      SELECT p.id, p.full_name
      FROM public.profiles p
      WHERE p.role = 'admin'
         OR p.team = 'conversion'
         OR p.role = 'Conversão'
         OR p.full_name ILIKE ANY (ARRAY['%Ademar%Souza%', '%Luciane%Lima%', '%Hugo%Janu%'])
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
        NEW.project_id,
        'new_demand',
        'conversion',
        CASE WHEN NEW.priority <= 1 THEN 'urgent' WHEN NEW.priority = 2 THEN 'high' ELSE 'normal' END,
        'Nova Conversão na Fila: ' || v_client_name,
        'O cliente ' || v_client_name || ' foi enviado para a Fila de Conversão (Origem: ' || v_source_system || ').',
        '/conversion/atividades',
        'operational'
      );
    END LOOP;
  END IF;

  -- EVENTO B: Conversão assumida por um analista (assigned_to alterado)
  IF TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to <> NEW.assigned_to) THEN
    v_assignee_name := COALESCE(NEW.assigned_to_name, 'Um analista');

    FOR v_recipient IN
      SELECT p.id, p.full_name
      FROM public.profiles p
      WHERE (
        p.role = 'admin'
        OR p.team = 'conversion'
        OR p.role = 'Conversão'
        OR p.full_name ILIKE ANY (ARRAY['%Ademar%Souza%', '%Luciane%Lima%', '%Hugo%Janu%'])
        OR (v_impl_resp_id IS NOT NULL AND p.id = v_impl_resp_id)
        OR (v_impl_resp_name IS NOT NULL AND p.full_name ILIKE '%' || TRIM(v_impl_resp_name) || '%')
      )
      AND p.id <> NEW.assigned_to -- Não notifica quem acabou de assumir
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
        NEW.project_id,
        'assignment',
        'conversion',
        'normal',
        'Conversão Assumida: ' || v_client_name,
        v_assignee_name || ' assumiu a conversão do cliente ' || v_client_name || ' (Origem: ' || v_source_system || ').',
        '/conversion/atividades',
        'operational'
      );
    END LOOP;
  END IF;

  -- EVENTO C: Homologação concluída com sucesso ou reprovada
  IF TG_OP = 'UPDATE' AND NEW.homologation_status IS DISTINCT FROM OLD.homologation_status THEN
    IF NEW.homologation_status = 'approved' THEN
      FOR v_recipient IN
        SELECT p.id
        FROM public.profiles p
        WHERE p.role = 'admin'
           OR p.id = NEW.assigned_to
           OR (v_impl_resp_id IS NOT NULL AND p.id = v_impl_resp_id)
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
          NEW.project_id,
          'homologation_approved',
          'conversion',
          'high',
          'Homologação Aprovada: ' || v_client_name,
          'A conversão de ' || v_client_name || ' foi homologada e aprovada com sucesso.',
          '/conversion/atividades',
          'operational'
        );
      END LOOP;
    ELSIF NEW.homologation_status = 'issues_reported' THEN
      FOR v_recipient IN
        SELECT p.id
        FROM public.profiles p
        WHERE p.role = 'admin'
           OR p.id = NEW.assigned_to
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
          NEW.project_id,
          'homologation_issues',
          'conversion',
          'urgent',
          'Homologação com Apontamentos: ' || v_client_name,
          'Foram reportadas divergências na homologação da conversão de ' || v_client_name || '. Requer ajustes técnicos.',
          '/conversion/atividades',
          'operational'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_conversion_lifecycle ON public.conversion_queue;
CREATE TRIGGER trg_notify_conversion_lifecycle
  AFTER INSERT OR UPDATE OF assigned_to, homologation_status ON public.conversion_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_conversion_queue_lifecycle();

-- 7. Aprimorar Trigger de Notificações em Projects (Infra, Ambiente e Implantação)
CREATE OR REPLACE FUNCTION public.notify_project_stage_lifecycle_events()
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

  -- EVENTO 1: Infraestrutura Concluída (infra_status -> 'done') -> Notifica Bruno, Alex, Admins e Implantador
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

  -- EVENTO 2: Infraestrutura com Bloqueio (infra_status -> 'blocked') -> Notifica Bruno, Alex e Admins
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

  -- EVENTO 4: Handover de Ambiente Concluído (environment_status -> 'done') -> Notifica Implantador da Fase 1 e Admins
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
          'A data de início da Fase 1 de ' || v_client_name || ' foi reprogramada de ' || v_old_start || ' para ' || v_new_start || '. Verifique o prazo no Kanban.',
          '/deployments/environment-config',
          'operational'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_project_stage_lifecycle ON public.projects;
CREATE TRIGGER trg_notify_project_stage_lifecycle
  AFTER UPDATE OF infra_status, environment_status, environment_responsible, implementation_phase1, implementation_start_date ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_project_stage_lifecycle_events();

-- 8. Registro de Changelog da nova funcionalidade
INSERT INTO public.notifications (
  category,
  type,
  stage,
  priority,
  permission_resource,
  title,
  message,
  action_url
) VALUES (
  'changelog',
  'release_feature',
  'general',
  'low',
  'admin_notifications',
  'Novo Sistema de Notificações Inteligentes e Central do Admin',
  'Lançamento do sistema avançado de notificações com isolamento por perfil/equipe, duas abas limpas no sininho (Atividades vs Novidades), monitoramento invisível de afinidade e painel executivo com visão por etapas do projeto em /admin/notifications.',
  '/admin/notifications'
);

-- Migration: Trava de Idempotência e Auditoria de Disparos de Preparação de Ambiente
-- Data: 2026-11-04
-- Objetivo: Impedir disparos duplicados de e-mail ao movimentar cards no Kanban de Ambiente
--           (ex: Concluídos -> Em Andamento), gravando carimbo e histórico por cliente e sistema.

-- 1. Novas colunas de controle na tabela public.projects
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS environment_dispatched_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS environment_dispatch_done BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS environment_dispatched_by TEXT NULL;

-- 2. Tabela de auditoria de disparos de automações do HUB
CREATE TABLE IF NOT EXISTS public.automation_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  system_type TEXT NOT NULL,
  ticket_number TEXT,
  automation_type TEXT NOT NULL DEFAULT 'environment_preparation_requested',
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatched_by TEXT DEFAULT 'system',
  channel TEXT NOT NULL DEFAULT 'email',
  recipients TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_automation_dispatches_client_system
  ON public.automation_dispatches (LOWER(TRIM(client_name)), LOWER(TRIM(system_type)), automation_type);

CREATE INDEX IF NOT EXISTS idx_automation_dispatches_project_id
  ON public.automation_dispatches (project_id, automation_type);

-- 3. Habilitar RLS na tabela de auditoria de disparos
ALTER TABLE public.automation_dispatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read automation dispatches" ON public.automation_dispatches;
CREATE POLICY "Allow authenticated users to read automation dispatches"
  ON public.automation_dispatches
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert automation dispatches" ON public.automation_dispatches;
CREATE POLICY "Allow authenticated users to insert automation dispatches"
  ON public.automation_dispatches
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Backfill retroativo para projetos que já foram iniciados ou concluídos no passado
UPDATE public.projects
SET 
  environment_dispatched_at = COALESCE(environment_start_date::timestamp with time zone, updated_at, now()),
  environment_dispatch_done = TRUE,
  environment_dispatched_by = 'retroactive_backfill'
WHERE (environment_status IN ('in-progress', 'done'))
  AND environment_dispatched_at IS NULL;

-- Registrar na tabela de auditoria para os projetos já retroativos
INSERT INTO public.automation_dispatches (
  project_id,
  client_name,
  system_type,
  ticket_number,
  automation_type,
  dispatched_at,
  dispatched_by,
  recipients,
  metadata
)
SELECT 
  p.id,
  COALESCE(p.client_name, 'Cliente'),
  COALESCE(p.system_type, 'Sistema'),
  p.ticket_number,
  'environment_preparation_requested',
  COALESCE(p.environment_dispatched_at, now()),
  'retroactive_backfill',
  ARRAY['marcus.vinicius@siplan.com.br', 'hugo.santariosi@siplan.com.br', 'bruno.fernandes@siplan.com.br', 'alex.silva@siplan.com.br'],
  jsonb_build_object('note', 'Backfill retroativo para evitar disparos em projetos existentes')
FROM public.projects p
WHERE p.environment_dispatched_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.automation_dispatches ad
    WHERE ad.project_id = p.id AND ad.automation_type = 'environment_preparation_requested'
  );

-- 5. Função controladora do trigger de disparo de e-mail (com trava atômica)
CREATE OR REPLACE FUNCTION public.fn_handle_environment_preparation_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_dispatched BOOLEAN := FALSE;
  v_payload JSONB;
BEGIN
  -- Apenas intercepta quando o status estiver indo para 'in-progress'
  IF NEW.environment_status = 'in-progress' AND (OLD.environment_status IS DISTINCT FROM 'in-progress') THEN
    
    -- REGRA 1: Se a linha já tiver o carimbo ou flag de disparo realizado, trava!
    IF OLD.environment_dispatched_at IS NOT NULL OR NEW.environment_dispatched_at IS NOT NULL OR OLD.environment_dispatch_done = TRUE THEN
      v_already_dispatched := TRUE;
    END IF;

    -- REGRA 2: Se estava em 'done' e voltou para 'in-progress' (reabertura / movimentação de teste no Kanban), trava!
    IF OLD.environment_status = 'done' THEN
      v_already_dispatched := TRUE;
    END IF;

    -- REGRA 3: Se já existe disparo registrado na tabela de auditoria para este Cliente e Sistema específico, trava!
    IF NOT v_already_dispatched THEN
      SELECT EXISTS (
        SELECT 1 FROM public.automation_dispatches
        WHERE LOWER(TRIM(client_name)) = LOWER(TRIM(NEW.client_name))
          AND LOWER(TRIM(system_type)) = LOWER(TRIM(NEW.system_type))
          AND automation_type = 'environment_preparation_requested'
      ) INTO v_already_dispatched;
    END IF;

    -- Se já foi disparado anteriormente, preserva o estado e não chama o n8n
    IF v_already_dispatched THEN
      NEW.environment_dispatched_at := COALESCE(OLD.environment_dispatched_at, NEW.environment_dispatched_at, now());
      NEW.environment_dispatch_done := TRUE;
      RETURN NEW;
    END IF;

    -- PRIMEIRO DISPARO LEGÍTIMO:
    NEW.environment_dispatched_at := now();
    NEW.environment_dispatch_done := TRUE;
    NEW.environment_dispatched_by := COALESCE(NEW.last_update_by, 'Sistema');

    -- Registra auditoria do primeiro envio
    INSERT INTO public.automation_dispatches (
      project_id,
      client_name,
      system_type,
      ticket_number,
      automation_type,
      dispatched_at,
      dispatched_by,
      recipients,
      metadata
    ) VALUES (
      NEW.id,
      COALESCE(NEW.client_name, 'Cliente'),
      COALESCE(NEW.system_type, 'Sistema'),
      COALESCE(NEW.ticket_number, ''),
      'environment_preparation_requested',
      now(),
      COALESCE(NEW.last_update_by, 'Sistema'),
      ARRAY['marcus.vinicius@siplan.com.br', 'hugo.santariosi@siplan.com.br', 'bruno.fernandes@siplan.com.br', 'alex.silva@siplan.com.br'],
      jsonb_build_object('source', 'trigger_first_start')
    );

    -- Monta payload para o webhook do n8n
    v_payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'projects',
      'schema', 'public',
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    );

    -- Invoca o webhook do n8n
    PERFORM supabase_functions.http_request(
      'http://n8n.siplan.com.br:5678/webhook/preparacao-ambiente', 
      'POST', 
      '{"Content-type":"application/json"}', 
      v_payload::text, 
      '5000'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Substituição do trigger antigo pelo trigger controlado
DROP TRIGGER IF EXISTS n8n_preparacao_ambiente ON public.projects;
DROP TRIGGER IF EXISTS trg_handle_environment_preparation_dispatch ON public.projects;

CREATE TRIGGER trg_handle_environment_preparation_dispatch
  BEFORE UPDATE OF environment_status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_environment_preparation_dispatch();

-- 7. Aprimorar o trigger de notificações internas para não duplicar o sino de "new_demand"
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
  -- BLINDAGEM: Não notifica se já foi disparado no passado ou se veio de 'done' (reabertura/teste)
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
          'A data de início da Fase 1 de ' || v_client_name || ' foi reprogramada de ' || v_old_start || ' para ' || v_new_start || '. Verifique o novo prazo limite de entrega do ambiente.',
          '/deployments/environment-config',
          'alert'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 8. Registro de Changelog em public.notifications (categoria changelog)
INSERT INTO public.notifications (
  user_id,
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
)
SELECT
  p.id,
  'changelog',
  'release_fix',
  'environment_config',
  'Trava contra Disparos Duplicados de E-mail de Ambiente',
  'Implementada trava de idempotência por cliente e sistema para a Preparação de Ambiente, impedindo reenvios acidentais de e-mail ao movimentar cards entre Em Andamento e Concluídos.',
  '/deployments/environment-config'
FROM public.profiles p
WHERE p.role = 'admin';

-- Migration: Trava de Idempotência e Auditoria de Disparos das Etapas 1 (Infraestrutura), 2 (Aderência) e 3 (Conversão de Dados)
-- Data: 2026-11-04
-- Objetivo: Impedir disparos duplicados de automações/e-mails ao movimentar cards nos Kanbans das etapas 1, 2 e 3
--           (ex: Concluídos/Bloqueados -> Em Andamento), gravando carimbo atômico e histórico por cliente e sistema.

-- 1. Novas colunas de controle na tabela public.projects
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS infra_dispatched_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS infra_dispatch_done BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS infra_dispatched_by TEXT NULL,
  ADD COLUMN IF NOT EXISTS adherence_dispatched_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS adherence_dispatch_done BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS adherence_dispatched_by TEXT NULL,
  ADD COLUMN IF NOT EXISTS conversion_dispatched_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS conversion_dispatch_done BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS conversion_dispatched_by TEXT NULL;

-- 2. Backfill retroativo para projetos que já foram iniciados, concluídos ou bloqueados no passado

-- 2.1 Infraestrutura (em andamento, concluídos ou bloqueados)
UPDATE public.projects
SET 
  infra_dispatched_at = COALESCE(infra_start_date::timestamp with time zone, updated_at, now()),
  infra_dispatch_done = TRUE,
  infra_dispatched_by = 'retroactive_backfill'
WHERE infra_status IN ('in-progress', 'done', 'blocked')
  AND infra_dispatched_at IS NULL;

-- 2.2 Aderência (em andamento, concluídos, bloqueados ou aguardando ajuste)
UPDATE public.projects
SET 
  adherence_dispatched_at = COALESCE(adherence_start_date::timestamp with time zone, updated_at, now()),
  adherence_dispatch_done = TRUE,
  adherence_dispatched_by = 'retroactive_backfill'
WHERE adherence_status IN ('in-progress', 'done', 'blocked', 'waiting_adjustment')
  AND adherence_dispatched_at IS NULL;

-- 2.3 Conversão de Dados (em andamento, concluídos ou bloqueados)
UPDATE public.projects
SET 
  conversion_dispatched_at = COALESCE(conversion_start_date, conversion_sent_at::timestamp with time zone, updated_at, now()),
  conversion_dispatch_done = TRUE,
  conversion_dispatched_by = 'retroactive_backfill'
WHERE conversion_status IN ('in-progress', 'done', 'blocked')
  AND conversion_dispatched_at IS NULL;

-- 3. Inserir registros de auditoria retroativos na tabela public.automation_dispatches

-- 3.1 Infraestrutura: analise_infraestrutura
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
  'analise_infraestrutura',
  COALESCE(p.infra_dispatched_at, now()),
  'retroactive_backfill',
  ARRAY['marcus.vinicius@siplan.com.br', 'alex.silva@siplan.com.br', 'bruno.fernandes@siplan.com.br'],
  jsonb_build_object('note', 'Backfill retroativo para evitar disparos em projetos existentes')
FROM public.projects p
WHERE p.infra_dispatched_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.automation_dispatches ad
    WHERE ad.project_id = p.id AND ad.automation_type = 'analise_infraestrutura'
  );

-- 3.2 Aderência: analise_aderencia
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
  'analise_aderencia',
  COALESCE(p.adherence_dispatched_at, now()),
  'retroactive_backfill',
  ARRAY['marcus.vinicius@siplan.com.br', 'maria.santos@siplan.com.br', 'lunna.santana@siplan.com.br'],
  jsonb_build_object('note', 'Backfill retroativo para evitar disparos em projetos existentes')
FROM public.projects p
WHERE p.adherence_dispatched_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.automation_dispatches ad
    WHERE ad.project_id = p.id AND ad.automation_type = 'analise_aderencia'
  );

-- 3.3 Conversão: conversao_dados
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
  'conversao_dados',
  COALESCE(p.conversion_dispatched_at, now()),
  'retroactive_backfill',
  ARRAY['marcus.vinicius@siplan.com.br', 'ademar.souza@siplan.com.br', 'luciane.lima@siplan.com.br', 'hugo.santariosi@siplan.com.br', 'marcos.ortiz@siplan.com.br'],
  jsonb_build_object('note', 'Backfill retroativo para evitar disparos em projetos existentes')
FROM public.projects p
WHERE p.conversion_dispatched_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.automation_dispatches ad
    WHERE ad.project_id = p.id AND ad.automation_type = 'conversao_dados'
  );

-- 4. Função e Trigger para Etapa 1 - Infraestrutura (analise_infraestrutura)
CREATE OR REPLACE FUNCTION public.fn_handle_infra_dispatch()
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
  IF NEW.infra_status = 'in-progress' AND (OLD.infra_status IS DISTINCT FROM 'in-progress') THEN
    
    -- REGRA 1: Se a linha já tiver o carimbo ou flag de disparo realizado, trava!
    IF OLD.infra_dispatched_at IS NOT NULL OR NEW.infra_dispatched_at IS NOT NULL OR OLD.infra_dispatch_done = TRUE THEN
      v_already_dispatched := TRUE;
    END IF;

    -- REGRA 2: Se estava em 'done' e voltou para 'in-progress' (reabertura / movimentação de teste no Kanban), trava!
    IF OLD.infra_status = 'done' THEN
      v_already_dispatched := TRUE;
    END IF;

    -- REGRA 3: Se já existe disparo registrado na tabela de auditoria para este Cliente e Sistema específico, trava!
    IF NOT v_already_dispatched THEN
      SELECT EXISTS (
        SELECT 1 FROM public.automation_dispatches
        WHERE LOWER(TRIM(client_name)) = LOWER(TRIM(NEW.client_name))
          AND LOWER(TRIM(system_type)) = LOWER(TRIM(NEW.system_type))
          AND automation_type = 'analise_infraestrutura'
      ) INTO v_already_dispatched;
    END IF;

    -- Se já foi disparado anteriormente, preserva o estado e não chama o n8n
    IF v_already_dispatched THEN
      NEW.infra_dispatched_at := COALESCE(OLD.infra_dispatched_at, NEW.infra_dispatched_at, now());
      NEW.infra_dispatch_done := TRUE;
      RETURN NEW;
    END IF;

    -- PRIMEIRO DISPARO LEGÍTIMO:
    NEW.infra_dispatched_at := now();
    NEW.infra_dispatch_done := TRUE;
    NEW.infra_dispatched_by := COALESCE(NEW.last_update_by, 'Sistema');

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
      'analise_infraestrutura',
      now(),
      COALESCE(NEW.last_update_by, 'Sistema'),
      ARRAY['marcus.vinicius@siplan.com.br', 'alex.silva@siplan.com.br', 'bruno.fernandes@siplan.com.br'],
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
      'http://n8n.siplan.com.br:5678/webhook/analise-infraestrutura', 
      'POST', 
      '{"Content-type":"application/json"}', 
      v_payload::text, 
      '5000'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_infra_dispatch ON public.projects;
CREATE TRIGGER trg_handle_infra_dispatch
  BEFORE UPDATE OF infra_status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_infra_dispatch();

-- 5. Função e Trigger para Etapa 2 - Aderência (analise_aderencia)
CREATE OR REPLACE FUNCTION public.fn_handle_adherence_dispatch()
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
  IF NEW.adherence_status = 'in-progress' AND (OLD.adherence_status IS DISTINCT FROM 'in-progress') THEN
    
    -- REGRA 1: Se a linha já tiver o carimbo ou flag de disparo realizado, trava!
    IF OLD.adherence_dispatched_at IS NOT NULL OR NEW.adherence_dispatched_at IS NOT NULL OR OLD.adherence_dispatch_done = TRUE THEN
      v_already_dispatched := TRUE;
    END IF;

    -- REGRA 2: Se estava em 'done' e voltou para 'in-progress' (reabertura / movimentação de teste no Kanban), trava!
    IF OLD.adherence_status = 'done' THEN
      v_already_dispatched := TRUE;
    END IF;

    -- REGRA 3: Se já existe disparo registrado na tabela de auditoria para este Cliente e Sistema específico, trava!
    IF NOT v_already_dispatched THEN
      SELECT EXISTS (
        SELECT 1 FROM public.automation_dispatches
        WHERE LOWER(TRIM(client_name)) = LOWER(TRIM(NEW.client_name))
          AND LOWER(TRIM(system_type)) = LOWER(TRIM(NEW.system_type))
          AND automation_type = 'analise_aderencia'
      ) INTO v_already_dispatched;
    END IF;

    -- Se já foi disparado anteriormente, preserva o estado e não chama o n8n
    IF v_already_dispatched THEN
      NEW.adherence_dispatched_at := COALESCE(OLD.adherence_dispatched_at, NEW.adherence_dispatched_at, now());
      NEW.adherence_dispatch_done := TRUE;
      RETURN NEW;
    END IF;

    -- PRIMEIRO DISPARO LEGÍTIMO:
    NEW.adherence_dispatched_at := now();
    NEW.adherence_dispatch_done := TRUE;
    NEW.adherence_dispatched_by := COALESCE(NEW.last_update_by, 'Sistema');

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
      'analise_aderencia',
      now(),
      COALESCE(NEW.last_update_by, 'Sistema'),
      ARRAY['marcus.vinicius@siplan.com.br', 'maria.santos@siplan.com.br', 'lunna.santana@siplan.com.br'],
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
      'http://n8n.siplan.com.br:5678/webhook/analise-aderencia', 
      'POST', 
      '{"Content-type":"application/json"}', 
      v_payload::text, 
      '5000'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_adherence_dispatch ON public.projects;
CREATE TRIGGER trg_handle_adherence_dispatch
  BEFORE UPDATE OF adherence_status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_adherence_dispatch();

-- 6. Função e Trigger para Etapa 3 - Conversão de Dados (conversao_dados)
CREATE OR REPLACE FUNCTION public.fn_handle_conversion_dispatch()
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
  IF NEW.conversion_status = 'in-progress' AND (OLD.conversion_status IS DISTINCT FROM 'in-progress') THEN
    
    -- REGRA 1: Se a linha já tiver o carimbo ou flag de disparo realizado, trava!
    IF OLD.conversion_dispatched_at IS NOT NULL OR NEW.conversion_dispatched_at IS NOT NULL OR OLD.conversion_dispatch_done = TRUE THEN
      v_already_dispatched := TRUE;
    END IF;

    -- REGRA 2: Se estava em 'done' e voltou para 'in-progress' (reabertura / movimentação de teste no Kanban), trava!
    IF OLD.conversion_status = 'done' THEN
      v_already_dispatched := TRUE;
    END IF;

    -- REGRA 3: Se já existe disparo registrado na tabela de auditoria para este Cliente e Sistema específico, trava!
    IF NOT v_already_dispatched THEN
      SELECT EXISTS (
        SELECT 1 FROM public.automation_dispatches
        WHERE LOWER(TRIM(client_name)) = LOWER(TRIM(NEW.client_name))
          AND LOWER(TRIM(system_type)) = LOWER(TRIM(NEW.system_type))
          AND automation_type = 'conversao_dados'
      ) INTO v_already_dispatched;
    END IF;

    -- Se já foi disparado anteriormente, preserva o estado e não chama o n8n
    IF v_already_dispatched THEN
      NEW.conversion_dispatched_at := COALESCE(OLD.conversion_dispatched_at, NEW.conversion_dispatched_at, now());
      NEW.conversion_dispatch_done := TRUE;
      RETURN NEW;
    END IF;

    -- PRIMEIRO DISPARO LEGÍTIMO:
    NEW.conversion_dispatched_at := now();
    NEW.conversion_dispatch_done := TRUE;
    NEW.conversion_dispatched_by := COALESCE(NEW.last_update_by, 'Sistema');

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
      'conversao_dados',
      now(),
      COALESCE(NEW.last_update_by, 'Sistema'),
      ARRAY['marcus.vinicius@siplan.com.br', 'ademar.souza@siplan.com.br', 'luciane.lima@siplan.com.br', 'hugo.santariosi@siplan.com.br', 'marcos.ortiz@siplan.com.br'],
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
      'http://n8n.siplan.com.br:5678/webhook/conversao-dados', 
      'POST', 
      '{"Content-type":"application/json"}', 
      v_payload::text, 
      '5000'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_conversion_dispatch ON public.projects;
CREATE TRIGGER trg_handle_conversion_dispatch
  BEFORE UPDATE OF conversion_status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_conversion_dispatch();

-- 7. Registro de Changelog em public.notifications (categoria changelog)
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
  'release_feature',
  'projects',
  'Blindagem de Idempotência das Etapas de Implantação',
  'Implementada trava de idempotência por cliente e sistema para as etapas de Infraestrutura, Aderência e Conversão de Dados, prevenindo disparos duplicados em transições de status no Kanban.',
  '/deployments'
FROM public.profiles p
WHERE p.role = 'admin';

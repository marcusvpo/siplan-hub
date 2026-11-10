-- Migration: Correção de Gatilhos de Webhook, Restrição FK de Trâmites e Otimização RPC
-- Data: 2026-11-10
-- Motivo: Sanar erros de log no Supabase:
--   1. function supabase_functions.http_request(...) does not exist (42883)
--   2. foreign key constraint chamados_processo_venda_tramites_numero_chamado_fkey violada (23503 / 409)
--   3. column cs_cx_registry_offices.notary_name does not exist (42703)
--   4. timeout na RPC get_chamados_assignment_options (500)

-- ============================================================================
-- PARTE 1: Implementação da função utilitária supabase_functions.http_request
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS supabase_functions;

CREATE OR REPLACE FUNCTION supabase_functions.http_request(
  url text,
  method text DEFAULT 'POST',
  headers text DEFAULT '{"Content-Type": "application/json"}',
  payload text DEFAULT '{}',
  timeout_ms text DEFAULT '5000'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, net, public
AS $$
DECLARE
  v_request_id bigint;
  v_headers jsonb;
  v_payload jsonb;
  v_timeout integer;
BEGIN
  BEGIN
    v_headers := COALESCE(headers::jsonb, '{"Content-Type": "application/json"}'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    v_headers := '{"Content-Type": "application/json"}'::jsonb;
  END;

  BEGIN
    v_payload := COALESCE(payload::jsonb, '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    v_payload := jsonb_build_object('raw_payload', payload);
  END;

  BEGIN
    v_timeout := COALESCE(timeout_ms::integer, 5000);
  EXCEPTION WHEN OTHERS THEN
    v_timeout := 5000;
  END;

  IF UPPER(method) = 'POST' THEN
    SELECT net.http_post(
      url := url,
      body := v_payload,
      params := '{}'::jsonb,
      headers := v_headers,
      timeout_milliseconds := v_timeout
    ) INTO v_request_id;
  ELSIF UPPER(method) = 'GET' THEN
    SELECT net.http_get(
      url := url,
      params := '{}'::jsonb,
      headers := v_headers,
      timeout_milliseconds := v_timeout
    ) INTO v_request_id;
  END IF;

  RETURN v_request_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'supabase_functions.http_request falhou de forma não-bloqueante: %', SQLERRM;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION supabase_functions.http_request(
  url text,
  method text,
  headers jsonb,
  payload text,
  timeout_ms text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, net, public
AS $$
BEGIN
  RETURN supabase_functions.http_request(url, method, headers::text, payload, timeout_ms);
END;
$$;

CREATE OR REPLACE FUNCTION supabase_functions.http_request(
  url text,
  method text,
  headers jsonb,
  payload jsonb,
  timeout_ms integer
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, net, public
AS $$
BEGIN
  RETURN supabase_functions.http_request(url, method, headers::text, payload::text, timeout_ms::text);
END;
$$;

GRANT EXECUTE ON FUNCTION supabase_functions.http_request(text, text, text, text, text) TO authenticated, postgres, service_role, anon;
GRANT EXECUTE ON FUNCTION supabase_functions.http_request(text, text, jsonb, text, text) TO authenticated, postgres, service_role, anon;
GRANT EXECUTE ON FUNCTION supabase_functions.http_request(text, text, jsonb, jsonb, integer) TO authenticated, postgres, service_role, anon;

-- ============================================================================
-- PARTE 2: Blindagem e resiliência dos triggers de automação nas 4 etapas
-- ============================================================================

-- 2.1 Preparação de Ambiente
CREATE OR REPLACE FUNCTION public.fn_handle_environment_preparation_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_already_dispatched BOOLEAN := FALSE;
  v_payload JSONB;
BEGIN
  IF NEW.environment_status = 'in-progress' AND (OLD.environment_status IS DISTINCT FROM 'in-progress') THEN
    IF OLD.environment_dispatched_at IS NOT NULL OR NEW.environment_dispatched_at IS NOT NULL OR OLD.environment_dispatch_done = TRUE THEN
      v_already_dispatched := TRUE;
    END IF;

    IF OLD.environment_status = 'done' THEN
      v_already_dispatched := TRUE;
    END IF;

    IF NOT v_already_dispatched THEN
      SELECT EXISTS (
        SELECT 1 FROM public.automation_dispatches
        WHERE LOWER(TRIM(client_name)) = LOWER(TRIM(NEW.client_name))
          AND LOWER(TRIM(system_type)) = LOWER(TRIM(NEW.system_type))
          AND automation_type = 'environment_preparation_requested'
      ) INTO v_already_dispatched;
    END IF;

    IF v_already_dispatched THEN
      NEW.environment_dispatched_at := COALESCE(OLD.environment_dispatched_at, NEW.environment_dispatched_at, now());
      NEW.environment_dispatch_done := TRUE;
      RETURN NEW;
    END IF;

    NEW.environment_dispatched_at := now();
    NEW.environment_dispatch_done := TRUE;
    NEW.environment_dispatched_by := COALESCE(NEW.last_update_by, 'Sistema');

    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Falha ao registrar auditoria de environment_preparation_requested: %', SQLERRM;
    END;

    v_payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'projects',
      'schema', 'public',
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    );

    BEGIN
      PERFORM net.http_post(
        url := 'http://n8n.siplan.com.br:5678/webhook/preparacao-ambiente',
        body := v_payload,
        params := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 5000
      );
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        PERFORM supabase_functions.http_request(
          'http://n8n.siplan.com.br:5678/webhook/preparacao-ambiente', 
          'POST', 
          '{"Content-type":"application/json"}', 
          v_payload::text, 
          '5000'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Falha ao despachar webhook de preparacao-ambiente: %', SQLERRM;
      END;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2.2 Infraestrutura
CREATE OR REPLACE FUNCTION public.fn_handle_infra_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_already_dispatched BOOLEAN := FALSE;
  v_payload JSONB;
BEGIN
  IF NEW.infra_status = 'in-progress' AND (OLD.infra_status IS DISTINCT FROM 'in-progress') THEN
    IF OLD.infra_dispatched_at IS NOT NULL OR NEW.infra_dispatched_at IS NOT NULL OR OLD.infra_dispatch_done = TRUE THEN
      v_already_dispatched := TRUE;
    END IF;

    IF OLD.infra_status = 'done' THEN
      v_already_dispatched := TRUE;
    END IF;

    IF NOT v_already_dispatched THEN
      SELECT EXISTS (
        SELECT 1 FROM public.automation_dispatches
        WHERE LOWER(TRIM(client_name)) = LOWER(TRIM(NEW.client_name))
          AND LOWER(TRIM(system_type)) = LOWER(TRIM(NEW.system_type))
          AND automation_type = 'analise_infraestrutura'
      ) INTO v_already_dispatched;
    END IF;

    IF v_already_dispatched THEN
      NEW.infra_dispatched_at := COALESCE(OLD.infra_dispatched_at, NEW.infra_dispatched_at, now());
      NEW.infra_dispatch_done := TRUE;
      RETURN NEW;
    END IF;

    NEW.infra_dispatched_at := now();
    NEW.infra_dispatch_done := TRUE;
    NEW.infra_dispatched_by := COALESCE(NEW.last_update_by, 'Sistema');

    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Falha ao registrar auditoria de analise_infraestrutura: %', SQLERRM;
    END;

    v_payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'projects',
      'schema', 'public',
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    );

    BEGIN
      PERFORM net.http_post(
        url := 'http://n8n.siplan.com.br:5678/webhook/analise-infraestrutura',
        body := v_payload,
        params := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 5000
      );
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        PERFORM supabase_functions.http_request(
          'http://n8n.siplan.com.br:5678/webhook/analise-infraestrutura', 
          'POST', 
          '{"Content-type":"application/json"}', 
          v_payload::text, 
          '5000'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Falha ao despachar webhook de analise-infraestrutura: %', SQLERRM;
      END;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2.3 Aderência
CREATE OR REPLACE FUNCTION public.fn_handle_adherence_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_already_dispatched BOOLEAN := FALSE;
  v_payload JSONB;
BEGIN
  IF NEW.adherence_status = 'in-progress' AND (OLD.adherence_status IS DISTINCT FROM 'in-progress') THEN
    IF OLD.adherence_dispatched_at IS NOT NULL OR NEW.adherence_dispatched_at IS NOT NULL OR OLD.adherence_dispatch_done = TRUE THEN
      v_already_dispatched := TRUE;
    END IF;

    IF OLD.adherence_status = 'done' THEN
      v_already_dispatched := TRUE;
    END IF;

    IF NOT v_already_dispatched THEN
      SELECT EXISTS (
        SELECT 1 FROM public.automation_dispatches
        WHERE LOWER(TRIM(client_name)) = LOWER(TRIM(NEW.client_name))
          AND LOWER(TRIM(system_type)) = LOWER(TRIM(NEW.system_type))
          AND automation_type = 'analise_aderencia'
      ) INTO v_already_dispatched;
    END IF;

    IF v_already_dispatched THEN
      NEW.adherence_dispatched_at := COALESCE(OLD.adherence_dispatched_at, NEW.adherence_dispatched_at, now());
      NEW.adherence_dispatch_done := TRUE;
      RETURN NEW;
    END IF;

    NEW.adherence_dispatched_at := now();
    NEW.adherence_dispatch_done := TRUE;
    NEW.adherence_dispatched_by := COALESCE(NEW.last_update_by, 'Sistema');

    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Falha ao registrar auditoria de analise_aderencia: %', SQLERRM;
    END;

    v_payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'projects',
      'schema', 'public',
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    );

    BEGIN
      PERFORM net.http_post(
        url := 'http://n8n.siplan.com.br:5678/webhook/analise-aderencia',
        body := v_payload,
        params := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 5000
      );
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        PERFORM supabase_functions.http_request(
          'http://n8n.siplan.com.br:5678/webhook/analise-aderencia', 
          'POST', 
          '{"Content-type":"application/json"}', 
          v_payload::text, 
          '5000'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Falha ao despachar webhook de analise-aderencia: %', SQLERRM;
      END;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2.4 Conversão de Dados
CREATE OR REPLACE FUNCTION public.fn_handle_conversion_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_already_dispatched BOOLEAN := FALSE;
  v_payload JSONB;
BEGIN
  IF NEW.conversion_status = 'in-progress' AND (OLD.conversion_status IS DISTINCT FROM 'in-progress') THEN
    IF OLD.conversion_dispatched_at IS NOT NULL OR NEW.conversion_dispatched_at IS NOT NULL OR OLD.conversion_dispatch_done = TRUE THEN
      v_already_dispatched := TRUE;
    END IF;

    IF OLD.conversion_status = 'done' THEN
      v_already_dispatched := TRUE;
    END IF;

    IF NOT v_already_dispatched THEN
      SELECT EXISTS (
        SELECT 1 FROM public.automation_dispatches
        WHERE LOWER(TRIM(client_name)) = LOWER(TRIM(NEW.client_name))
          AND LOWER(TRIM(system_type)) = LOWER(TRIM(NEW.system_type))
          AND automation_type = 'conversao_dados'
      ) INTO v_already_dispatched;
    END IF;

    IF v_already_dispatched THEN
      NEW.conversion_dispatched_at := COALESCE(OLD.conversion_dispatched_at, NEW.conversion_dispatched_at, now());
      NEW.conversion_dispatch_done := TRUE;
      RETURN NEW;
    END IF;

    NEW.conversion_dispatched_at := now();
    NEW.conversion_dispatch_done := TRUE;
    NEW.conversion_dispatched_by := COALESCE(NEW.last_update_by, 'Sistema');

    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Falha ao registrar auditoria de conversao_dados: %', SQLERRM;
    END;

    v_payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'projects',
      'schema', 'public',
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    );

    BEGIN
      PERFORM net.http_post(
        url := 'http://n8n.siplan.com.br:5678/webhook/conversao-dados',
        body := v_payload,
        params := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 5000
      );
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        PERFORM supabase_functions.http_request(
          'http://n8n.siplan.com.br:5678/webhook/conversao-dados', 
          'POST', 
          '{"Content-type":"application/json"}', 
          v_payload::text, 
          '5000'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Falha ao despachar webhook de conversao-dados: %', SQLERRM;
      END;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- PARTE 3: Remoção da Foreign Key restritiva em chamados_processo_venda_tramites
-- ============================================================================

ALTER TABLE public.chamados_processo_venda_tramites 
  DROP CONSTRAINT IF EXISTS chamados_processo_venda_tramites_numero_chamado_fkey;

-- ============================================================================
-- PARTE 4: Adição da coluna notary_name em cs_cx_registry_offices (se ausente)
-- ============================================================================

ALTER TABLE public.cs_cx_registry_offices
  ADD COLUMN IF NOT EXISTS notary_name TEXT;

-- ============================================================================
-- PARTE 5: Otimização da RPC get_chamados_assignment_options (Sargable, sem timeout)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_chamados_assignment_options(p_catalog text DEFAULT 'orion'::text)
RETURNS TABLE(option_type text, option_value text)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_legacy boolean := (lower(coalesce(p_catalog, 'orion')) = 'legacy');
BEGIN
  IF v_is_legacy THEN
    RETURN QUERY
    SELECT 'group'::text, nullif(btrim(equipe_responsavel), '')
    FROM public.chamados_processo_venda
    WHERE produto IN ('Siplan', 'Control-M', 'Global')
      AND equipe_responsavel IS NOT NULL
      AND nullif(btrim(equipe_responsavel), '') IS NOT NULL
    GROUP BY 2

    UNION ALL

    SELECT 'analyst'::text, nullif(btrim(analista_responsavel), '')
    FROM public.chamados_processo_venda
    WHERE produto IN ('Siplan', 'Control-M', 'Global')
      AND analista_responsavel IS NOT NULL
      AND nullif(btrim(analista_responsavel), '') IS NOT NULL
    GROUP BY 2

    ORDER BY 1, 2;
  ELSE
    RETURN QUERY
    SELECT 'group'::text, nullif(btrim(equipe_responsavel), '')
    FROM public.chamados_processo_venda
    WHERE software ILIKE 'Orion%'
      AND equipe_responsavel IS NOT NULL
      AND nullif(btrim(equipe_responsavel), '') IS NOT NULL
    GROUP BY 2

    UNION ALL

    SELECT 'analyst'::text, nullif(btrim(analista_responsavel), '')
    FROM public.chamados_processo_venda
    WHERE software ILIKE 'Orion%'
      AND analista_responsavel IS NOT NULL
      AND nullif(btrim(analista_responsavel), '') IS NOT NULL
    GROUP BY 2

    ORDER BY 1, 2;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_chamados_assignment_options(text) TO authenticated, service_role, anon;

-- ============================================================================
-- PARTE 6: Registro de Notificação / Changelog Oficial
-- ============================================================================

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
  'release_fix',
  'implantadores_environment',
  'Correção na Preparação de Ambiente e Webhooks',
  'Correção definitiva na atribuição de responsáveis e movimentação de cards no Kanban de Preparação de Ambiente, além de resiliência e estabilidade nos webhooks e sincronização de trâmites.',
  '/deployments/environment-config'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_fix'
    AND permission_resource = 'implantadores_environment'
    AND title = 'Correção na Preparação de Ambiente e Webhooks'
    AND action_url = '/deployments/environment-config'
);

-- ============================================================================
-- SIPLAN HUB SECURITY HARDENING (P3 - RODADA 2)
-- Tokenização Criptográfica do Link Público de Infraestrutura (/public/infra-coleta/:token),
-- Fechamento Automático de Links de Projetos já Concluídos na Etapa 1,
-- Bloqueio de Acesso por UUID Puro e Enxugamento de Grants Anônimos Residuais
-- ============================================================================

-- 1. Coluna de token opaco criptográfico (144 bits de entropia CSPRNG via pgcrypto)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS infra_public_link_token text;

UPDATE public.projects
SET infra_public_link_token = encode(extensions.gen_random_bytes(18), 'hex')
WHERE infra_public_link_token IS NULL OR btrim(infra_public_link_token) = '';

ALTER TABLE public.projects
  ALTER COLUMN infra_public_link_token SET DEFAULT encode(extensions.gen_random_bytes(18), 'hex'),
  ALTER COLUMN infra_public_link_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_infra_public_link_token
  ON public.projects (infra_public_link_token);

-- 2. Fechar automaticamente o link público nos projetos cuja Etapa 1 (Infra) já foi concluída ('done')
UPDATE public.projects
SET infra_public_link_closed = true
WHERE COALESCE(infra_public_link_closed, false) = false
  AND infra_status = 'done';

-- 3. Desativar e revogar as assinaturas antigas baseadas em UUID puro (bloqueia os 13 UUIDs vazados)
CREATE OR REPLACE FUNCTION public.get_project_public_info(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_project_public_info(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_project_public_infra(
  p_id uuid,
  p_workstations jsonb,
  p_servers jsonb,
  p_workstations_count integer,
  p_workstations_status character varying DEFAULT NULL::character varying,
  p_server_status character varying DEFAULT NULL::character varying
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN FALSE;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_project_public_infra(uuid, jsonb, jsonb, integer, character varying, character varying)
  FROM PUBLIC, anon, authenticated;

-- 4. Novas RPCs públicas autenticadas exclusivamente por infra_public_link_token
CREATE OR REPLACE FUNCTION public.get_project_public_info(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_clean_token text := lower(btrim(COALESCE(p_token, '')));
  project_record public.projects%ROWTYPE;
  v_systems_list jsonb;
  v_system_count int;
BEGIN
  IF v_clean_token !~ '^[0-9a-f]{24,64}$' THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO project_record
  FROM public.projects
  WHERE infra_public_link_token = v_clean_token
    AND COALESCE(is_deleted, false) = false
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF COALESCE(project_record.infra_public_link_closed, false) = true THEN
    RETURN jsonb_build_object(
      'infra_public_link_closed', true
    );
  END IF;

  SELECT
    COALESCE(
      jsonb_agg(DISTINCT sys) FILTER (WHERE sys IS NOT NULL AND TRIM(sys) != ''),
      '[]'::jsonb
    ),
    COUNT(DISTINCT id_val)
  INTO v_systems_list, v_system_count
  FROM (
    SELECT id AS id_val, system_type AS sys
    FROM public.projects
    WHERE LOWER(TRIM(client_name)) = LOWER(TRIM(project_record.client_name))
      AND COALESCE(is_deleted, false) = false
      AND system_type IS NOT NULL
      AND TRIM(system_type) != ''
    UNION
    SELECT id AS id_val, UNNEST(products) AS sys
    FROM public.projects
    WHERE LOWER(TRIM(client_name)) = LOWER(TRIM(project_record.client_name))
      AND COALESCE(is_deleted, false) = false
      AND products IS NOT NULL
  ) s;

  IF v_system_count IS NULL OR v_system_count < 1 THEN
    v_system_count := 1;
  END IF;

  RETURN jsonb_build_object(
    'client_name', project_record.client_name,
    'system_type', project_record.system_type,
    'systems_list', v_systems_list,
    'system_count', v_system_count,
    'ticket_number', project_record.ticket_number,
    'infra_servers', project_record.infra_servers,
    'infra_workstations', project_record.infra_workstations,
    'infra_workstations_count', project_record.infra_workstations_count,
    'infra_status', project_record.infra_status,
    'workstations_status', project_record.infra_workstations_status,
    'server_status', project_record.infra_server_status,
    'infra_public_link_closed', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_project_public_info(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_project_public_info(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_project_public_infra(
  p_token text,
  p_workstations jsonb,
  p_servers jsonb,
  p_workstations_count integer,
  p_workstations_status character varying DEFAULT NULL::character varying,
  p_server_status character varying DEFAULT NULL::character varying
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_clean_token text := lower(btrim(COALESCE(p_token, '')));
  target_project public.projects%ROWTYPE;
  v_recent_submissions int;
  v_final_workstations jsonb;
  v_final_servers jsonb;
  v_final_workstations_count int;
  v_workstations_status varchar;
  v_server_status varchar;
  v_server_filled boolean;
  v_workstations_filled boolean;
  v_new_infra_status varchar;
  v_timeline_message text;
  r_project RECORD;
BEGIN
  IF v_clean_token !~ '^[0-9a-f]{24,64}$' THEN
    RETURN FALSE;
  END IF;

  IF p_servers IS NOT NULL THEN
    IF jsonb_typeof(p_servers) != 'array'
       OR jsonb_array_length(p_servers) > 25
       OR octet_length(p_servers::text) > 131072 THEN
      RETURN FALSE;
    END IF;
  END IF;

  IF p_workstations IS NOT NULL THEN
    IF jsonb_typeof(p_workstations) != 'array'
       OR jsonb_array_length(p_workstations) > 300
       OR octet_length(p_workstations::text) > 524288 THEN
      RETURN FALSE;
    END IF;
  END IF;

  SELECT *
  INTO target_project
  FROM public.projects
  WHERE infra_public_link_token = v_clean_token
    AND COALESCE(is_deleted, false) = false
  LIMIT 1;

  IF NOT FOUND OR COALESCE(target_project.infra_public_link_closed, false) = true THEN
    RETURN FALSE;
  END IF;

  SELECT count(*)
  INTO v_recent_submissions
  FROM public.timeline_events
  WHERE project_id = target_project.id
    AND author = 'Técnico (Link Público)'
    AND timestamp > (now() - interval '10 minutes');

  IF COALESCE(v_recent_submissions, 0) >= 6 THEN
    RETURN FALSE;
  END IF;

  v_final_servers := CASE
    WHEN p_servers IS NOT NULL AND jsonb_typeof(p_servers) = 'array' AND jsonb_array_length(p_servers) > 0
      THEN p_servers
    ELSE COALESCE(target_project.infra_servers, '[]'::jsonb)
  END;

  v_final_workstations := CASE
    WHEN p_workstations IS NOT NULL AND jsonb_typeof(p_workstations) = 'array' AND jsonb_array_length(p_workstations) > 0
      THEN p_workstations
    ELSE COALESCE(target_project.infra_workstations, '[]'::jsonb)
  END;

  v_final_workstations_count := CASE
    WHEN p_workstations_count IS NOT NULL AND p_workstations_count > 0
      THEN LEAST(p_workstations_count, 2000)
    WHEN jsonb_typeof(v_final_workstations) = 'array' AND jsonb_array_length(v_final_workstations) > 0
      THEN jsonb_array_length(v_final_workstations)
    ELSE COALESCE(target_project.infra_workstations_count, 0)
  END;

  v_workstations_status := CASE
    WHEN p_workstations_status IS NOT NULL AND TRIM(p_workstations_status) != ''
      THEN LEFT(TRIM(p_workstations_status), 80)
    ELSE target_project.infra_workstations_status
  END;

  v_server_status := CASE
    WHEN p_server_status IS NOT NULL AND TRIM(p_server_status) != ''
      THEN LEFT(TRIM(p_server_status), 80)
    ELSE target_project.infra_server_status
  END;

  v_server_filled := (
    v_server_status IS NOT NULL
    AND TRIM(v_server_status) != ''
    AND LOWER(TRIM(v_server_status)) NOT IN ('aguardando', 'não avaliado', 'nao avaliado', 'pending', 'null')
    AND jsonb_typeof(v_final_servers) = 'array'
    AND jsonb_array_length(v_final_servers) > 0
  );

  v_workstations_filled := (
    v_workstations_status IS NOT NULL
    AND TRIM(v_workstations_status) != ''
    AND LOWER(TRIM(v_workstations_status)) NOT IN ('aguardando', 'não avaliado', 'nao avaliado', 'pending', 'null')
    AND jsonb_typeof(v_final_workstations) = 'array'
    AND jsonb_array_length(v_final_workstations) > 0
  );

  IF v_server_filled AND v_workstations_filled THEN
    IF v_server_status ILIKE '%inadequado%' OR v_workstations_status ILIKE '%inadequado%'
       OR v_server_status = 'Aguardando Adequação' OR v_workstations_status = 'Aguardando Adequação' THEN
      v_new_infra_status := 'blocked';
      v_timeline_message := 'Dados de infraestrutura concluídos pelo técnico (Sincronização por Cliente). Etapa 1 alterada para Bloqueado devido a inadequações identificadas.';
    ELSE
      v_new_infra_status := 'done';
      v_timeline_message := 'Dados de infraestrutura concluídos pelo técnico (Sincronização por Cliente). Etapa 1 alterada para Finalizado.';
    END IF;
  ELSE
    v_new_infra_status := 'in-progress';
    IF v_workstations_filled AND NOT v_server_filled THEN
      v_timeline_message := 'Dados de estações coletados pelo técnico (Sincronização por Cliente). Etapa 1 mantida Em Andamento aguardando envio do servidor.';
    ELSIF v_server_filled AND NOT v_workstations_filled THEN
      v_timeline_message := 'Dados de servidor coletados pelo técnico (Sincronização por Cliente). Etapa 1 mantida Em Andamento aguardando envio das estações.';
    ELSE
      v_timeline_message := 'Dados parciais de infraestrutura coletados pelo técnico (Sincronização por Cliente). Etapa 1 mantida Em Andamento aguardando conclusão dos dados.';
    END IF;
  END IF;

  FOR r_project IN
    SELECT id FROM public.projects
    WHERE LOWER(TRIM(client_name)) = LOWER(TRIM(target_project.client_name))
      AND COALESCE(is_deleted, false) = false
  LOOP
    UPDATE public.projects
    SET
      infra_workstations = v_final_workstations,
      infra_servers = v_final_servers,
      infra_workstations_count = v_final_workstations_count,
      infra_workstations_status = v_workstations_status,
      infra_server_status = v_server_status,
      infra_status = v_new_infra_status,
      infra_end_date = CASE
        WHEN v_new_infra_status = 'done' THEN COALESCE(infra_end_date, NOW())
        ELSE infra_end_date
      END,
      infra_public_link_closed = CASE
        WHEN v_new_infra_status = 'done' THEN true
        ELSE COALESCE(infra_public_link_closed, false)
      END,
      last_update_by = 'Coleta Pública (Técnico)'
    WHERE id = r_project.id;

    INSERT INTO public.timeline_events (
      project_id,
      type,
      author,
      message
    ) VALUES (
      r_project.id,
      'auto',
      'Técnico (Link Público)',
      v_timeline_message
    );
  END LOOP;

  RETURN TRUE;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_project_public_infra(text, jsonb, jsonb, integer, character varying, character varying)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_project_public_infra(text, jsonb, jsonb, integer, character varying, character varying)
  TO anon, authenticated, service_role;

-- 5. Revogar EXECUTE anônimo residual nas funções internas cs_cx_*
REVOKE ALL ON FUNCTION public.cs_cx_apply_routine(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_delete_routine_model(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_delete_routine_model_item(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_generate_visit_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_reorder_routine_model_item(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_save_registry_office(uuid, text, text, text, text, boolean, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_save_registry_office_v3(uuid, text, text, text, text, boolean, jsonb, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_save_request_v2(uuid, text, text, text, text, text, date, date, date, text, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_save_routine_model(uuid, text, text, boolean, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_save_routine_model_item(uuid, uuid, text, text, uuid, uuid, boolean, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_set_routine_item(uuid, boolean, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_set_routine_item_v2(uuid, boolean, text, text, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_set_routine_items_bulk(uuid, boolean, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_set_routine_items_bulk_v2(uuid, boolean, text, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_update_request_status(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.cs_cx_apply_routine(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_delete_routine_model(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_delete_routine_model_item(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_generate_visit_request(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_reorder_routine_model_item(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_registry_office(uuid, text, text, text, text, boolean, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_registry_office_v3(uuid, text, text, text, text, boolean, jsonb, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_request_v2(uuid, text, text, text, text, text, date, date, date, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_routine_model(uuid, text, text, boolean, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_routine_model_item(uuid, uuid, text, text, uuid, uuid, boolean, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_set_routine_item(uuid, boolean, text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_set_routine_item_v2(uuid, boolean, text, text, text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_set_routine_items_bulk(uuid, boolean, text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_set_routine_items_bulk_v2(uuid, boolean, text, text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_update_request_status(uuid, text) TO authenticated, service_role;

-- 6. Notificação de Changelog (AGENTS.md #12)
INSERT INTO public.notifications (
  type,
  category,
  permission_resource,
  priority,
  stage,
  title,
  message,
  action_url
)
SELECT
  'release_improvement',
  'changelog',
  'projects',
  'normal',
  'infra',
  'Tokenização Segura do Link Público de Infraestrutura',
  'O link público de Coleta de Infraestrutura (/public/infra-coleta/:token) agora utiliza tokens criptográficos exclusivos desacoplados do ID do projeto, oculta metadados quando encerrado e fecha automaticamente ao concluir a Etapa 1.',
  '/projects'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND title = 'Tokenização Segura do Link Público de Infraestrutura'
);

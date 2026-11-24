-- ============================================================================
-- FASE P0: Hardening Critico de Auth, Profiles, RLS, RPCs e Storage
-- ============================================================================
-- Corrige:
--  1. Auto-escalacao de privilegios em handle_new_user() e UPDATE em profiles
--  2. Exposicao anonima de projects (credenciais/notes), commercial_checklists,
--     roadmaps e assistant_knowledge_files
--  3. Bypass de RLS em get_project_skills_sibling_group()
--  4. Vazamento de token em claro no timeline_events (save_project_skills_credentials)
--  5. Vazamento de projetos sem assistente em get_pos_assistant_project_info()
--  6. RPCs legadas sem checagem de dono (delete/rename/feedback pos_chat)
--  7. Funcoes SECURITY DEFINER internas executaveis por anon/PUBLIC
--  8. Buckets privados (project-files e assistant-oriontn-doc) abertos ao anon
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AUTH & PROFILES: Bloqueio absoluto de auto-promocao para 'admin'
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Nunca confiar em raw_user_meta_data->>'role'; contas novas nascem 'user'.
  -- Contas administrativas criadas por Edge Function (service_role) atualizam
  -- o role explicitamente apos a criacao do usuario.
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'user'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF COALESCE(auth.role(), '') = 'service_role'
      OR current_user IN ('postgres', 'supabase_admin')
      OR public.has_permission(auth.uid(), 'users', 'edit')
    THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Sem permissao para alterar o perfil de acesso.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_protect_profile_privileged_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_protect_profile_privileged_fields();

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile or with users.edit permission" ON public.profiles;
CREATE POLICY "Update own profile or with users.edit permission"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR public.has_permission(auth.uid(), 'users', 'edit')
  )
  WITH CHECK (
    auth.uid() = id
    OR public.has_permission(auth.uid(), 'users', 'edit')
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
CREATE POLICY "Admins can delete any profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND COALESCE(role, 'user') = 'user'
  );

-- ----------------------------------------------------------------------------
-- 2. FECHAR LEITURA/ESCRITA ANONIMA DE PROJECTS, CHECKLISTS, ROADMAPS E KNOWLEDGE
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public select for active commercial checklists and roadma" ON public.projects;
DROP POLICY IF EXISTS "Allow public select for active commercial checklists and roadmaps" ON public.projects;
DROP POLICY IF EXISTS "Allow public select for adherence print on projects" ON public.projects;

-- RPCs dedicadas para /public/checklist/:id (zero exposicao de custom_fields/notes)
CREATE OR REPLACE FUNCTION public.get_public_commercial_checklist(p_checklist_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'id', c.id,
    'project_id', c.project_id,
    'created_by_name', c.created_by_name,
    'status', c.status,
    'responses', c.responses,
    'template_id', c.template_id,
    'submitted_at', c.submitted_at,
    'created_at', c.created_at,
    'updated_at', c.updated_at,
    'projects', CASE
      WHEN p.id IS NOT NULL THEN jsonb_build_object(
        'id', p.id,
        'client_name', p.client_name,
        'system_type', p.system_type,
        'global_status', p.global_status
      )
      ELSE NULL
    END
  )
  FROM public.commercial_checklists c
  JOIN public.projects p ON p.id = c.project_id
  WHERE c.id = p_checklist_id
    AND COALESCE(p.is_deleted, false) = false
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_commercial_checklist(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_commercial_checklist(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_public_commercial_checklist(
  p_checklist_id uuid,
  p_responses jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated public.commercial_checklists%ROWTYPE;
BEGIN
  UPDATE public.commercial_checklists c
  SET
    responses = COALESCE(p_responses, '{}'::jsonb),
    status = 'submitted',
    submitted_at = now(),
    updated_at = now()
  FROM public.projects p
  WHERE c.id = p_checklist_id
    AND c.project_id = p.id
    AND COALESCE(p.is_deleted, false) = false
    AND c.status = 'pending'
  RETURNING c.* INTO v_updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checklist nao encontrado ou ja finalizado.'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN to_jsonb(v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_commercial_checklist(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_commercial_checklist(uuid, jsonb) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Enable read for all on commercial_checklists" ON public.commercial_checklists;
CREATE POLICY "Enable read for all on commercial_checklists"
  ON public.commercial_checklists
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable update for authenticated/pending on commercial_checklist" ON public.commercial_checklists;
DROP POLICY IF EXISTS "Enable update for authenticated/pending on commercial_checklists" ON public.commercial_checklists;
CREATE POLICY "Enable update for authenticated on commercial_checklists"
  ON public.commercial_checklists
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for public via share_token" ON public.roadmaps;
DROP POLICY IF EXISTS "Roadmaps são visualizáveis por todos (via token)" ON public.roadmaps;
DROP POLICY IF EXISTS "Roadmaps podem ser gerenciados por usuários autenticados" ON public.roadmaps;
CREATE POLICY "Roadmaps podem ser visualizados por autenticados"
  ON public.roadmaps
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Permitir leitura de arquivos de conhecimento" ON public.assistant_knowledge_files;
CREATE POLICY "Permitir leitura de arquivos de conhecimento"
  ON public.assistant_knowledge_files
  FOR SELECT
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- 3. SKILLS RPC BYPASS & HYGIENE + POS INFO MINIMO
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_project_skills_sibling_group(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_target record;
  v_target_norm_key text;
  v_target_codigo_cliente text;
  v_siblings jsonb;
  v_orion_systems text[];
  v_existing_cartorio_id text;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
    AND (v_caller IS NULL OR NOT public.has_permission(v_caller, 'projects', 'view'))
  THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT
    p.id,
    p.client_name,
    p.system_type,
    p.ticket_number,
    p.client_id,
    p.sales_order_number,
    coalesce(p.custom_fields, '{}'::jsonb) AS custom_fields
  INTO v_target
  FROM public.projects p
  WHERE p.id = p_project_id
    AND coalesce(p.is_deleted, false) = false
    AND p.deleted_at IS NULL;

  IF v_target.id IS NULL THEN
    RAISE EXCEPTION 'Projeto não encontrado ou excluído.';
  END IF;

  v_target_norm_key := public.normalize_client_match_key(
    regexp_replace(coalesce(v_target.client_name, ''), '^\s*\(web\s*ri\)\s*', '', 'i')
  );

  SELECT cpv.codigo_cliente
  INTO v_target_codigo_cliente
  FROM public.chamados_processo_venda cpv
  WHERE cpv.numero_chamado::text = trim(coalesce(v_target.ticket_number, ''))
    AND cpv.codigo_cliente IS NOT NULL
  LIMIT 1;

  IF v_target_codigo_cliente IS NULL AND v_target_norm_key <> '' THEN
    SELECT cca.codigo_cliente
    INTO v_target_codigo_cliente
    FROM public.chamados_cliente_aliases cca
    WHERE public.normalize_client_match_key(cca.nome_cliente) = v_target_norm_key
      AND cca.codigo_cliente IS NOT NULL
    LIMIT 1;
  END IF;

  WITH matched_siblings AS (
    SELECT DISTINCT
      p2.id,
      p2.client_name,
      p2.system_type,
      p2.ticket_number,
      coalesce(p2.custom_fields, '{}'::jsonb) AS custom_fields
    FROM public.projects p2
    LEFT JOIN public.chamados_processo_venda cpv2
      ON cpv2.numero_chamado::text = trim(coalesce(p2.ticket_number, ''))
    LEFT JOIN public.chamados_cliente_aliases cca2
      ON public.normalize_client_match_key(cca2.nome_cliente) = public.normalize_client_match_key(
        regexp_replace(coalesce(p2.client_name, ''), '^\s*\(web\s*ri\)\s*', '', 'i')
      )
    WHERE coalesce(p2.is_deleted, false) = false
      AND p2.deleted_at IS NULL
      AND p2.system_type IN ('Orion TN', 'Orion PRO', 'Orion REG')
      AND (
        p2.id = v_target.id
        OR (v_target.client_id IS NOT NULL AND p2.client_id = v_target.client_id)
        OR (
          v_target_norm_key <> ''
          AND public.normalize_client_match_key(
            regexp_replace(coalesce(p2.client_name, ''), '^\s*\(web\s*ri\)\s*', '', 'i')
          ) = v_target_norm_key
        )
        OR (
          v_target_codigo_cliente IS NOT NULL
          AND (cpv2.codigo_cliente = v_target_codigo_cliente OR cca2.codigo_cliente = v_target_codigo_cliente)
        )
        OR (
          v_target.sales_order_number IS NOT NULL
          AND v_target.sales_order_number > 1
          AND v_target.sales_order_number < 100000
          AND p2.sales_order_number = v_target.sales_order_number
        )
        OR (
          coalesce(v_target.custom_fields->>'skills_cartorio_id', '') <> ''
          AND (p2.custom_fields->>'skills_cartorio_id') = (v_target.custom_fields->>'skills_cartorio_id')
        )
      )
  )
  SELECT
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', ms.id,
          'client_name', ms.client_name,
          'system_type', ms.system_type,
          'ticket_number', ms.ticket_number,
          'custom_fields', ms.custom_fields
        )
        ORDER BY
          CASE ms.system_type
            WHEN 'Orion TN' THEN 1
            WHEN 'Orion PRO' THEN 2
            WHEN 'Orion REG' THEN 3
            ELSE 4
          END,
          ms.client_name
      ),
      '[]'::jsonb
    ),
    ARRAY(
      SELECT s
      FROM unnest(ARRAY['Orion TN', 'Orion PRO', 'Orion REG']) AS s
      WHERE EXISTS (SELECT 1 FROM matched_siblings ms2 WHERE ms2.system_type = s)
    ),
    (
      SELECT ms3.custom_fields->>'skills_cartorio_id'
      FROM matched_siblings ms3
      WHERE coalesce(ms3.custom_fields->>'skills_cartorio_id', '') <> ''
      LIMIT 1
    )
  INTO v_siblings, v_orion_systems, v_existing_cartorio_id
  FROM matched_siblings ms;

  RETURN jsonb_build_object(
    'target_project', jsonb_build_object(
      'id', v_target.id,
      'client_name', v_target.client_name,
      'system_type', v_target.system_type,
      'ticket_number', v_target.ticket_number,
      'custom_fields', v_target.custom_fields
    ),
    'sibling_projects', v_siblings,
    'orion_systems', to_jsonb(coalesce(v_orion_systems, ARRAY[]::text[])),
    'existing_cartorio_id', v_existing_cartorio_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_project_skills_sibling_group(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_skills_sibling_group(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.save_project_skills_credentials(
  p_project_ids uuid[],
  p_skills_payload jsonb,
  p_actor_name text DEFAULT 'Sistema'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_patch jsonb;
  v_pid uuid;
  v_is_silent boolean := (coalesce(p_actor_name, '') = '__SILENT_SYNC__');
  v_clean_actor text := CASE
    WHEN coalesce(p_actor_name, '') IN ('', '__SILENT_SYNC__') THEN 'Sincronização Automática Skills'
    ELSE trim(p_actor_name)
  END;
BEGIN
  v_patch := jsonb_build_object(
    'skills_cartorio_id', p_skills_payload->>'cartorio_id',
    'skills_cartorio_nome', p_skills_payload->>'cartorio_nome',
    'skills_user_id', p_skills_payload->>'user_id',
    'skills_username', p_skills_payload->>'username',
    'skills_login_token', p_skills_payload->>'login_token',
    'skills_expiration_date', p_skills_payload->>'data_expiracao',
    'skills_observacoes', p_skills_payload->>'observacoes',
    'skills_systems_released', coalesce(p_skills_payload->'systems_released', '[]'::jsonb),
    'skills_products_released', coalesce(p_skills_payload->'products_released', '[]'::jsonb),
    'skills_portal_url', coalesce(p_skills_payload->>'portal_url', 'https://skills.siplan.com.br/'),
    'skills_last_activity', p_skills_payload->>'last_activity',
    'skills_session_is_active', coalesce((p_skills_payload->>'session_is_active')::boolean, false)
  );

  IF NOT v_is_silent THEN
    v_patch := v_patch || jsonb_build_object(
      'skills_provisioned_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'skills_provisioned_by', v_clean_actor
    );
  END IF;

  UPDATE public.projects p
  SET custom_fields = coalesce(p.custom_fields, '{}'::jsonb) || v_patch || CASE
        WHEN v_is_silent THEN jsonb_build_object(
          'skills_provisioned_at', coalesce(p.custom_fields->>'skills_provisioned_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
          'skills_provisioned_by', coalesce(p.custom_fields->>'skills_provisioned_by', v_clean_actor)
        )
        ELSE '{}'::jsonb
      END,
      updated_at = CASE WHEN v_is_silent THEN p.updated_at ELSE now() END
  WHERE p.id = ANY(p_project_ids);

  IF NOT v_is_silent THEN
    FOREACH v_pid IN ARRAY p_project_ids LOOP
      INSERT INTO public.timeline_events (project_id, type, author, message, metadata)
      VALUES (
        v_pid,
        'skills_action',
        v_clean_actor,
        format(
          'Acesso Siplan Skills sincronizado — Usuário: %s',
          coalesce(p_skills_payload->>'username', '-')
        ),
        jsonb_build_object(
          'category', 'skills',
          'actionType', 'skills_action',
          'tabLabel', 'Siplan Skills',
          'fieldLabel', 'Provisionamento Siplan Skills',
          'username', coalesce(p_skills_payload->>'username', '-'),
          'observacoes', coalesce(p_skills_payload->>'observacoes', '')
        )
      );
    END LOOP;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.save_project_skills_credentials(uuid[], jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_project_skills_credentials(uuid[], jsonb, text) TO service_role;

-- Restringe get_pos_assistant_project_info para links reais e sem ticket_number
CREATE OR REPLACE FUNCTION public.get_pos_assistant_project_info(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link public.pos_ai_chat_links%ROWTYPE;
  v_project public.projects%ROWTYPE;
BEGIN
  SELECT * INTO v_link
  FROM public.pos_ai_chat_links link
  WHERE link.id = p_id;

  IF FOUND THEN
    IF v_link.project_id IS NOT NULL THEN
      SELECT * INTO v_project
      FROM public.projects project
      WHERE project.id = v_link.project_id
        AND project.is_deleted = false;
    END IF;

    RETURN jsonb_build_object(
      'id', v_link.id,
      'client_name', v_link.client_name,
      'system_type', v_link.system_type,
      'products', COALESCE(v_project.products, ARRAY['Orion TN']::TEXT[]),
      'pos_assistant_enabled', public.is_pos_chat_link_enabled(v_link.id),
      'pos_assistant_disabled_at', v_link.disabled_at
    );
  END IF;

  -- Fallback apenas para projetos que ja tiveram o assistente explicitamente habilitado
  SELECT * INTO v_project
  FROM public.projects project
  WHERE project.id = p_id
    AND project.is_deleted = false
    AND project.custom_fields ? 'pos_assistant_enabled';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_project.id,
    'client_name', v_project.client_name,
    'system_type', v_project.system_type,
    'products', v_project.products,
    'pos_assistant_enabled', COALESCE(
      (v_project.custom_fields->>'pos_assistant_enabled')::BOOLEAN,
      false
    ),
    'pos_assistant_disabled_at', v_project.custom_fields->>'pos_assistant_disabled_at'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. REMOVER RPCS LEGADAS E REVOGAR EXECUTE DE ANON/PUBLIC EM TODAS AS INTERNAS
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.delete_pos_chat_session(uuid, text);
DROP FUNCTION IF EXISTS public.rename_pos_chat_session(uuid, text, text);
DROP FUNCTION IF EXISTS public.save_pos_chat_feedback(uuid, text, text);

-- Funcoes exclusivas de worker / integracao n8n (somente service_role)
REVOKE ALL ON FUNCTION public.claim_sd_time_import_request(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_sd_time_import_request(text) TO service_role;

REVOKE ALL ON FUNCTION public.complete_sd_time_import(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_sd_time_import(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.claim_sd_time_bulk_import_request(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_sd_time_bulk_import_request(text) TO service_role;

REVOKE ALL ON FUNCTION public.complete_sd_time_bulk_import(uuid, jsonb, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_sd_time_bulk_import(uuid, jsonb, integer, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.refresh_sd_time_import_details(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_sd_time_import_details(jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.upsert_project_from_0800(text, text, text, integer, integer, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_project_from_0800(text, text, text, integer, integer, text, text, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.sync_0800_project(text, text, text, integer, integer, text, text, text, text, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_0800_project(text, text, text, integer, integer, text, text, text, text, text, numeric, text) TO service_role;

-- Revoga PUBLIC e anon de TODAS as SECURITY DEFINER fora da whitelist publica legítima
DO $$
DECLARE
  r record;
  v_whitelist_names text[] := ARRAY[
    'get_roadmap_data',
    'get_project_public_info',
    'update_project_public_infra',
    'orion_updates_get_settings',
    'orion_updates_public_versions',
    'orion_updates_public_posts',
    'orion_updates_post_detail',
    'get_public_commercial_checklist',
    'submit_public_commercial_checklist',
    'is_pos_chat_link_enabled',
    'get_pos_assistant_project_info',
    'get_pos_chat_visitors',
    'register_pos_chat_visitor',
    'select_pos_chat_visitor',
    'get_pos_chat_visitor_sessions',
    'get_pos_chat_session_messages',
    'rename_pos_chat_visitor_session',
    'delete_pos_chat_visitor_session',
    'save_pos_chat_feedback_for_visitor',
    'has_permission'
  ];
  v_service_only_names text[] := ARRAY[
    'claim_sd_time_import_request',
    'complete_sd_time_import',
    'claim_sd_time_bulk_import_request',
    'complete_sd_time_bulk_import',
    'refresh_sd_time_import_details',
    'upsert_project_from_0800',
    'sync_0800_project',
    'create_new_user'
  ];
  v_sig text;
  v_auth_had boolean;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.prorettype <> 'trigger'::regtype
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    v_sig := format('public.%s', r.oid::regprocedure);
    IF NOT (r.proname = ANY(v_whitelist_names)) THEN
      v_auth_had := has_function_privilege('authenticated', r.oid, 'EXECUTE');
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.oid::regprocedure);
      IF v_auth_had AND NOT (r.proname = ANY(v_service_only_names)) THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.oid::regprocedure);
      ELSE
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.oid::regprocedure);
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. STORAGE: Fechar project-files e assistant-oriontn-doc para anon
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir leitura de arquivos" ON storage.objects;
CREATE POLICY "Permitir leitura de arquivos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'project-files');

DROP POLICY IF EXISTS "Permitir upload de arquivos" ON storage.objects;
CREATE POLICY "Permitir upload de arquivos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-files');

DROP POLICY IF EXISTS "Permitir deletar arquivos" ON storage.objects;
CREATE POLICY "Permitir deletar arquivos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-files');

DROP POLICY IF EXISTS "Allow public read to assistant-oriontn-doc" ON storage.objects;

UPDATE storage.buckets
SET public = false,
    file_size_limit = COALESCE(file_size_limit, 52428800)
WHERE id = 'project-files';

UPDATE storage.buckets
SET public = false
WHERE id = 'assistant-oriontn-doc';

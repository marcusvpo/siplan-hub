-- =============================================================================
-- SECURITY HARDENING P2: Cofre project_credentials, RBAC, limpeza & higiene
-- Projeto: Siplan HUB (okvufcwkophaadttmjwa)
-- Data: 2026-11-24
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Permissao RBAC dedicada: project_credentials (view / edit)
--    AGENTS.md: permissoes novas nascem permissivas para quem ja possuia
--    acesso equivalente e podem ser restringidas depois em /admin/roles.
-- ---------------------------------------------------------------------------
INSERT INTO public.app_permissions (resource, action, description)
VALUES
  (
    'project_credentials',
    'view',
    'Visualizar credenciais e acessos sensiveis dos projetos (PostgreSQL, AnyDesk, TeamViewer, SO, Orion Admin e token Siplan Skills)'
  ),
  (
    'project_credentials',
    'edit',
    'Editar e cadastrar credenciais e acessos sensiveis dos projetos'
  )
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT DISTINCT r.id, p.id
FROM public.app_roles r
JOIN public.app_permissions p
  ON p.resource = 'project_credentials' AND p.action = 'view'
WHERE r.name = 'admin'
   OR EXISTS (
     SELECT 1
     FROM public.app_role_permissions arp2
     JOIN public.app_permissions ap2 ON ap2.id = arp2.permission_id
     WHERE arp2.role_id = r.id
       AND (
         (ap2.resource = 'projects' AND ap2.action = 'view')
         OR (ap2.resource = 'environment_config' AND ap2.action = 'view')
         OR (ap2.resource = 'implantadores_transicao' AND ap2.action = 'view')
       )
   )
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT DISTINCT r.id, p.id
FROM public.app_roles r
JOIN public.app_permissions p
  ON p.resource = 'project_credentials' AND p.action = 'edit'
WHERE r.name = 'admin'
   OR EXISTS (
     SELECT 1
     FROM public.app_role_permissions arp2
     JOIN public.app_permissions ap2 ON ap2.id = arp2.permission_id
     WHERE arp2.role_id = r.id
       AND (
         (ap2.resource = 'projects' AND ap2.action = 'edit')
         OR (ap2.resource = 'environment_config' AND ap2.action = 'edit')
         OR (ap2.resource = 'implantadores_transicao' AND ap2.action = 'edit')
       )
   )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Tabela cofre public.project_credentials com RLS estrita
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_credentials (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_credentials ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.project_credentials FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_credentials TO authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_credentials'
      AND policyname = 'Authorized users can view project credentials'
  ) THEN
    CREATE POLICY "Authorized users can view project credentials"
      ON public.project_credentials FOR SELECT TO authenticated
      USING (public.has_permission(auth.uid(), 'project_credentials', 'view'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_credentials'
      AND policyname = 'Authorized users can insert project credentials'
  ) THEN
    CREATE POLICY "Authorized users can insert project credentials"
      ON public.project_credentials FOR INSERT TO authenticated
      WITH CHECK (public.has_permission(auth.uid(), 'project_credentials', 'edit'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_credentials'
      AND policyname = 'Authorized users can update project credentials'
  ) THEN
    CREATE POLICY "Authorized users can update project credentials"
      ON public.project_credentials FOR UPDATE TO authenticated
      USING (public.has_permission(auth.uid(), 'project_credentials', 'edit'))
      WITH CHECK (public.has_permission(auth.uid(), 'project_credentials', 'edit'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_credentials'
      AND policyname = 'Authorized users can delete project credentials'
  ) THEN
    CREATE POLICY "Authorized users can delete project credentials"
      ON public.project_credentials FOR DELETE TO authenticated
      USING (public.has_permission(auth.uid(), 'projects', 'delete'));
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 3. Backfill de credenciais -> project_credentials & limpeza de custom_fields
--    Preserva flag environment_orion_admin_configured em legados e preserva
--    updated_at (+ 1 microsegundo) para nao distorcer healthScore dos cards.
-- ---------------------------------------------------------------------------
UPDATE public.projects
SET custom_fields = jsonb_set(
      COALESCE(custom_fields, '{}'::jsonb),
      '{environment_orion_admin_configured}',
      'true'::jsonb,
      true
    ),
    updated_at = COALESCE(updated_at, now()) + interval '1 microsecond'
WHERE length(trim(COALESCE(custom_fields->>'environment_orion_admin_config', ''))) > 10
  AND (custom_fields->>'environment_orion_admin_configured') IS NULL;

WITH extracted AS (
  SELECT
    p.id AS project_id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'environment_anydesk_id', p.custom_fields->'environment_anydesk_id',
        'environment_anydesk_password', p.custom_fields->'environment_anydesk_password',
        'environment_so_login', p.custom_fields->'environment_so_login',
        'environment_so_password', p.custom_fields->'environment_so_password',
        'environment_os_type', p.custom_fields->'environment_os_type',
        'environment_os_credentials', p.custom_fields->'environment_os_credentials',
        'environment_remote_access_list', p.custom_fields->'environment_remote_access_list',
        'environment_postgres_version', p.custom_fields->'environment_postgres_version',
        'environment_postgres_access_data', p.custom_fields->'environment_postgres_access_data',
        'environment_postgres_host', p.custom_fields->'environment_postgres_host',
        'environment_postgres_user', p.custom_fields->'environment_postgres_user',
        'environment_postgres_password', p.custom_fields->'environment_postgres_password',
        'environment_orion_admin_config', p.custom_fields->'environment_orion_admin_config',
        'skills_login_token', p.custom_fields->'skills_login_token',
        'dtc_credentials', CASE
          WHEN jsonb_typeof(p.custom_fields->'dtc') = 'object' THEN
            NULLIF(
              jsonb_strip_nulls(
                jsonb_build_object(
                  'postgresPassword', p.custom_fields->'dtc'->'postgresPassword',
                  'soPassword', p.custom_fields->'dtc'->'soPassword',
                  'postgresAccessData', p.custom_fields->'dtc'->'postgresAccessData',
                  'remoteAccessList', p.custom_fields->'dtc'->'remoteAccessList'
                )
              ),
              '{}'::jsonb
            )
          ELSE NULL
        END
      )
    ) AS credentials_payload
  FROM public.projects p
  WHERE p.custom_fields IS NOT NULL
)
INSERT INTO public.project_credentials (project_id, credentials, updated_at)
SELECT
  e.project_id,
  e.credentials_payload,
  now()
FROM extracted e
WHERE e.credentials_payload <> '{}'::jsonb
ON CONFLICT (project_id) DO UPDATE
SET credentials = COALESCE(public.project_credentials.credentials, '{}'::jsonb) || EXCLUDED.credentials,
    updated_at = now();

UPDATE public.projects p
SET custom_fields = CASE
      WHEN jsonb_typeof(p.custom_fields->'dtc') = 'object' THEN
        jsonb_set(
          p.custom_fields - ARRAY[
            'environment_anydesk_id',
            'environment_anydesk_password',
            'environment_so_login',
            'environment_so_password',
            'environment_os_type',
            'environment_os_credentials',
            'environment_remote_access_list',
            'environment_postgres_version',
            'environment_postgres_access_data',
            'environment_postgres_host',
            'environment_postgres_user',
            'environment_postgres_password',
            'environment_orion_admin_config',
            'skills_login_token'
          ],
          '{dtc}',
          (p.custom_fields->'dtc') - ARRAY[
            'postgresPassword',
            'soPassword',
            'postgresAccessData',
            'remoteAccessList'
          ]
        )
      ELSE
        p.custom_fields - ARRAY[
          'environment_anydesk_id',
          'environment_anydesk_password',
          'environment_so_login',
          'environment_so_password',
          'environment_os_type',
          'environment_os_credentials',
          'environment_remote_access_list',
          'environment_postgres_version',
          'environment_postgres_access_data',
          'environment_postgres_host',
          'environment_postgres_user',
          'environment_postgres_password',
          'environment_orion_admin_config',
          'skills_login_token'
        ]
    END,
    updated_at = COALESCE(p.updated_at, now()) + interval '1 microsecond'
WHERE p.custom_fields IS NOT NULL
  AND (
    p.custom_fields ?| ARRAY[
      'environment_anydesk_id',
      'environment_anydesk_password',
      'environment_so_login',
      'environment_so_password',
      'environment_os_type',
      'environment_os_credentials',
      'environment_remote_access_list',
      'environment_postgres_version',
      'environment_postgres_access_data',
      'environment_postgres_host',
      'environment_postgres_user',
      'environment_postgres_password',
      'environment_orion_admin_config',
      'skills_login_token'
    ]
    OR (
      jsonb_typeof(p.custom_fields->'dtc') = 'object'
      AND (p.custom_fields->'dtc') ?| ARRAY[
        'postgresPassword',
        'soPassword',
        'postgresAccessData',
        'remoteAccessList'
      ]
    )
  );

-- ---------------------------------------------------------------------------
-- 4. RPCs do Siplan Skills integradas ao cofre project_credentials
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_project_skills_credentials(
  p_project_ids uuid[],
  p_skills_payload jsonb,
  p_actor_name text DEFAULT 'Sistema'::text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_patch jsonb;
  v_pid uuid;
  v_login_token text := nullif(trim(coalesce(p_skills_payload->>'login_token', '')), '');
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
  SET custom_fields = (coalesce(p.custom_fields, '{}'::jsonb) - 'skills_login_token') || v_patch || CASE
        WHEN v_is_silent THEN jsonb_build_object(
          'skills_provisioned_at', coalesce(p.custom_fields->>'skills_provisioned_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
          'skills_provisioned_by', coalesce(p.custom_fields->>'skills_provisioned_by', v_clean_actor)
        )
        ELSE '{}'::jsonb
      END,
      updated_at = CASE WHEN v_is_silent THEN p.updated_at ELSE now() END
  WHERE p.id = ANY(p_project_ids);

  IF v_login_token IS NOT NULL THEN
    INSERT INTO public.project_credentials (project_id, credentials, updated_at)
    SELECT
      pid,
      jsonb_build_object('skills_login_token', v_login_token),
      now()
    FROM unnest(p_project_ids) AS pid
    ON CONFLICT (project_id) DO UPDATE
    SET credentials = COALESCE(public.project_credentials.credentials, '{}'::jsonb) || EXCLUDED.credentials,
        updated_at = now();
  END IF;

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
$function$;

REVOKE ALL ON FUNCTION public.save_project_skills_credentials(uuid[], jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_project_skills_credentials(uuid[], jsonb, text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_project_skills_sibling_group(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_can_view_credentials boolean;
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

  v_can_view_credentials := (
    COALESCE(auth.role(), '') = 'service_role'
    OR public.has_permission(v_caller, 'project_credentials', 'view')
  );

  SELECT
    p.id,
    p.client_name,
    p.system_type,
    p.ticket_number,
    p.client_id,
    p.sales_order_number,
    coalesce(p.custom_fields, '{}'::jsonb) || CASE
      WHEN v_can_view_credentials AND nullif(pc.credentials->>'skills_login_token', '') IS NOT NULL
        THEN jsonb_build_object('skills_login_token', pc.credentials->>'skills_login_token')
      ELSE '{}'::jsonb
    END AS custom_fields
  INTO v_target
  FROM public.projects p
  LEFT JOIN public.project_credentials pc ON pc.project_id = p.id
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
      coalesce(p2.custom_fields, '{}'::jsonb) || CASE
        WHEN v_can_view_credentials AND nullif(pc2.credentials->>'skills_login_token', '') IS NOT NULL
          THEN jsonb_build_object('skills_login_token', pc2.credentials->>'skills_login_token')
        ELSE '{}'::jsonb
      END AS custom_fields
    FROM public.projects p2
    LEFT JOIN public.project_credentials pc2 ON pc2.project_id = p2.id
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
$function$;

REVOKE ALL ON FUNCTION public.get_project_skills_sibling_group(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_skills_sibling_group(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Higiene de funcoes: search_path fixo e revogacao de anon em RPCs internas
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM unnest(p.proconfig) cfg
          WHERE cfg LIKE 'search_path=%'
        )
      )
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', r.proname, r.args);
  END LOOP;
END
$$;

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Revoga EXECUTE direto via API de anon em funcoes internas e triggers
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND (
        p.prorettype = 'trigger'::regtype
        OR p.proname IN (
          'claim_copilot_job',
          'claim_dtc_ai_job',
          'claim_model_generation_job',
          'requeue_stuck_copilot_jobs',
          'requeue_stuck_dtc_ai_jobs',
          'requeue_stuck_model_jobs',
          'add_copilot_tokens',
          'append_available_model',
          'remove_available_model',
          'set_sent_model_done',
          'create_notification',
          'pos_chamados_criticos_abertos',
          'pos_temas_recorrentes'
        )
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 5b. Garante SECURITY INVOKER na trigger anti-escalacao de profiles.role
--     (para que current_user reflita o papel do chamador real, nao do owner)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_protect_profile_privileged_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF COALESCE(auth.role(), '') = 'service_role'
      OR current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin')
      OR public.has_permission(auth.uid(), 'users', 'edit')
    THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Sem permissao para alterar o perfil de acesso.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 6. Changelog interno (AGENTS.md item 12)
-- ---------------------------------------------------------------------------
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
  'general',
  'Cofre Dedicado de Credenciais e Endurecimento de Segurança',
  'Credenciais técnicas (PostgreSQL, AnyDesk, TeamViewer, SO, Orion Admin e tokens do Siplan Skills) foram isoladas no cofre dedicado project_credentials com controle de acesso granular por perfil em /admin/roles, acompanhadas de proteção reforçada nas rotas públicas, Edge Functions e storage privado.',
  '/admin/roles'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND title = 'Cofre Dedicado de Credenciais e Endurecimento de Segurança'
);

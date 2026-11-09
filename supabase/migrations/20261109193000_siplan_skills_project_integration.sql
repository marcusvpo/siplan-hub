-- Integração Automática Siplan HUB (/projects) <-> Plataforma Siplan Skills
CREATE TABLE IF NOT EXISTS public.internal_integration_secrets (
  key_name text PRIMARY KEY,
  secret_value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_integration_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.internal_integration_secrets FROM anon, authenticated;

INSERT INTO public.internal_integration_secrets (key_name, secret_value)
VALUES
  ('skills_bridge_url', 'https://bnulocsnxiffavvabfdj.supabase.co/functions/v1/hub-skills-bridge'),
  ('skills_bridge_secret', 'shb_live_9f8d7a6e5c4b3a210fedcba987654321_siplan2026')
ON CONFLICT (key_name) DO UPDATE
SET secret_value = EXCLUDED.secret_value,
    updated_at = now();

-- Resolve o projeto alvo e todos os projetos irmãos do mesmo cartório (Orion TN, Orion PRO, Orion REG)
CREATE OR REPLACE FUNCTION public.get_project_skills_sibling_group(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  IF v_caller IS NOT NULL AND NOT public.has_permission(v_caller, 'projects', 'view') THEN
    RAISE EXCEPTION 'Forbidden';
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

-- Persiste e sincroniza as credenciais do Siplan Skills em todos os projetos irmãos do mesmo cartório
CREATE OR REPLACE FUNCTION public.save_project_skills_credentials(
  p_project_ids uuid[],
  p_skills_payload jsonb,
  p_actor_name text DEFAULT 'Sistema'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patch jsonb;
  v_pid uuid;
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
    'skills_provisioned_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'skills_provisioned_by', coalesce(nullif(trim(p_actor_name), ''), 'Sistema')
  );

  UPDATE public.projects
  SET custom_fields = coalesce(custom_fields, '{}'::jsonb) || v_patch,
      updated_at = now()
  WHERE id = ANY(p_project_ids);

  FOREACH v_pid IN ARRAY p_project_ids LOOP
    INSERT INTO public.project_logs (project_id, type, message, author)
    VALUES (
      v_pid,
      'system',
      format(
        'Acesso Siplan Skills sincronizado — Usuário: %s | Token: %s | %s',
        coalesce(p_skills_payload->>'username', '-'),
        coalesce(p_skills_payload->>'login_token', '-'),
        coalesce(p_skills_payload->>'observacoes', '')
      ),
      coalesce(nullif(trim(p_actor_name), ''), 'Sistema')
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.save_project_skills_credentials(uuid[], jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_project_skills_credentials(uuid[], jsonb, text) TO service_role;

-- Registro de Changelog Oficial (Regra #12 AGENTS.md)
INSERT INTO public.notifications (
  type,
  category,
  permission_resource,
  title,
  message,
  action_url
)
SELECT
  'release_feature',
  'changelog',
  'projects',
  'Automação de Acesso Siplan Skills nos Projetos',
  'Agora você pode criar e sincronizar automaticamente o cartório, usuário padronizado, token de acesso e liberação de vídeo-aulas (Demonstrações e Orion - Treinamentos) do Siplan Skills com 1 clique diretamente no modal do projeto em /projects, unificando projetos irmãos do mesmo cliente.',
  '/projects'
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications
  WHERE category = 'changelog'
    AND title = 'Automação de Acesso Siplan Skills nos Projetos'
);

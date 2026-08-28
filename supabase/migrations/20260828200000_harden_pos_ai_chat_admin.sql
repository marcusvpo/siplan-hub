-- Hardens the Links e Chats administration area with transactional link creation,
-- soft-deactivation of visitors, server-side pagination/statistics and audit logs.

ALTER TABLE public.pos_ai_chat_visitors
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_pos_ai_chat_visitors_admin
  ON public.pos_ai_chat_visitors (is_active, project_id, last_seen_at DESC);

DROP TRIGGER IF EXISTS update_pos_ai_chat_visitors_updated_at
  ON public.pos_ai_chat_visitors;
CREATE TRIGGER update_pos_ai_chat_visitors_updated_at
  BEFORE UPDATE ON public.pos_ai_chat_visitors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.log_pos_ai_chat_admin_action(
  p_action TEXT,
  p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (
    auth.uid(),
    p_action,
    COALESCE(p_details, '{}'::JSONB) || jsonb_build_object(
      'entityType', 'pos_ai_chat',
      'timestamp', now()
    )
  );
EXCEPTION
  -- An audit failure must never leave a completed administrative operation in
  -- an indeterminate state. Deployment diagnostics can still surface the error.
  WHEN undefined_table OR insufficient_privilege THEN
    RAISE WARNING 'Nao foi possivel registrar auditoria do chat: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.log_pos_ai_chat_admin_action(TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_pos_ai_chat_link(
  p_client_name TEXT,
  p_project_id UUID DEFAULT NULL,
  p_system_type TEXT DEFAULT 'Orion TN'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name TEXT := btrim(regexp_replace(COALESCE(p_client_name, ''), '\s+', ' ', 'g'));
  v_system_type TEXT := btrim(regexp_replace(COALESCE(p_system_type, 'Orion TN'), '\s+', ' ', 'g'));
  v_project public.projects%ROWTYPE;
  v_link public.pos_ai_chat_links%ROWTYPE;
  v_created BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'pos_ai_logs', 'manage') THEN
    RAISE EXCEPTION 'Sem permissao para gerar links do assistente.'
      USING ERRCODE = '42501';
  END IF;

  IF p_project_id IS NOT NULL THEN
    SELECT project.* INTO v_project
    FROM public.projects project
    WHERE project.id = p_project_id
      AND project.is_deleted = false;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'O projeto selecionado nao existe ou foi removido.'
        USING ERRCODE = 'P0002';
    END IF;

    v_client_name := btrim(v_project.client_name);
    v_system_type := COALESCE(NULLIF(btrim(v_project.system_type), ''), 'Orion TN');
  END IF;

  IF char_length(v_client_name) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION 'Informe um cliente com 2 a 160 caracteres.'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(v_system_type) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION 'Informe um sistema com 2 a 80 caracteres.'
      USING ERRCODE = '22023';
  END IF;

  IF p_project_id IS NOT NULL THEN
    SELECT link.* INTO v_link
    FROM public.pos_ai_chat_links link
    WHERE link.project_id = p_project_id OR link.id = p_project_id
    ORDER BY (link.project_id = p_project_id) DESC
    LIMIT 1
    FOR UPDATE;
  ELSE
    SELECT link.* INTO v_link
    FROM public.pos_ai_chat_links link
    WHERE link.project_id IS NULL
      AND lower(btrim(link.client_name)) = lower(v_client_name)
    ORDER BY link.created_at DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF FOUND THEN
    UPDATE public.pos_ai_chat_links link
    SET client_name = v_client_name,
        system_type = v_system_type,
        enabled = true,
        activated_at = COALESCE(link.activated_at, now()),
        disabled_at = NULL
    WHERE link.id = v_link.id
    RETURNING link.* INTO v_link;
  ELSE
    INSERT INTO public.pos_ai_chat_links (
      id, project_id, client_name, system_type, enabled, activated_at
    ) VALUES (
      COALESCE(p_project_id, gen_random_uuid()),
      p_project_id,
      v_client_name,
      v_system_type,
      true,
      now()
    )
    RETURNING * INTO v_link;
    v_created := true;
  END IF;

  IF p_project_id IS NOT NULL THEN
    UPDATE public.projects project
    SET custom_fields = COALESCE(project.custom_fields, '{}'::JSONB) || jsonb_build_object(
      'pos_assistant_enabled', true,
      'pos_assistant_activated_at', COALESCE(v_link.activated_at, now()),
      'pos_assistant_disabled_at', NULL
    )
    WHERE project.id = p_project_id;
  END IF;

  PERFORM public.log_pos_ai_chat_admin_action(
    CASE WHEN v_created THEN 'pos_chat_link_created' ELSE 'pos_chat_link_reactivated' END,
    jsonb_build_object(
      'entityId', v_link.id,
      'projectId', v_link.project_id,
      'projectName', v_link.client_name,
      'standalone', v_link.project_id IS NULL
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'created', v_created,
    'link', to_jsonb(v_link)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_pos_ai_chat_link(TEXT, UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pos_ai_chat_link(TEXT, UUID, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.set_pos_ai_chat_link_enabled(
  p_link_id UUID,
  p_enabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.pos_ai_chat_links%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'pos_ai_logs', 'manage') THEN
    RAISE EXCEPTION 'Sem permissao para alterar links do assistente.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.pos_ai_chat_links link
  SET enabled = p_enabled,
      activated_at = CASE WHEN p_enabled THEN COALESCE(link.activated_at, now()) ELSE link.activated_at END,
      disabled_at = CASE WHEN p_enabled THEN NULL ELSE now() END
  WHERE link.id = p_link_id
  RETURNING link.* INTO v_link;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link nao encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF v_link.project_id IS NOT NULL THEN
    UPDATE public.projects project
    SET custom_fields = COALESCE(project.custom_fields, '{}'::JSONB) || jsonb_build_object(
      'pos_assistant_enabled', p_enabled,
      'pos_assistant_activated_at', v_link.activated_at,
      'pos_assistant_disabled_at', v_link.disabled_at
    )
    WHERE project.id = v_link.project_id;
  END IF;

  PERFORM public.log_pos_ai_chat_admin_action(
    CASE WHEN p_enabled THEN 'pos_chat_link_reactivated' ELSE 'pos_chat_link_disabled' END,
    jsonb_build_object(
      'entityId', v_link.id,
      'projectId', v_link.project_id,
      'projectName', v_link.client_name
    )
  );

  RETURN jsonb_build_object('success', true, 'link', to_jsonb(v_link));
END;
$$;

REVOKE ALL ON FUNCTION public.set_pos_ai_chat_link_enabled(UUID, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_pos_ai_chat_link_enabled(UUID, BOOLEAN)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_pos_ai_chat_links_admin()
RETURNS TABLE (
  id UUID,
  project_id UUID,
  client_name TEXT,
  system_type TEXT,
  enabled BOOLEAN,
  activated_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  message_count BIGINT,
  conversation_count BIGINT,
  visitor_count BIGINT,
  active_visitor_count BIGINT,
  last_interaction_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'pos_ai_logs', 'view') THEN
    RAISE EXCEPTION 'Sem permissao para consultar links do assistente.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    link.id,
    link.project_id,
    link.client_name,
    link.system_type,
    link.enabled,
    link.activated_at,
    link.disabled_at,
    link.created_at,
    COALESCE(message_stats.message_count, 0),
    COALESCE(message_stats.conversation_count, 0),
    COALESCE(visitor_stats.visitor_count, 0),
    COALESCE(visitor_stats.active_visitor_count, 0),
    message_stats.last_interaction_at
  FROM public.pos_ai_chat_links link
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS message_count,
      COUNT(DISTINCT message.session_id) AS conversation_count,
      MAX(message.created_at) AS last_interaction_at
    FROM public.pos_ai_chat_messages message
    WHERE message.project_id = link.id
  ) message_stats ON true
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS visitor_count,
      COUNT(*) FILTER (WHERE visitor.is_active) AS active_visitor_count
    FROM public.pos_ai_chat_visitors visitor
    WHERE visitor.project_id = link.id
  ) visitor_stats ON true
  ORDER BY link.enabled DESC, lower(link.client_name);
END;
$$;

REVOKE ALL ON FUNCTION public.get_pos_ai_chat_links_admin()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pos_ai_chat_links_admin()
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_pos_ai_chat_conversations_page(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10,
  p_search TEXT DEFAULT NULL,
  p_link_id UUID DEFAULT NULL,
  p_visitor_id UUID DEFAULT NULL,
  p_anonymous_only BOOLEAN DEFAULT false,
  p_identified_only BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 10), 1), 5000);
  v_search TEXT := NULLIF(btrim(COALESCE(p_search, '')), '');
  v_total BIGINT;
  v_items JSONB;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'pos_ai_logs', 'view') THEN
    RAISE EXCEPTION 'Sem permissao para consultar conversas do assistente.'
      USING ERRCODE = '42501';
  END IF;

  WITH conversation_base AS (
    SELECT
      message.project_id AS link_id,
      message.session_id,
      (array_agg(message.visitor_id ORDER BY message.created_at DESC)
        FILTER (WHERE message.visitor_id IS NOT NULL))[1] AS visitor_id,
      MIN(message.created_at) AS started_at,
      MAX(message.created_at) AS last_message_at,
      COUNT(*) AS message_count,
      COUNT(*) FILTER (WHERE message.feedback = 'helpful') AS helpful,
      COUNT(*) FILTER (WHERE message.feedback = 'unhelpful') AS unhelpful,
      COALESCE(
        (array_agg(message.content ORDER BY message.created_at ASC)
          FILTER (WHERE message.role = 'user'))[1],
        (array_agg(message.content ORDER BY message.created_at ASC))[1]
      ) AS preview
    FROM public.pos_ai_chat_messages message
    WHERE (p_link_id IS NULL OR message.project_id = p_link_id)
    GROUP BY message.project_id, message.session_id
  ), filtered AS (
    SELECT base.*
    FROM conversation_base base
    JOIN public.pos_ai_chat_links link ON link.id = base.link_id
    LEFT JOIN public.pos_ai_chat_visitors visitor ON visitor.id = base.visitor_id
    WHERE (p_visitor_id IS NULL OR base.visitor_id = p_visitor_id)
      AND (NOT p_anonymous_only OR base.visitor_id IS NULL)
      AND (NOT p_identified_only OR base.visitor_id IS NOT NULL)
      AND (
        v_search IS NULL
        OR link.client_name ILIKE '%' || v_search || '%'
        OR visitor.name ILIKE '%' || v_search || '%'
        OR visitor.sector ILIKE '%' || v_search || '%'
        OR base.preview ILIKE '%' || v_search || '%'
        OR EXISTS (
          SELECT 1
          FROM public.pos_ai_chat_messages searched
          WHERE searched.project_id = base.link_id
            AND searched.session_id = base.session_id
            AND searched.content ILIKE '%' || v_search || '%'
        )
      )
  ), selected AS (
    SELECT filtered.*
    FROM filtered
    ORDER BY filtered.last_message_at DESC
    OFFSET (v_page - 1) * v_page_size
    LIMIT v_page_size
  )
  SELECT
    (SELECT COUNT(*) FROM filtered),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'key', selected.link_id::TEXT || ':' || selected.session_id,
        'link_id', selected.link_id,
        'session_id', selected.session_id,
        'visitor_id', selected.visitor_id,
        'client_name', link.client_name,
        'visitor_name', COALESCE(visitor.name, 'Visitante'),
        'visitor_sector', COALESCE(visitor.sector, 'Setor nao informado'),
        'visitor_active', visitor.is_active,
        'started_at', selected.started_at,
        'last_message_at', selected.last_message_at,
        'preview', selected.preview,
        'helpful', selected.helpful,
        'unhelpful', selected.unhelpful,
        'message_count', selected.message_count,
        'messages', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'id', message.id,
              'project_id', message.project_id,
              'session_id', message.session_id,
              'role', message.role,
              'content', message.content,
              'feedback', message.feedback,
              'created_at', message.created_at,
              'visitor', CASE WHEN message.visitor_id IS NULL THEN NULL ELSE jsonb_build_object(
                'id', visitor_message.id,
                'name', visitor_message.name,
                'sector', visitor_message.sector,
                'is_active', visitor_message.is_active
              ) END
            ) ORDER BY message.created_at ASC
          ), '[]'::JSONB)
          FROM public.pos_ai_chat_messages message
          LEFT JOIN public.pos_ai_chat_visitors visitor_message ON visitor_message.id = message.visitor_id
          WHERE message.project_id = selected.link_id
            AND message.session_id = selected.session_id
        )
      ) ORDER BY selected.last_message_at DESC
    ), '[]'::JSONB)
  INTO v_total, v_items
  FROM selected
  JOIN public.pos_ai_chat_links link ON link.id = selected.link_id
  LEFT JOIN public.pos_ai_chat_visitors visitor ON visitor.id = selected.visitor_id;

  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::JSONB),
    'total', COALESCE(v_total, 0),
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', GREATEST(1, CEIL(COALESCE(v_total, 0)::NUMERIC / v_page_size)::INTEGER)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_pos_ai_chat_conversations_page(INTEGER, INTEGER, TEXT, UUID, UUID, BOOLEAN, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pos_ai_chat_conversations_page(INTEGER, INTEGER, TEXT, UUID, UUID, BOOLEAN, BOOLEAN)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_pos_ai_chat_visitor_options(
  p_link_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  name TEXT,
  sector TEXT,
  is_active BOOLEAN,
  conversation_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'pos_ai_logs', 'view') THEN
    RAISE EXCEPTION 'Sem permissao para consultar usuarios do assistente.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    visitor.id,
    visitor.project_id,
    visitor.name,
    visitor.sector,
    visitor.is_active,
    COUNT(DISTINCT message.session_id)
  FROM public.pos_ai_chat_visitors visitor
  LEFT JOIN public.pos_ai_chat_messages message
    ON message.project_id = visitor.project_id
   AND message.visitor_id = visitor.id
  WHERE p_link_id IS NULL OR visitor.project_id = p_link_id
  GROUP BY visitor.id
  ORDER BY visitor.is_active DESC, lower(visitor.name), lower(visitor.sector);
END;
$$;

REVOKE ALL ON FUNCTION public.get_pos_ai_chat_visitor_options(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pos_ai_chat_visitor_options(UUID)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_pos_ai_chat_visitors_page(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10,
  p_search TEXT DEFAULT NULL,
  p_link_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 10), 1), 5000);
  v_search TEXT := NULLIF(btrim(COALESCE(p_search, '')), '');
  v_total BIGINT;
  v_active BIGINT;
  v_inactive BIGINT;
  v_clients BIGINT;
  v_items JSONB;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'pos_ai_logs', 'view') THEN
    RAISE EXCEPTION 'Sem permissao para consultar usuarios do assistente.'
      USING ERRCODE = '42501';
  END IF;

  WITH base AS (
    SELECT
      visitor.*,
      link.client_name,
      link.system_type,
      COUNT(DISTINCT message.session_id) AS conversation_count,
      COUNT(message.id) AS message_count
    FROM public.pos_ai_chat_visitors visitor
    JOIN public.pos_ai_chat_links link ON link.id = visitor.project_id
    LEFT JOIN public.pos_ai_chat_messages message
      ON message.project_id = visitor.project_id
     AND message.visitor_id = visitor.id
    WHERE (p_link_id IS NULL OR visitor.project_id = p_link_id)
      AND (p_status = 'all' OR (p_status = 'active' AND visitor.is_active) OR (p_status = 'inactive' AND NOT visitor.is_active))
      AND (
        v_search IS NULL
        OR visitor.name ILIKE '%' || v_search || '%'
        OR visitor.sector ILIKE '%' || v_search || '%'
        OR link.client_name ILIKE '%' || v_search || '%'
      )
    GROUP BY visitor.id, link.id
  ), selected AS (
    SELECT base.* FROM base
    ORDER BY base.is_active DESC, base.last_seen_at DESC, lower(base.name)
    OFFSET (v_page - 1) * v_page_size
    LIMIT v_page_size
  )
  SELECT
    (SELECT COUNT(*) FROM base),
    (SELECT COUNT(*) FROM base WHERE is_active),
    (SELECT COUNT(*) FROM base WHERE NOT is_active),
    (SELECT COUNT(DISTINCT project_id) FROM base),
    COALESCE(jsonb_agg(to_jsonb(selected) ORDER BY selected.is_active DESC, selected.last_seen_at DESC), '[]'::JSONB)
  INTO v_total, v_active, v_inactive, v_clients, v_items
  FROM selected;

  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::JSONB),
    'total', COALESCE(v_total, 0),
    'active', COALESCE(v_active, 0),
    'inactive', COALESCE(v_inactive, 0),
    'client_count', COALESCE(v_clients, 0),
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', GREATEST(1, CEIL(COALESCE(v_total, 0)::NUMERIC / v_page_size)::INTEGER)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_pos_ai_chat_visitors_page(INTEGER, INTEGER, TEXT, UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pos_ai_chat_visitors_page(INTEGER, INTEGER, TEXT, UUID, TEXT)
  TO authenticated;

DROP FUNCTION IF EXISTS public.manage_pos_ai_chat_visitor(UUID, TEXT, TEXT, BOOLEAN);
CREATE FUNCTION public.manage_pos_ai_chat_visitor(
  p_visitor_id UUID,
  p_name TEXT DEFAULT NULL,
  p_sector TEXT DEFAULT NULL,
  p_delete BOOLEAN DEFAULT false,
  p_active BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor public.pos_ai_chat_visitors%ROWTYPE;
  v_name TEXT;
  v_sector TEXT;
  v_target_active BOOLEAN;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'pos_ai_logs', 'manage') THEN
    RAISE EXCEPTION 'Sem permissao para gerenciar usuarios do assistente.'
      USING ERRCODE = '42501';
  END IF;

  SELECT visitor.* INTO v_visitor
  FROM public.pos_ai_chat_visitors visitor
  WHERE visitor.id = p_visitor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario nao encontrado.' USING ERRCODE = 'P0002';
  END IF;

  v_target_active := COALESCE(
    p_active,
    CASE WHEN COALESCE(p_delete, false) THEN false ELSE v_visitor.is_active END
  );

  IF p_name IS NOT NULL OR p_sector IS NOT NULL THEN
    v_name := btrim(COALESCE(p_name, v_visitor.name));
    v_sector := btrim(COALESCE(p_sector, v_visitor.sector));

    IF char_length(v_name) NOT BETWEEN 2 AND 80 THEN
      RAISE EXCEPTION 'O nome deve ter entre 2 e 80 caracteres.' USING ERRCODE = '22023';
    END IF;
    IF char_length(v_sector) NOT BETWEEN 2 AND 80 THEN
      RAISE EXCEPTION 'O setor deve ter entre 2 e 80 caracteres.' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.pos_ai_chat_visitors duplicate
      WHERE duplicate.project_id = v_visitor.project_id
        AND duplicate.id <> p_visitor_id
        AND lower(btrim(duplicate.name)) = lower(v_name)
        AND lower(btrim(duplicate.sector)) = lower(v_sector)
    ) THEN
      RAISE EXCEPTION 'Ja existe um usuario com este nome e setor no cartorio.' USING ERRCODE = '23505';
    END IF;
  ELSE
    v_name := v_visitor.name;
    v_sector := v_visitor.sector;
  END IF;

  UPDATE public.pos_ai_chat_visitors visitor
  SET name = v_name,
      sector = v_sector,
      is_active = v_target_active,
      deactivated_at = CASE WHEN v_target_active THEN NULL ELSE COALESCE(visitor.deactivated_at, now()) END
  WHERE visitor.id = p_visitor_id
  RETURNING visitor.* INTO v_visitor;

  PERFORM public.log_pos_ai_chat_admin_action(
    CASE
      WHEN p_active IS NOT NULL OR p_delete THEN
        CASE WHEN v_target_active THEN 'pos_chat_user_reactivated' ELSE 'pos_chat_user_deactivated' END
      ELSE 'pos_chat_user_updated'
    END,
    jsonb_build_object(
      'entityId', v_visitor.id,
      'projectId', v_visitor.project_id,
      'projectName', (SELECT link.client_name FROM public.pos_ai_chat_links link WHERE link.id = v_visitor.project_id),
      'targetUserName', v_visitor.name,
      'sector', v_visitor.sector,
      'active', v_visitor.is_active
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted', false,
    'active', v_visitor.is_active,
    'project_id', v_visitor.project_id,
    'visitor', to_jsonb(v_visitor)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manage_pos_ai_chat_visitor(UUID, TEXT, TEXT, BOOLEAN, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_pos_ai_chat_visitor(UUID, TEXT, TEXT, BOOLEAN, BOOLEAN)
  TO authenticated;

-- Public visitor discovery and selection must never expose deactivated users.
CREATE OR REPLACE FUNCTION public.get_pos_chat_visitors(p_project_id UUID)
RETURNS TABLE (id UUID, name TEXT, sector TEXT, last_seen_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT visitor.id, visitor.name, visitor.sector, visitor.last_seen_at
  FROM public.pos_ai_chat_visitors visitor
  WHERE visitor.project_id = p_project_id
    AND visitor.is_active
    AND public.is_pos_chat_link_enabled(p_project_id)
  ORDER BY visitor.last_seen_at DESC, lower(visitor.name);
$$;

CREATE OR REPLACE FUNCTION public.register_pos_chat_visitor(
  p_project_id UUID,
  p_name TEXT,
  p_sector TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := btrim(regexp_replace(COALESCE(p_name, ''), '\s+', ' ', 'g'));
  v_sector TEXT := btrim(regexp_replace(COALESCE(p_sector, ''), '\s+', ' ', 'g'));
  v_visitor public.pos_ai_chat_visitors%ROWTYPE;
BEGIN
  IF char_length(v_name) NOT BETWEEN 2 AND 80 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe um nome entre 2 e 80 caracteres.');
  END IF;
  IF char_length(v_sector) NOT BETWEEN 2 AND 80 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe um setor entre 2 e 80 caracteres.');
  END IF;
  IF NOT public.is_pos_chat_link_enabled(p_project_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assistente indisponivel.');
  END IF;

  SELECT visitor.* INTO v_visitor
  FROM public.pos_ai_chat_visitors visitor
  WHERE visitor.project_id = p_project_id
    AND lower(btrim(visitor.name)) = lower(v_name)
    AND lower(btrim(visitor.sector)) = lower(v_sector)
  LIMIT 1;

  IF FOUND AND NOT v_visitor.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este usuario esta desativado. Solicite a reativacao ao responsavel.'
    );
  ELSIF FOUND THEN
    UPDATE public.pos_ai_chat_visitors
    SET last_seen_at = now()
    WHERE id = v_visitor.id
    RETURNING * INTO v_visitor;
  ELSE
    INSERT INTO public.pos_ai_chat_visitors (project_id, name, sector)
    VALUES (p_project_id, v_name, v_sector)
    RETURNING * INTO v_visitor;
  END IF;

  RETURN jsonb_build_object('success', true, 'visitor', jsonb_build_object(
    'id', v_visitor.id,
    'name', v_visitor.name,
    'sector', v_visitor.sector,
    'last_seen_at', v_visitor.last_seen_at
  ));
END;
$$;

CREATE OR REPLACE FUNCTION public.select_pos_chat_visitor(
  p_project_id UUID,
  p_visitor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor public.pos_ai_chat_visitors%ROWTYPE;
BEGIN
  IF NOT public.is_pos_chat_link_enabled(p_project_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assistente indisponivel.');
  END IF;

  UPDATE public.pos_ai_chat_visitors visitor
  SET last_seen_at = now()
  WHERE visitor.id = p_visitor_id
    AND visitor.project_id = p_project_id
    AND visitor.is_active
  RETURNING * INTO v_visitor;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario nao encontrado ou desativado.');
  END IF;

  RETURN jsonb_build_object('success', true, 'visitor', jsonb_build_object(
    'id', v_visitor.id,
    'name', v_visitor.name,
    'sector', v_visitor.sector,
    'last_seen_at', v_visitor.last_seen_at
  ));
END;
$$;

-- Add audit logging to destructive conversation cleanup while retaining the
-- same RPC signature used by the frontend.
CREATE OR REPLACE FUNCTION public.clear_pos_ai_chat_conversations(
  p_conversations JSONB DEFAULT '[]'::JSONB,
  p_delete_all BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_conversations INTEGER := 0;
  v_deleted_messages INTEGER := 0;
  v_deleted_sessions INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'pos_ai_logs', 'manage') THEN
    RAISE EXCEPTION 'Sem permissao para limpar conversas do assistente.' USING ERRCODE = '42501';
  END IF;

  IF NOT p_delete_all AND (
    jsonb_typeof(COALESCE(p_conversations, '[]'::JSONB)) <> 'array'
    OR jsonb_array_length(COALESCE(p_conversations, '[]'::JSONB)) = 0
  ) THEN
    RAISE EXCEPTION 'Selecione ao menos uma conversa.' USING ERRCODE = '22023';
  END IF;

  IF p_delete_all THEN
    SELECT COUNT(*)::INTEGER INTO v_deleted_conversations
    FROM (SELECT DISTINCT project_id, session_id FROM public.pos_ai_chat_messages) conversations;
    DELETE FROM public.pos_ai_chat_messages;
    GET DIAGNOSTICS v_deleted_messages = ROW_COUNT;
    DELETE FROM public.pos_ai_chat_sessions;
    GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;
  ELSE
    WITH requested AS (
      SELECT DISTINCT selection.project_id, selection.session_id
      FROM jsonb_to_recordset(p_conversations) AS selection(project_id UUID, session_id TEXT)
      WHERE selection.project_id IS NOT NULL AND NULLIF(btrim(selection.session_id), '') IS NOT NULL
    )
    SELECT COUNT(*)::INTEGER INTO v_deleted_conversations
    FROM requested
    WHERE EXISTS (
      SELECT 1 FROM public.pos_ai_chat_messages message
      WHERE message.project_id = requested.project_id AND message.session_id = requested.session_id
    );

    WITH requested AS (
      SELECT DISTINCT selection.project_id, selection.session_id
      FROM jsonb_to_recordset(p_conversations) AS selection(project_id UUID, session_id TEXT)
    )
    DELETE FROM public.pos_ai_chat_messages message USING requested
    WHERE message.project_id = requested.project_id AND message.session_id = requested.session_id;
    GET DIAGNOSTICS v_deleted_messages = ROW_COUNT;

    WITH requested AS (
      SELECT DISTINCT selection.project_id, selection.session_id
      FROM jsonb_to_recordset(p_conversations) AS selection(project_id UUID, session_id TEXT)
    )
    DELETE FROM public.pos_ai_chat_sessions session USING requested
    WHERE session.project_id = requested.project_id AND session.session_id = requested.session_id;
    GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;
  END IF;

  PERFORM public.log_pos_ai_chat_admin_action(
    CASE WHEN p_delete_all THEN 'pos_chat_conversations_cleared_all' ELSE 'pos_chat_conversations_cleared' END,
    jsonb_build_object(
      'deletedConversations', v_deleted_conversations,
      'deletedMessages', v_deleted_messages,
      'selection', CASE WHEN p_delete_all THEN NULL ELSE p_conversations END
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_conversations', v_deleted_conversations,
    'deleted_messages', v_deleted_messages,
    'deleted_sessions', v_deleted_sessions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pos_chat_visitors(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_pos_chat_visitor(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_pos_chat_visitor(UUID, UUID) TO anon, authenticated;

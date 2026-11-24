-- ============================================================================
-- FASE P1: pos-chat Opcao A (Token Opaco Automatico) + Restricao de Links
-- ============================================================================

ALTER TABLE public.pos_ai_chat_visitors
  ADD COLUMN IF NOT EXISTS access_token_hash TEXT;

-- Remove acesso anonimo a lista de visitantes e selecao sem segredo
REVOKE ALL ON FUNCTION public.get_pos_chat_visitors(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pos_chat_visitors(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.select_pos_chat_visitor(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.select_pos_chat_visitor(uuid, uuid) TO authenticated, service_role;

-- Helper interno: valida token opaco em SHA-256 usando pg_catalog.sha256 nativo
CREATE OR REPLACE FUNCTION public.verify_pos_chat_visitor_token(
  p_project_id uuid,
  p_visitor_id uuid,
  p_visitor_token text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pos_ai_chat_visitors v
    WHERE v.id = p_visitor_id
      AND v.project_id = p_project_id
      AND COALESCE(v.is_active, true) = true
      AND v.access_token_hash IS NOT NULL
      AND NULLIF(btrim(COALESCE(p_visitor_token, '')), '') IS NOT NULL
      AND v.access_token_hash = encode(sha256(convert_to(btrim(p_visitor_token), 'UTF8')), 'hex')
  );
$$;

REVOKE ALL ON FUNCTION public.verify_pos_chat_visitor_token(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pos_chat_visitor_token(uuid, uuid, text) TO service_role;

-- Registra visitante e devolve access_token opaco de 256 bits para persistencia silenciosa no navegador
CREATE OR REPLACE FUNCTION public.register_pos_chat_visitor(
  p_project_id uuid,
  p_name text,
  p_sector text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_base_name TEXT := btrim(regexp_replace(COALESCE(p_name, ''), '\s+', ' ', 'g'));
  v_candidate_name TEXT;
  v_sector TEXT := btrim(regexp_replace(COALESCE(p_sector, ''), '\s+', ' ', 'g'));
  v_visitor public.pos_ai_chat_visitors%ROWTYPE;
  v_raw_token TEXT := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_token_hash TEXT := encode(sha256(convert_to(v_raw_token, 'UTF8')), 'hex');
  v_attempt INT := 1;
BEGIN
  IF char_length(v_base_name) NOT BETWEEN 2 AND 80 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe um nome entre 2 e 80 caracteres.');
  END IF;

  IF char_length(v_sector) NOT BETWEEN 2 AND 80 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe um setor entre 2 e 80 caracteres.');
  END IF;

  IF NOT public.is_pos_chat_link_enabled(p_project_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assistente indisponivel.');
  END IF;

  -- Migracao transparente para visitantes legados (ainda sem access_token_hash)
  SELECT visitor.* INTO v_visitor
  FROM public.pos_ai_chat_visitors visitor
  WHERE visitor.project_id = p_project_id
    AND lower(btrim(visitor.name)) = lower(v_base_name)
    AND lower(btrim(visitor.sector)) = lower(v_sector)
  LIMIT 1;

  IF FOUND THEN
    IF NOT COALESCE(v_visitor.is_active, true) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Este usuario esta desativado. Solicite a reativacao ao responsavel.'
      );
    END IF;

    IF v_visitor.access_token_hash IS NULL THEN
      UPDATE public.pos_ai_chat_visitors
      SET last_seen_at = now(),
          access_token_hash = v_token_hash
      WHERE id = v_visitor.id
      RETURNING * INTO v_visitor;

      RETURN jsonb_build_object(
        'success', true,
        'access_token', v_raw_token,
        'visitor', jsonb_build_object(
          'id', v_visitor.id,
          'name', v_visitor.name,
          'sector', v_visitor.sector,
          'last_seen_at', v_visitor.last_seen_at
        )
      );
    END IF;
  END IF;

  -- Se ja existir identidade ativa protegida por token de outro dispositivo, cria sessao isolada
  LOOP
    v_candidate_name := CASE
      WHEN v_attempt = 1 THEN v_base_name
      ELSE left(v_base_name, 72) || ' (' || v_attempt::text || ')'
    END;

    BEGIN
      INSERT INTO public.pos_ai_chat_visitors (project_id, name, sector, access_token_hash)
      VALUES (p_project_id, v_candidate_name, v_sector, v_token_hash)
      RETURNING * INTO v_visitor;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      IF v_attempt > 50 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nao foi possivel iniciar sua sessao agora. Tente adicionar seu sobrenome.');
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'access_token', v_raw_token,
    'visitor', jsonb_build_object(
      'id', v_visitor.id,
      'name', v_visitor.name,
      'sector', v_visitor.sector,
      'last_seen_at', v_visitor.last_seen_at
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_pos_chat_visitor(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_pos_chat_visitor(uuid, text, text) TO anon, authenticated, service_role;

-- Valida sessao lembrada no navegador (substitui get_pos_chat_visitors + select_pos_chat_visitor)
CREATE OR REPLACE FUNCTION public.verify_pos_chat_visitor_session(
  p_project_id uuid,
  p_visitor_id uuid,
  p_visitor_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_visitor public.pos_ai_chat_visitors%ROWTYPE;
BEGIN
  IF NOT public.is_pos_chat_link_enabled(p_project_id) THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  IF NOT public.verify_pos_chat_visitor_token(p_project_id, p_visitor_id, p_visitor_token) THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  UPDATE public.pos_ai_chat_visitors
  SET last_seen_at = now()
  WHERE id = p_visitor_id
    AND project_id = p_project_id
  RETURNING * INTO v_visitor;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'visitor', jsonb_build_object(
      'id', v_visitor.id,
      'name', v_visitor.name,
      'sector', v_visitor.sector,
      'last_seen_at', v_visitor.last_seen_at
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_pos_chat_visitor_session(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_pos_chat_visitor_session(uuid, uuid, text) TO anon, authenticated, service_role;

-- Novas assinaturas protegidas por p_visitor_token
CREATE OR REPLACE FUNCTION public.get_pos_chat_visitor_sessions(
  p_project_id uuid,
  p_visitor_id uuid,
  p_visitor_token text
)
RETURNS TABLE (
  session_id text,
  title text,
  first_message text,
  last_message text,
  total_messages bigint,
  user_messages bigint,
  started_at timestamptz,
  last_message_at timestamptz,
  helpful_count bigint,
  unhelpful_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH auth_ok AS (
    SELECT public.verify_pos_chat_visitor_token(p_project_id, p_visitor_id, p_visitor_token) AS ok
  ),
  visitor_messages AS (
    SELECT message.*
    FROM public.pos_ai_chat_messages message
    CROSS JOIN auth_ok
    WHERE auth_ok.ok = true
      AND message.project_id = p_project_id
      AND message.visitor_id = p_visitor_id
  ),
  session_summary AS (
    SELECT
      message.session_id,
      MIN(message.created_at) AS started_at,
      MAX(message.created_at) AS last_message_at,
      COUNT(*) AS total_messages,
      COUNT(*) FILTER (WHERE message.role = 'user') AS user_messages,
      COUNT(*) FILTER (WHERE message.feedback = 'helpful') AS helpful_count,
      COUNT(*) FILTER (WHERE message.feedback = 'unhelpful') AS unhelpful_count
    FROM visitor_messages message
    GROUP BY message.session_id
  ),
  first_user_msgs AS (
    SELECT DISTINCT ON (message.session_id)
      message.session_id,
      message.content AS first_message
    FROM visitor_messages message
    WHERE message.role = 'user'
    ORDER BY message.session_id, message.created_at ASC
  ),
  last_msgs AS (
    SELECT DISTINCT ON (message.session_id)
      message.session_id,
      message.content AS last_message
    FROM visitor_messages message
    ORDER BY message.session_id, message.created_at DESC
  )
  SELECT
    summary.session_id,
    COALESCE(custom.title, first_msg.first_message, 'Nova conversa') AS title,
    COALESCE(first_msg.first_message, 'Nova conversa') AS first_message,
    last_msg.last_message,
    summary.total_messages,
    summary.user_messages,
    summary.started_at,
    summary.last_message_at,
    summary.helpful_count,
    summary.unhelpful_count
  FROM session_summary summary
  LEFT JOIN first_user_msgs first_msg ON first_msg.session_id = summary.session_id
  LEFT JOIN last_msgs last_msg ON last_msg.session_id = summary.session_id
  LEFT JOIN public.pos_ai_chat_sessions custom
    ON custom.project_id = p_project_id
   AND custom.session_id = summary.session_id
  ORDER BY summary.last_message_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_pos_chat_visitor_sessions(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pos_chat_visitor_sessions(uuid, uuid, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_pos_chat_session_messages(
  p_project_id uuid,
  p_session_id text,
  p_visitor_id uuid,
  p_visitor_token text
)
RETURNS TABLE (
  id uuid,
  role text,
  content text,
  response_id text,
  feedback text,
  feedback_comment text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    message.id,
    message.role,
    message.content,
    message.response_id,
    message.feedback,
    message.feedback_comment,
    message.created_at
  FROM public.pos_ai_chat_messages message
  WHERE public.verify_pos_chat_visitor_token(p_project_id, p_visitor_id, p_visitor_token)
    AND message.project_id = p_project_id
    AND message.session_id = p_session_id
    AND message.visitor_id = p_visitor_id
  ORDER BY message.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_pos_chat_session_messages(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pos_chat_session_messages(uuid, text, uuid, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rename_pos_chat_visitor_session(
  p_project_id uuid,
  p_session_id text,
  p_visitor_id uuid,
  p_title text,
  p_visitor_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_title TEXT := btrim(regexp_replace(COALESCE(p_title, ''), '\s+', ' ', 'g'));
BEGIN
  IF NOT public.verify_pos_chat_visitor_token(p_project_id, p_visitor_id, p_visitor_token) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sessao nao autorizada.');
  END IF;

  IF char_length(v_title) NOT BETWEEN 1 AND 120 THEN
    RETURN jsonb_build_object('success', false, 'error', 'O título deve ter entre 1 e 120 caracteres.');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pos_ai_chat_messages message
    WHERE message.project_id = p_project_id
      AND message.session_id = p_session_id
      AND message.visitor_id = p_visitor_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conversa não encontrada.');
  END IF;

  INSERT INTO public.pos_ai_chat_sessions (project_id, session_id, title)
  VALUES (p_project_id, p_session_id, v_title)
  ON CONFLICT (project_id, session_id)
  DO UPDATE SET title = EXCLUDED.title, updated_at = now();

  RETURN jsonb_build_object('success', true, 'title', v_title);
END;
$$;

REVOKE ALL ON FUNCTION public.rename_pos_chat_visitor_session(uuid, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_pos_chat_visitor_session(uuid, text, uuid, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delete_pos_chat_visitor_session(
  p_project_id uuid,
  p_session_id text,
  p_visitor_id uuid,
  p_visitor_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_messages INTEGER := 0;
BEGIN
  IF NOT public.verify_pos_chat_visitor_token(p_project_id, p_visitor_id, p_visitor_token) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sessao nao autorizada.');
  END IF;

  DELETE FROM public.pos_ai_chat_messages message
  WHERE message.project_id = p_project_id
    AND message.session_id = p_session_id
    AND message.visitor_id = p_visitor_id;

  GET DIAGNOSTICS v_deleted_messages = ROW_COUNT;

  IF v_deleted_messages = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conversa não encontrada.');
  END IF;

  DELETE FROM public.pos_ai_chat_sessions session
  WHERE session.project_id = p_project_id
    AND session.session_id = p_session_id;

  RETURN jsonb_build_object('success', true, 'deleted_messages', v_deleted_messages);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_pos_chat_visitor_session(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_pos_chat_visitor_session(uuid, text, uuid, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.save_pos_chat_feedback_for_visitor(
  p_message_id uuid,
  p_visitor_id uuid,
  p_feedback text,
  p_comment text DEFAULT NULL::text,
  p_visitor_token text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_id uuid;
  v_updated public.pos_ai_chat_messages%ROWTYPE;
BEGIN
  IF p_feedback NOT IN ('helpful', 'unhelpful') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Avaliação inválida.');
  END IF;

  SELECT message.project_id INTO v_project_id
  FROM public.pos_ai_chat_messages message
  WHERE message.id = p_message_id
    AND message.visitor_id = p_visitor_id
    AND message.role = 'assistant';

  IF v_project_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mensagem não encontrada.');
  END IF;

  IF NOT public.verify_pos_chat_visitor_token(v_project_id, p_visitor_id, p_visitor_token) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sessao nao autorizada.');
  END IF;

  UPDATE public.pos_ai_chat_messages message
  SET feedback = p_feedback,
      feedback_comment = COALESCE(p_comment, message.feedback_comment)
  WHERE message.id = p_message_id
    AND message.visitor_id = p_visitor_id
    AND message.role = 'assistant'
  RETURNING message.* INTO v_updated;

  RETURN jsonb_build_object('success', true, 'message_id', v_updated.id);
END;
$$;

REVOKE ALL ON FUNCTION public.save_pos_chat_feedback_for_visitor(uuid, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_pos_chat_feedback_for_visitor(uuid, uuid, text, text, text) TO anon, authenticated, service_role;

-- Neutraliza as sobrecargas antigas (sem token) para impedir bypass por assinatura antiga
REVOKE ALL ON FUNCTION public.get_pos_chat_visitor_sessions(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_pos_chat_session_messages(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rename_pos_chat_visitor_session(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_pos_chat_visitor_session(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_pos_chat_feedback_for_visitor(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;

-- Restringe escrita em pos_ai_chat_links apenas a quem tem pos_ai_logs.manage
ALTER POLICY "Authenticated users can manage pos ai chat links"
  ON public.pos_ai_chat_links
  TO authenticated
  USING (public.has_permission(auth.uid(), 'pos_ai_logs', 'manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'pos_ai_logs', 'manage'));

CREATE POLICY "Authenticated users can view pos ai chat links"
  ON public.pos_ai_chat_links
  FOR SELECT
  TO authenticated
  USING (true);

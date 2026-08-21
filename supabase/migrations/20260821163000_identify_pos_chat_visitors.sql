-- Identifies each person using the public post-implementation assistant.
-- The project link remains scoped to one registry office, while sessions and
-- usage can now be attributed to a person and department within that office.

CREATE TABLE IF NOT EXISTS public.pos_ai_chat_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pos_ai_chat_visitors_name_length
    CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  CONSTRAINT pos_ai_chat_visitors_sector_length
    CHECK (char_length(btrim(sector)) BETWEEN 2 AND 80)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_ai_chat_visitors_identity
  ON public.pos_ai_chat_visitors (
    project_id,
    lower(btrim(name)),
    lower(btrim(sector))
  );

CREATE INDEX IF NOT EXISTS idx_pos_ai_chat_visitors_project
  ON public.pos_ai_chat_visitors (project_id, last_seen_at DESC);

ALTER TABLE public.pos_ai_chat_visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage pos chat visitors"
  ON public.pos_ai_chat_visitors
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.pos_ai_chat_messages
  ADD COLUMN IF NOT EXISTS visitor_id UUID
    REFERENCES public.pos_ai_chat_visitors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pos_ai_chat_messages_visitor
  ON public.pos_ai_chat_messages (project_id, visitor_id, session_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.get_pos_chat_visitors(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sector TEXT,
  last_seen_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT visitor.id, visitor.name, visitor.sector, visitor.last_seen_at
  FROM public.pos_ai_chat_visitors visitor
  WHERE visitor.project_id = p_project_id
    AND EXISTS (
      SELECT 1
      FROM public.projects project
      WHERE project.id = p_project_id
        AND project.is_deleted = false
        AND project.custom_fields->>'pos_assistant_enabled' = 'true'
    )
  ORDER BY visitor.last_seen_at DESC, lower(visitor.name) ASC;
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.projects project
    WHERE project.id = p_project_id
      AND project.is_deleted = false
      AND project.custom_fields->>'pos_assistant_enabled' = 'true'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assistente indisponível.');
  END IF;

  SELECT * INTO v_visitor
  FROM public.pos_ai_chat_visitors visitor
  WHERE visitor.project_id = p_project_id
    AND lower(btrim(visitor.name)) = lower(v_name)
    AND lower(btrim(visitor.sector)) = lower(v_sector)
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.pos_ai_chat_visitors
    SET last_seen_at = now()
    WHERE id = v_visitor.id
    RETURNING * INTO v_visitor;
  ELSE
    INSERT INTO public.pos_ai_chat_visitors (project_id, name, sector)
    VALUES (p_project_id, v_name, v_sector)
    RETURNING * INTO v_visitor;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'visitor', jsonb_build_object(
      'id', v_visitor.id,
      'name', v_visitor.name,
      'sector', v_visitor.sector,
      'last_seen_at', v_visitor.last_seen_at
    )
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_visitor
    FROM public.pos_ai_chat_visitors visitor
    WHERE visitor.project_id = p_project_id
      AND lower(btrim(visitor.name)) = lower(v_name)
      AND lower(btrim(visitor.sector)) = lower(v_sector)
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'visitor', jsonb_build_object(
        'id', v_visitor.id,
        'name', v_visitor.name,
        'sector', v_visitor.sector,
        'last_seen_at', v_visitor.last_seen_at
      )
    );
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
  UPDATE public.pos_ai_chat_visitors visitor
  SET last_seen_at = now()
  WHERE visitor.id = p_visitor_id
    AND visitor.project_id = p_project_id
    AND EXISTS (
      SELECT 1
      FROM public.projects project
      WHERE project.id = p_project_id
        AND project.is_deleted = false
        AND project.custom_fields->>'pos_assistant_enabled' = 'true'
    )
  RETURNING * INTO v_visitor;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'visitor', jsonb_build_object(
      'id', v_visitor.id,
      'name', v_visitor.name,
      'sector', v_visitor.sector,
      'last_seen_at', v_visitor.last_seen_at
    )
  );
END;
$$;

DROP FUNCTION IF EXISTS public.get_pos_chat_project_sessions(UUID);

CREATE OR REPLACE FUNCTION public.get_pos_chat_visitor_sessions(
  p_project_id UUID,
  p_visitor_id UUID
)
RETURNS TABLE (
  session_id TEXT,
  title TEXT,
  first_message TEXT,
  last_message TEXT,
  total_messages BIGINT,
  user_messages BIGINT,
  started_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  helpful_count BIGINT,
  unhelpful_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH visitor_messages AS (
    SELECT message.*
    FROM public.pos_ai_chat_messages message
    WHERE message.project_id = p_project_id
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

CREATE OR REPLACE FUNCTION public.get_pos_chat_session_messages(
  p_project_id UUID,
  p_session_id TEXT,
  p_visitor_id UUID
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  response_id TEXT,
  feedback TEXT,
  feedback_comment TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
  WHERE message.project_id = p_project_id
    AND message.session_id = p_session_id
    AND message.visitor_id = p_visitor_id
  ORDER BY message.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.rename_pos_chat_visitor_session(
  p_project_id UUID,
  p_session_id TEXT,
  p_visitor_id UUID,
  p_title TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT := btrim(regexp_replace(COALESCE(p_title, ''), '\s+', ' ', 'g'));
BEGIN
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

CREATE OR REPLACE FUNCTION public.delete_pos_chat_visitor_session(
  p_project_id UUID,
  p_session_id TEXT,
  p_visitor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_messages INTEGER := 0;
BEGIN
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

CREATE OR REPLACE FUNCTION public.save_pos_chat_feedback_for_visitor(
  p_message_id UUID,
  p_visitor_id UUID,
  p_feedback TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated public.pos_ai_chat_messages%ROWTYPE;
BEGIN
  IF p_feedback NOT IN ('helpful', 'unhelpful') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Avaliação inválida.');
  END IF;

  UPDATE public.pos_ai_chat_messages message
  SET feedback = p_feedback,
      feedback_comment = COALESCE(p_comment, message.feedback_comment)
  WHERE message.id = p_message_id
    AND message.visitor_id = p_visitor_id
    AND message.role = 'assistant'
  RETURNING message.* INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mensagem não encontrada.');
  END IF;

  RETURN jsonb_build_object('success', true, 'message_id', v_updated.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pos_chat_visitor_stats(p_project_id UUID)
RETURNS TABLE (
  visitor_id UUID,
  name TEXT,
  sector TEXT,
  total_sessions BIGINT,
  user_messages BIGINT,
  total_messages BIGINT,
  total_tokens BIGINT,
  estimated_cost_usd NUMERIC,
  last_activity TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    visitor.id AS visitor_id,
    visitor.name,
    visitor.sector,
    COUNT(DISTINCT message.session_id) FILTER (WHERE message.id IS NOT NULL) AS total_sessions,
    COUNT(*) FILTER (WHERE message.role = 'user') AS user_messages,
    COUNT(message.id) AS total_messages,
    COALESCE(SUM(message.total_tokens), 0)::BIGINT AS total_tokens,
    ROUND(
      (COALESCE(SUM(message.input_tokens - COALESCE(message.cached_tokens, 0)), 0) * 0.00000005) +
      (COALESCE(SUM(message.cached_tokens), 0) * 0.000000005) +
      (COALESCE(SUM(message.output_tokens), 0) * 0.0000004),
      6
    ) AS estimated_cost_usd,
    COALESCE(MAX(message.created_at), visitor.last_seen_at) AS last_activity
  FROM public.pos_ai_chat_visitors visitor
  LEFT JOIN public.pos_ai_chat_messages message
    ON message.project_id = visitor.project_id
   AND message.visitor_id = visitor.id
  WHERE visitor.project_id = p_project_id
  GROUP BY visitor.id, visitor.name, visitor.sector, visitor.last_seen_at
  ORDER BY user_messages DESC, last_activity DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_pos_chat_project_summary(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary JSONB;
  v_recent_messages JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_messages', COUNT(*),
    'user_messages', COUNT(*) FILTER (WHERE message.role = 'user'),
    'assistant_messages', COUNT(*) FILTER (WHERE message.role = 'assistant'),
    'helpful_count', COUNT(*) FILTER (WHERE message.feedback = 'helpful'),
    'unhelpful_count', COUNT(*) FILTER (WHERE message.feedback = 'unhelpful'),
    'total_sessions', COUNT(DISTINCT message.session_id),
    'last_interaction', MAX(message.created_at)
  ) INTO v_summary
  FROM public.pos_ai_chat_messages message
  WHERE message.project_id = p_project_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', recent.id,
        'session_id', recent.session_id,
        'role', recent.role,
        'content', recent.content,
        'feedback', recent.feedback,
        'feedback_comment', recent.feedback_comment,
        'visitor_name', recent.visitor_name,
        'visitor_sector', recent.visitor_sector,
        'created_at', recent.created_at
      ) ORDER BY recent.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_recent_messages
  FROM (
    SELECT
      message.*,
      visitor.name AS visitor_name,
      visitor.sector AS visitor_sector
    FROM public.pos_ai_chat_messages message
    LEFT JOIN public.pos_ai_chat_visitors visitor ON visitor.id = message.visitor_id
    WHERE message.project_id = p_project_id
    ORDER BY message.created_at DESC
    LIMIT 50
  ) recent;

  RETURN v_summary || jsonb_build_object('recent_messages', v_recent_messages);
END;
$$;

DROP POLICY IF EXISTS "Anon users can read pos_ai_chat_messages for session"
  ON public.pos_ai_chat_messages;
DROP POLICY IF EXISTS "Anon users can insert pos_ai_chat_messages"
  ON public.pos_ai_chat_messages;
DROP POLICY IF EXISTS "Anon users can update feedback on pos_ai_chat_messages"
  ON public.pos_ai_chat_messages;

REVOKE ALL ON FUNCTION public.save_pos_chat_feedback(UUID, TEXT, TEXT) FROM anon;

REVOKE ALL ON FUNCTION public.get_pos_chat_visitors(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_pos_chat_visitor(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.select_pos_chat_visitor(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pos_chat_visitor_sessions(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pos_chat_session_messages(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rename_pos_chat_visitor_session(UUID, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_pos_chat_visitor_session(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_pos_chat_feedback_for_visitor(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pos_chat_visitor_stats(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pos_chat_project_summary(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_pos_chat_visitors(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_pos_chat_visitor(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_pos_chat_visitor(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pos_chat_visitor_sessions(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pos_chat_session_messages(UUID, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rename_pos_chat_visitor_session(UUID, TEXT, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_pos_chat_visitor_session(UUID, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_pos_chat_feedback_for_visitor(UUID, UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pos_chat_visitor_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pos_chat_project_summary(UUID) TO authenticated;

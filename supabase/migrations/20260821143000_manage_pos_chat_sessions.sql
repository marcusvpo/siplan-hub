-- Persistent titles and public management actions for post-implementation chat sessions.

CREATE TABLE IF NOT EXISTS public.pos_ai_chat_sessions (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, session_id),
  CONSTRAINT pos_ai_chat_sessions_title_length
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 120)
);

ALTER TABLE public.pos_ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage pos_ai_chat_sessions"
  ON public.pos_ai_chat_sessions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP FUNCTION IF EXISTS public.get_pos_chat_project_sessions(UUID);

CREATE FUNCTION public.get_pos_chat_project_sessions(p_project_id UUID)
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
  WITH session_summary AS (
    SELECT
      m.session_id,
      MIN(m.created_at) AS started_at,
      MAX(m.created_at) AS last_message_at,
      COUNT(*) AS total_messages,
      COUNT(*) FILTER (WHERE m.role = 'user') AS user_messages,
      COUNT(*) FILTER (WHERE m.feedback = 'helpful') AS helpful_count,
      COUNT(*) FILTER (WHERE m.feedback = 'unhelpful') AS unhelpful_count
    FROM public.pos_ai_chat_messages m
    WHERE m.project_id = p_project_id
    GROUP BY m.session_id
  ),
  first_user_msgs AS (
    SELECT DISTINCT ON (m.session_id)
      m.session_id,
      m.content AS first_message
    FROM public.pos_ai_chat_messages m
    WHERE m.project_id = p_project_id AND m.role = 'user'
    ORDER BY m.session_id, m.created_at ASC
  ),
  last_msgs AS (
    SELECT DISTINCT ON (m.session_id)
      m.session_id,
      m.content AS last_message
    FROM public.pos_ai_chat_messages m
    WHERE m.project_id = p_project_id
    ORDER BY m.session_id, m.created_at DESC
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

CREATE OR REPLACE FUNCTION public.rename_pos_chat_session(
  p_project_id UUID,
  p_session_id TEXT,
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
    RETURN jsonb_build_object(
      'success', false,
      'error', 'O título deve ter entre 1 e 120 caracteres.'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.projects project
    WHERE project.id = p_project_id
      AND project.is_deleted = false
      AND COALESCE((project.custom_fields->>'pos_assistant_enabled')::BOOLEAN, false)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assistente indisponível.');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pos_ai_chat_messages message
    WHERE message.project_id = p_project_id
      AND message.session_id = p_session_id
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

CREATE OR REPLACE FUNCTION public.delete_pos_chat_session(
  p_project_id UUID,
  p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_messages INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.projects project
    WHERE project.id = p_project_id
      AND project.is_deleted = false
      AND COALESCE((project.custom_fields->>'pos_assistant_enabled')::BOOLEAN, false)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assistente indisponível.');
  END IF;

  DELETE FROM public.pos_ai_chat_messages message
  WHERE message.project_id = p_project_id
    AND message.session_id = p_session_id;

  GET DIAGNOSTICS v_deleted_messages = ROW_COUNT;

  DELETE FROM public.pos_ai_chat_sessions session
  WHERE session.project_id = p_project_id
    AND session.session_id = p_session_id;

  IF v_deleted_messages = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conversa não encontrada.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_messages', v_deleted_messages
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_pos_chat_project_sessions(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rename_pos_chat_session(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_pos_chat_session(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_pos_chat_project_sessions(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rename_pos_chat_session(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_pos_chat_session(UUID, TEXT) TO anon, authenticated;

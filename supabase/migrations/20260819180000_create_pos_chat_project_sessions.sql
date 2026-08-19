-- Migration: 20260819180000_create_pos_chat_project_sessions.sql
-- RPC to fetch all chat sessions and their summary for a given project

CREATE OR REPLACE FUNCTION public.get_pos_chat_project_sessions(p_project_id UUID)
RETURNS TABLE (
  session_id TEXT,
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
    s.session_id,
    COALESCE(f.first_message, 'Nova conversa') AS first_message,
    l.last_message,
    s.total_messages,
    s.user_messages,
    s.started_at,
    s.last_message_at,
    s.helpful_count,
    s.unhelpful_count
  FROM session_summary s
  LEFT JOIN first_user_msgs f ON f.session_id = s.session_id
  LEFT JOIN last_msgs l ON l.session_id = s.session_id
  ORDER BY s.last_message_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_pos_chat_project_sessions(UUID) TO anon, authenticated;

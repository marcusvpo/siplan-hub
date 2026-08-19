-- Migration: 20260819150000_create_pos_ai_chat.sql
-- Create pos_ai_chat_messages table, indexes, RLS policies, and RPC functions for the Post-Implementation AI Assistant (Orion TN)

-- 1. Table: pos_ai_chat_messages
CREATE TABLE IF NOT EXISTS public.pos_ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  response_id TEXT,
  feedback TEXT CHECK (feedback IN ('helpful', 'unhelpful') OR feedback IS NULL),
  feedback_comment TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_pos_ai_chat_messages_project_id 
  ON public.pos_ai_chat_messages(project_id);

CREATE INDEX IF NOT EXISTS idx_pos_ai_chat_messages_session 
  ON public.pos_ai_chat_messages(project_id, session_id, created_at ASC);

-- 3. RLS
ALTER TABLE public.pos_ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all messages (internal dashboard)
CREATE POLICY "Authenticated users can read pos_ai_chat_messages"
  ON public.pos_ai_chat_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to manage pos_ai_chat_messages
CREATE POLICY "Authenticated users can insert/update pos_ai_chat_messages"
  ON public.pos_ai_chat_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to select messages
CREATE POLICY "Anon users can read pos_ai_chat_messages for session"
  ON public.pos_ai_chat_messages
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to insert messages
CREATE POLICY "Anon users can insert pos_ai_chat_messages"
  ON public.pos_ai_chat_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to update feedback on messages
CREATE POLICY "Anon users can update feedback on pos_ai_chat_messages"
  ON public.pos_ai_chat_messages
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- 4. RPC: get_pos_assistant_project_info
-- Retrieves minimal public project info for the AI assistant chat
CREATE OR REPLACE FUNCTION public.get_pos_assistant_project_info(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_record public.projects%ROWTYPE;
BEGIN
  SELECT * INTO project_record 
  FROM public.projects 
  WHERE id = p_id AND is_deleted = false;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', project_record.id,
    'client_name', project_record.client_name,
    'system_type', project_record.system_type,
    'products', project_record.products,
    'ticket_number', project_record.ticket_number,
    'post_status', project_record.post_status,
    'post_start_date', project_record.post_start_date,
    'post_end_date', project_record.post_end_date
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pos_assistant_project_info(UUID) TO anon, authenticated;

-- 5. RPC: save_pos_chat_feedback
-- Allows public client to rate an assistant response (helpful / unhelpful)
CREATE OR REPLACE FUNCTION public.save_pos_chat_feedback(
  p_message_id UUID,
  p_feedback TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated public.pos_ai_chat_messages%ROWTYPE;
BEGIN
  IF p_feedback NOT IN ('helpful', 'unhelpful') AND p_feedback IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid feedback value');
  END IF;

  UPDATE public.pos_ai_chat_messages
  SET 
    feedback = p_feedback,
    feedback_comment = COALESCE(p_comment, feedback_comment)
  WHERE id = p_message_id
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_updated.id,
    'feedback', v_updated.feedback
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_pos_chat_feedback(UUID, TEXT, TEXT) TO anon, authenticated;

-- 6. RPC: get_pos_chat_project_summary
-- Aggregates metrics and recent sessions for the internal Análise Pós-Implantação tab
CREATE OR REPLACE FUNCTION public.get_pos_chat_project_summary(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_messages INT;
  v_total_user_messages INT;
  v_total_assistant_messages INT;
  v_helpful_count INT;
  v_unhelpful_count INT;
  v_total_sessions INT;
  v_last_interaction TIMESTAMPTZ;
  v_recent_messages JSONB;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE role = 'user'),
    COUNT(*) FILTER (WHERE role = 'assistant'),
    COUNT(*) FILTER (WHERE feedback = 'helpful'),
    COUNT(*) FILTER (WHERE feedback = 'unhelpful'),
    COUNT(DISTINCT session_id),
    MAX(created_at)
  INTO 
    v_total_messages,
    v_total_user_messages,
    v_total_assistant_messages,
    v_helpful_count,
    v_unhelpful_count,
    v_total_sessions,
    v_last_interaction
  FROM public.pos_ai_chat_messages
  WHERE project_id = p_project_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'session_id', m.session_id,
        'role', m.role,
        'content', m.content,
        'feedback', m.feedback,
        'feedback_comment', m.feedback_comment,
        'created_at', m.created_at
      ) ORDER BY m.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_recent_messages
  FROM (
    SELECT * 
    FROM public.pos_ai_chat_messages 
    WHERE project_id = p_project_id 
    ORDER BY created_at DESC 
    LIMIT 50
  ) m;

  RETURN jsonb_build_object(
    'total_messages', COALESCE(v_total_messages, 0),
    'user_messages', COALESCE(v_total_user_messages, 0),
    'assistant_messages', COALESCE(v_total_assistant_messages, 0),
    'helpful_count', COALESCE(v_helpful_count, 0),
    'unhelpful_count', COALESCE(v_unhelpful_count, 0),
    'total_sessions', COALESCE(v_total_sessions, 0),
    'last_interaction', v_last_interaction,
    'recent_messages', v_recent_messages
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pos_chat_project_summary(UUID) TO authenticated;

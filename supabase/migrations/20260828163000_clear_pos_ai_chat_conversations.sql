-- Allows assistant managers to remove selected conversations or clear the full
-- internal history while preserving links and registered visitors.

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
    RAISE EXCEPTION 'Sem permissao para limpar conversas do assistente.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT p_delete_all AND (
    jsonb_typeof(COALESCE(p_conversations, '[]'::JSONB)) <> 'array'
    OR jsonb_array_length(COALESCE(p_conversations, '[]'::JSONB)) = 0
  ) THEN
    RAISE EXCEPTION 'Selecione ao menos uma conversa.'
      USING ERRCODE = '22023';
  END IF;

  IF p_delete_all THEN
    SELECT COUNT(*)::INTEGER
    INTO v_deleted_conversations
    FROM (
      SELECT DISTINCT message.project_id, message.session_id
      FROM public.pos_ai_chat_messages message
    ) conversations;

    DELETE FROM public.pos_ai_chat_messages;
    GET DIAGNOSTICS v_deleted_messages = ROW_COUNT;

    DELETE FROM public.pos_ai_chat_sessions;
    GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;
  ELSE
    WITH requested AS (
      SELECT DISTINCT selection.project_id, selection.session_id
      FROM jsonb_to_recordset(p_conversations)
        AS selection(project_id UUID, session_id TEXT)
      WHERE selection.project_id IS NOT NULL
        AND NULLIF(btrim(selection.session_id), '') IS NOT NULL
    )
    SELECT COUNT(*)::INTEGER
    INTO v_deleted_conversations
    FROM requested
    WHERE EXISTS (
      SELECT 1
      FROM public.pos_ai_chat_messages message
      WHERE message.project_id = requested.project_id
        AND message.session_id = requested.session_id
    );

    WITH requested AS (
      SELECT DISTINCT selection.project_id, selection.session_id
      FROM jsonb_to_recordset(p_conversations)
        AS selection(project_id UUID, session_id TEXT)
      WHERE selection.project_id IS NOT NULL
        AND NULLIF(btrim(selection.session_id), '') IS NOT NULL
    )
    DELETE FROM public.pos_ai_chat_messages message
    USING requested
    WHERE message.project_id = requested.project_id
      AND message.session_id = requested.session_id;
    GET DIAGNOSTICS v_deleted_messages = ROW_COUNT;

    WITH requested AS (
      SELECT DISTINCT selection.project_id, selection.session_id
      FROM jsonb_to_recordset(p_conversations)
        AS selection(project_id UUID, session_id TEXT)
      WHERE selection.project_id IS NOT NULL
        AND NULLIF(btrim(selection.session_id), '') IS NOT NULL
    )
    DELETE FROM public.pos_ai_chat_sessions session
    USING requested
    WHERE session.project_id = requested.project_id
      AND session.session_id = requested.session_id;
    GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_conversations', v_deleted_conversations,
    'deleted_messages', v_deleted_messages,
    'deleted_sessions', v_deleted_sessions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.clear_pos_ai_chat_conversations(JSONB, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_pos_ai_chat_conversations(JSONB, BOOLEAN)
  TO authenticated;

-- The original broad policies also granted DELETE to every authenticated user.
-- Keep regular authenticated access, but reserve destructive operations for managers.
DROP POLICY IF EXISTS "Authenticated users can insert/update pos_ai_chat_messages"
  ON public.pos_ai_chat_messages;

CREATE POLICY "Authenticated users can insert pos_ai_chat_messages"
  ON public.pos_ai_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update pos_ai_chat_messages"
  ON public.pos_ai_chat_messages
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Assistant managers can delete pos_ai_chat_messages"
  ON public.pos_ai_chat_messages
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'pos_ai_logs', 'manage'));

DROP POLICY IF EXISTS "Authenticated users can manage pos_ai_chat_sessions"
  ON public.pos_ai_chat_sessions;

CREATE POLICY "Authenticated users can read pos_ai_chat_sessions"
  ON public.pos_ai_chat_sessions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert pos_ai_chat_sessions"
  ON public.pos_ai_chat_sessions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update pos_ai_chat_sessions"
  ON public.pos_ai_chat_sessions
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Assistant managers can delete pos_ai_chat_sessions"
  ON public.pos_ai_chat_sessions
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'pos_ai_logs', 'manage'));

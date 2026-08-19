-- Migration: 20260819160000_enhance_pos_ai_chat_metrics.sql
-- Add token metrics, latency, model info and analytics RPC for the Post-Implementation AI Assistant

-- 1. Add analytics columns to pos_ai_chat_messages
ALTER TABLE public.pos_ai_chat_messages
  ADD COLUMN IF NOT EXISTS input_tokens INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_tokens INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tokens INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reasoning_tokens INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cached_tokens INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS latency_ms INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS prompt_id TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT;

-- 2. Create indices for analytics queries
CREATE INDEX IF NOT EXISTS idx_pos_ai_chat_messages_created_at
  ON public.pos_ai_chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pos_ai_chat_messages_feedback
  ON public.pos_ai_chat_messages(feedback);

CREATE INDEX IF NOT EXISTS idx_pos_ai_chat_messages_role
  ON public.pos_ai_chat_messages(role);

-- 3. RPC: get_pos_ai_admin_analytics
-- Aggregates KPIs, daily timeline, and detailed message logs for the admin dashboard
CREATE OR REPLACE FUNCTION public.get_pos_ai_admin_analytics(
  p_project_id UUID DEFAULT NULL,
  p_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_since TIMESTAMPTZ;
  v_kpis JSONB;
  v_timeline JSONB;
  v_by_project JSONB;
  v_recent_logs JSONB;
BEGIN
  IF p_days > 0 THEN
    v_since := now() - (p_days || ' days')::INTERVAL;
  ELSE
    v_since := '1970-01-01'::TIMESTAMPTZ;
  END IF;

  -- 1. Aggregated KPIs
  SELECT jsonb_build_object(
    'total_messages', COUNT(*),
    'user_messages', COUNT(*) FILTER (WHERE role = 'user'),
    'assistant_messages', COUNT(*) FILTER (WHERE role = 'assistant'),
    'total_sessions', COUNT(DISTINCT session_id),
    'total_projects', COUNT(DISTINCT project_id),
    'total_tokens', COALESCE(SUM(total_tokens), 0),
    'input_tokens', COALESCE(SUM(input_tokens), 0),
    'output_tokens', COALESCE(SUM(output_tokens), 0),
    'reasoning_tokens', COALESCE(SUM(reasoning_tokens), 0),
    'cached_tokens', COALESCE(SUM(cached_tokens), 0),
    'avg_latency_ms', COALESCE(ROUND(AVG(latency_ms) FILTER (WHERE role = 'assistant' AND latency_ms > 0)), 0),
    'min_latency_ms', COALESCE(MIN(latency_ms) FILTER (WHERE role = 'assistant' AND latency_ms > 0), 0),
    'max_latency_ms', COALESCE(MAX(latency_ms) FILTER (WHERE role = 'assistant' AND latency_ms > 0), 0),
    'helpful_count', COUNT(*) FILTER (WHERE feedback = 'helpful'),
    'unhelpful_count', COUNT(*) FILTER (WHERE feedback = 'unhelpful'),
    'total_feedbacks', COUNT(*) FILTER (WHERE feedback IS NOT NULL),
    'satisfaction_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE feedback IS NOT NULL) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE feedback = 'helpful')::NUMERIC / COUNT(*) FILTER (WHERE feedback IS NOT NULL)::NUMERIC) * 100, 1)
      ELSE NULL 
    END,
    -- Estimativa de custo gpt-5-nano: $0.05 / 1M input tokens + $0.20 / 1M output tokens
    'estimated_cost_usd', ROUND(
      (COALESCE(SUM(input_tokens), 0) * 0.00000005) + 
      (COALESCE(SUM(output_tokens), 0) * 0.00000020), 
      4
    )
  )
  INTO v_kpis
  FROM public.pos_ai_chat_messages
  WHERE (p_project_id IS NULL OR project_id = p_project_id)
    AND created_at >= v_since;

  -- 2. Daily Timeline
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'date', d.day_date,
        'messages_count', d.messages_count,
        'user_questions', d.user_questions,
        'tokens_count', d.tokens_count,
        'input_tokens', d.input_tokens,
        'output_tokens', d.output_tokens,
        'avg_latency_ms', d.avg_latency_ms,
        'helpful_count', d.helpful_count,
        'unhelpful_count', d.unhelpful_count
      ) ORDER BY d.day_date ASC
    ),
    '[]'::jsonb
  )
  INTO v_timeline
  FROM (
    SELECT 
      to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS day_date,
      COUNT(*) AS messages_count,
      COUNT(*) FILTER (WHERE role = 'user') AS user_questions,
      COALESCE(SUM(total_tokens), 0) AS tokens_count,
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      COALESCE(ROUND(AVG(latency_ms) FILTER (WHERE role = 'assistant' AND latency_ms > 0)), 0) AS avg_latency_ms,
      COUNT(*) FILTER (WHERE feedback = 'helpful') AS helpful_count,
      COUNT(*) FILTER (WHERE feedback = 'unhelpful') AS unhelpful_count
    FROM public.pos_ai_chat_messages
    WHERE (p_project_id IS NULL OR project_id = p_project_id)
      AND created_at >= v_since
    GROUP BY to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
  ) d;

  -- 3. Aggregates by Project
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'project_id', p.project_id,
        'client_name', COALESCE(proj.client_name, 'Projeto Desconhecido'),
        'system_type', COALESCE(proj.system_type, 'Orion TN'),
        'ticket_number', proj.ticket_number,
        'messages_count', p.messages_count,
        'user_questions', p.user_questions,
        'total_tokens', p.total_tokens,
        'helpful_count', p.helpful_count,
        'unhelpful_count', p.unhelpful_count,
        'last_active', p.last_active
      ) ORDER BY p.messages_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_by_project
  FROM (
    SELECT 
      project_id,
      COUNT(*) AS messages_count,
      COUNT(*) FILTER (WHERE role = 'user') AS user_questions,
      COALESCE(SUM(total_tokens), 0) AS total_tokens,
      COUNT(*) FILTER (WHERE feedback = 'helpful') AS helpful_count,
      COUNT(*) FILTER (WHERE feedback = 'unhelpful') AS unhelpful_count,
      MAX(created_at) AS last_active
    FROM public.pos_ai_chat_messages
    WHERE (p_project_id IS NULL OR project_id = p_project_id)
      AND created_at >= v_since
    GROUP BY project_id
  ) p
  LEFT JOIN public.projects proj ON proj.id = p.project_id;

  -- 4. Recent detailed logs
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'project_id', m.project_id,
        'client_name', COALESCE(proj.client_name, 'Desconhecido'),
        'system_type', COALESCE(proj.system_type, 'Orion TN'),
        'session_id', m.session_id,
        'role', m.role,
        'content', m.content,
        'response_id', m.response_id,
        'feedback', m.feedback,
        'feedback_comment', m.feedback_comment,
        'input_tokens', m.input_tokens,
        'output_tokens', m.output_tokens,
        'total_tokens', m.total_tokens,
        'reasoning_tokens', m.reasoning_tokens,
        'cached_tokens', m.cached_tokens,
        'latency_ms', m.latency_ms,
        'model', m.model,
        'prompt_id', m.prompt_id,
        'created_at', m.created_at
      ) ORDER BY m.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_recent_logs
  FROM (
    SELECT *
    FROM public.pos_ai_chat_messages
    WHERE (p_project_id IS NULL OR project_id = p_project_id)
      AND created_at >= v_since
    ORDER BY created_at DESC
    LIMIT 200
  ) m
  LEFT JOIN public.projects proj ON proj.id = m.project_id;

  RETURN jsonb_build_object(
    'kpis', v_kpis,
    'timeline', v_timeline,
    'by_project', v_by_project,
    'logs', v_recent_logs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pos_ai_admin_analytics(UUID, INT) TO authenticated;

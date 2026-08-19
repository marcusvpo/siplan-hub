-- Migration: 20260819170000_expand_pos_ai_analytics_depth.sql
-- Adds deeper analytics for feedbacks, latency rankings, cost in USD (GPT-5-nano + File Search), hourly distribution and project costs

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
  v_hourly_distribution JSONB;
  v_recent_logs JSONB;
  v_slowest_responses JSONB;
  v_fastest_responses JSONB;
  v_helpful_responses JSONB;
  v_unhelpful_responses JSONB;
  v_latency_distribution JSONB;
BEGIN
  IF p_days > 0 THEN
    v_since := now() - (p_days || ' days')::INTERVAL;
  ELSE
    v_since := '1970-01-01'::TIMESTAMPTZ;
  END IF;

  -- 1. Aggregated KPIs
  -- GPT-5-nano pricing:
  -- Input: $0.05 / 1M tokens ($0.00000005) | Cached: $0.025 / 1M ($0.000000025)
  -- Output: $0.20 / 1M tokens ($0.00000020)
  -- File Search tool call: ~$0.0025 per assistant query
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
    'with_comment_count', COUNT(*) FILTER (WHERE feedback_comment IS NOT NULL AND feedback_comment != ''),
    'total_feedbacks', COUNT(*) FILTER (WHERE feedback IS NOT NULL),
    'satisfaction_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE feedback IS NOT NULL) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE feedback = 'helpful')::NUMERIC / COUNT(*) FILTER (WHERE feedback IS NOT NULL)::NUMERIC) * 100, 1)
      ELSE NULL 
    END,
    'estimated_cost_usd', ROUND(
      (COALESCE(SUM(input_tokens - COALESCE(cached_tokens, 0)), 0) * 0.00000005) + 
      (COALESCE(SUM(cached_tokens), 0) * 0.000000025) + 
      (COALESCE(SUM(output_tokens), 0) * 0.00000020) + 
      (COUNT(*) FILTER (WHERE role = 'assistant') * 0.0025),
      4
    ),
    'avg_cost_per_answer_usd', CASE
      WHEN COUNT(*) FILTER (WHERE role = 'assistant') > 0 THEN
        ROUND(
          ((COALESCE(SUM(input_tokens - COALESCE(cached_tokens, 0)), 0) * 0.00000005) + 
           (COALESCE(SUM(cached_tokens), 0) * 0.000000025) + 
           (COALESCE(SUM(output_tokens), 0) * 0.00000020) + 
           (COUNT(*) FILTER (WHERE role = 'assistant') * 0.0025)) / COUNT(*) FILTER (WHERE role = 'assistant')::NUMERIC,
          4
        )
      ELSE 0
    END
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
        'assistant_replies', d.assistant_replies,
        'tokens_count', d.tokens_count,
        'input_tokens', d.input_tokens,
        'output_tokens', d.output_tokens,
        'reasoning_tokens', d.reasoning_tokens,
        'cached_tokens', d.cached_tokens,
        'avg_latency_ms', d.avg_latency_ms,
        'helpful_count', d.helpful_count,
        'unhelpful_count', d.unhelpful_count,
        'estimated_cost_usd', d.estimated_cost_usd
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
      COUNT(*) FILTER (WHERE role = 'assistant') AS assistant_replies,
      COALESCE(SUM(total_tokens), 0) AS tokens_count,
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      COALESCE(SUM(reasoning_tokens), 0) AS reasoning_tokens,
      COALESCE(SUM(cached_tokens), 0) AS cached_tokens,
      COALESCE(ROUND(AVG(latency_ms) FILTER (WHERE role = 'assistant' AND latency_ms > 0)), 0) AS avg_latency_ms,
      COUNT(*) FILTER (WHERE feedback = 'helpful') AS helpful_count,
      COUNT(*) FILTER (WHERE feedback = 'unhelpful') AS unhelpful_count,
      ROUND(
        (COALESCE(SUM(input_tokens - COALESCE(cached_tokens, 0)), 0) * 0.00000005) + 
        (COALESCE(SUM(cached_tokens), 0) * 0.000000025) + 
        (COALESCE(SUM(output_tokens), 0) * 0.00000020) + 
        (COUNT(*) FILTER (WHERE role = 'assistant') * 0.0025),
        4
      ) AS estimated_cost_usd
    FROM public.pos_ai_chat_messages
    WHERE (p_project_id IS NULL OR project_id = p_project_id)
      AND created_at >= v_since
    GROUP BY to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
  ) d;

  -- 3. Aggregates by Project with Cost
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'project_id', p.project_id,
        'client_name', COALESCE(proj.client_name, 'Projeto Desconhecido'),
        'system_type', COALESCE(proj.system_type, 'Orion TN'),
        'ticket_number', proj.ticket_number,
        'messages_count', p.messages_count,
        'user_questions', p.user_questions,
        'assistant_replies', p.assistant_replies,
        'total_tokens', p.total_tokens,
        'input_tokens', p.input_tokens,
        'output_tokens', p.output_tokens,
        'estimated_cost_usd', p.estimated_cost_usd,
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
      COUNT(*) FILTER (WHERE role = 'assistant') AS assistant_replies,
      COALESCE(SUM(total_tokens), 0) AS total_tokens,
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      ROUND(
        (COALESCE(SUM(input_tokens - COALESCE(cached_tokens, 0)), 0) * 0.00000005) + 
        (COALESCE(SUM(cached_tokens), 0) * 0.000000025) + 
        (COALESCE(SUM(output_tokens), 0) * 0.00000020) + 
        (COUNT(*) FILTER (WHERE role = 'assistant') * 0.0025),
        4
      ) AS estimated_cost_usd,
      COUNT(*) FILTER (WHERE feedback = 'helpful') AS helpful_count,
      COUNT(*) FILTER (WHERE feedback = 'unhelpful') AS unhelpful_count,
      MAX(created_at) AS last_active
    FROM public.pos_ai_chat_messages
    WHERE created_at >= v_since
    GROUP BY project_id
  ) p
  LEFT JOIN public.projects proj ON proj.id = p.project_id;

  -- 4. Hourly Distribution (Picos de Atendimento)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'hour_label', h.hour_label,
        'hour_number', h.hour_num,
        'questions_count', h.questions_count,
        'messages_count', h.messages_count
      ) ORDER BY h.hour_num ASC
    ),
    '[]'::jsonb
  )
  INTO v_hourly_distribution
  FROM (
    SELECT 
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::INT AS hour_num,
      to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'HH24"h"') AS hour_label,
      COUNT(*) FILTER (WHERE role = 'user') AS questions_count,
      COUNT(*) AS messages_count
    FROM public.pos_ai_chat_messages
    WHERE (p_project_id IS NULL OR project_id = p_project_id)
      AND created_at >= v_since
    GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::INT, to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'HH24"h"')
  ) h;

  -- 5. Latency Distribution
  SELECT jsonb_build_object(
    'fast_count', COUNT(*) FILTER (WHERE role = 'assistant' AND latency_ms > 0 AND latency_ms < 5000),
    'moderate_count', COUNT(*) FILTER (WHERE role = 'assistant' AND latency_ms >= 5000 AND latency_ms <= 10000),
    'slow_count', COUNT(*) FILTER (WHERE role = 'assistant' AND latency_ms > 10000)
  )
  INTO v_latency_distribution
  FROM public.pos_ai_chat_messages
  WHERE (p_project_id IS NULL OR project_id = p_project_id)
    AND created_at >= v_since;

  -- 6. Slowest Responses (Top 15) with Cost
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'project_id', m.project_id,
        'client_name', COALESCE(proj.client_name, 'Desconhecido'),
        'session_id', m.session_id,
        'content', m.content,
        'feedback', m.feedback,
        'feedback_comment', m.feedback_comment,
        'latency_ms', m.latency_ms,
        'total_tokens', m.total_tokens,
        'input_tokens', m.input_tokens,
        'output_tokens', m.output_tokens,
        'reasoning_tokens', m.reasoning_tokens,
        'cached_tokens', m.cached_tokens,
        'estimated_cost_usd', ROUND(
          (COALESCE(m.input_tokens - COALESCE(m.cached_tokens, 0), 0) * 0.00000005) + 
          (COALESCE(m.cached_tokens, 0) * 0.000000025) + 
          (COALESCE(m.output_tokens, 0) * 0.00000020) + 
          0.0025,
          4
        ),
        'created_at', m.created_at
      ) ORDER BY m.latency_ms DESC
    ),
    '[]'::jsonb
  )
  INTO v_slowest_responses
  FROM (
    SELECT *
    FROM public.pos_ai_chat_messages
    WHERE (p_project_id IS NULL OR project_id = p_project_id)
      AND role = 'assistant'
      AND latency_ms > 0
      AND created_at >= v_since
    ORDER BY latency_ms DESC
    LIMIT 15
  ) m
  LEFT JOIN public.projects proj ON proj.id = m.project_id;

  -- 7. Fastest Responses (Top 15) with Cost
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'project_id', m.project_id,
        'client_name', COALESCE(proj.client_name, 'Desconhecido'),
        'session_id', m.session_id,
        'content', m.content,
        'feedback', m.feedback,
        'feedback_comment', m.feedback_comment,
        'latency_ms', m.latency_ms,
        'total_tokens', m.total_tokens,
        'input_tokens', m.input_tokens,
        'output_tokens', m.output_tokens,
        'reasoning_tokens', m.reasoning_tokens,
        'cached_tokens', m.cached_tokens,
        'estimated_cost_usd', ROUND(
          (COALESCE(m.input_tokens - COALESCE(m.cached_tokens, 0), 0) * 0.00000005) + 
          (COALESCE(m.cached_tokens, 0) * 0.000000025) + 
          (COALESCE(m.output_tokens, 0) * 0.00000020) + 
          0.0025,
          4
        ),
        'created_at', m.created_at
      ) ORDER BY m.latency_ms ASC
    ),
    '[]'::jsonb
  )
  INTO v_fastest_responses
  FROM (
    SELECT *
    FROM public.pos_ai_chat_messages
    WHERE (p_project_id IS NULL OR project_id = p_project_id)
      AND role = 'assistant'
      AND latency_ms > 0
      AND created_at >= v_since
    ORDER BY latency_ms ASC
    LIMIT 15
  ) m
  LEFT JOIN public.projects proj ON proj.id = m.project_id;

  -- 8. Positive Feedback Responses
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'project_id', m.project_id,
        'client_name', COALESCE(proj.client_name, 'Desconhecido'),
        'session_id', m.session_id,
        'content', m.content,
        'feedback', m.feedback,
        'feedback_comment', m.feedback_comment,
        'latency_ms', m.latency_ms,
        'total_tokens', m.total_tokens,
        'input_tokens', m.input_tokens,
        'output_tokens', m.output_tokens,
        'estimated_cost_usd', ROUND(
          (COALESCE(m.input_tokens - COALESCE(m.cached_tokens, 0), 0) * 0.00000005) + 
          (COALESCE(m.cached_tokens, 0) * 0.000000025) + 
          (COALESCE(m.output_tokens, 0) * 0.00000020) + 
          0.0025,
          4
        ),
        'created_at', m.created_at
      ) ORDER BY m.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_helpful_responses
  FROM (
    SELECT *
    FROM public.pos_ai_chat_messages
    WHERE (p_project_id IS NULL OR project_id = p_project_id)
      AND role = 'assistant'
      AND feedback = 'helpful'
      AND created_at >= v_since
    ORDER BY created_at DESC
    LIMIT 30
  ) m
  LEFT JOIN public.projects proj ON proj.id = m.project_id;

  -- 9. Negative Feedback Responses
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'project_id', m.project_id,
        'client_name', COALESCE(proj.client_name, 'Desconhecido'),
        'session_id', m.session_id,
        'content', m.content,
        'feedback', m.feedback,
        'feedback_comment', m.feedback_comment,
        'latency_ms', m.latency_ms,
        'total_tokens', m.total_tokens,
        'input_tokens', m.input_tokens,
        'output_tokens', m.output_tokens,
        'estimated_cost_usd', ROUND(
          (COALESCE(m.input_tokens - COALESCE(m.cached_tokens, 0), 0) * 0.00000005) + 
          (COALESCE(m.cached_tokens, 0) * 0.000000025) + 
          (COALESCE(m.output_tokens, 0) * 0.00000020) + 
          0.0025,
          4
        ),
        'created_at', m.created_at
      ) ORDER BY m.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_unhelpful_responses
  FROM (
    SELECT *
    FROM public.pos_ai_chat_messages
    WHERE (p_project_id IS NULL OR project_id = p_project_id)
      AND role = 'assistant'
      AND feedback = 'unhelpful'
      AND created_at >= v_since
    ORDER BY created_at DESC
    LIMIT 30
  ) m
  LEFT JOIN public.projects proj ON proj.id = m.project_id;

  -- 10. Recent detailed logs with Cost per item
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
        'estimated_cost_usd', CASE
          WHEN m.role = 'assistant' THEN
            ROUND(
              (COALESCE(m.input_tokens - COALESCE(m.cached_tokens, 0), 0) * 0.00000005) + 
              (COALESCE(m.cached_tokens, 0) * 0.000000025) + 
              (COALESCE(m.output_tokens, 0) * 0.00000020) + 
              0.0025,
              4
            )
          ELSE 0
        END,
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
    LIMIT 300
  ) m
  LEFT JOIN public.projects proj ON proj.id = m.project_id;

  RETURN jsonb_build_object(
    'kpis', v_kpis,
    'timeline', v_timeline,
    'by_project', v_by_project,
    'hourly_distribution', v_hourly_distribution,
    'latency_distribution', v_latency_distribution,
    'slowest_responses', v_slowest_responses,
    'fastest_responses', v_fastest_responses,
    'helpful_responses', v_helpful_responses,
    'unhelpful_responses', v_unhelpful_responses,
    'logs', v_recent_logs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pos_ai_admin_analytics(UUID, INT) TO authenticated;

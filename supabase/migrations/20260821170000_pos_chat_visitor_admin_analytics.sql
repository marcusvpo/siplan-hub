-- Admin analytics for identified post-implementation assistant users.
-- Keeps the same project/period filters and pricing formula used by
-- get_pos_ai_admin_analytics so totals remain comparable.

CREATE OR REPLACE FUNCTION public.get_pos_chat_visitor_admin_analytics(
  p_project_id UUID DEFAULT NULL,
  p_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT CASE
      WHEN p_days > 0 THEN now() - make_interval(days => p_days)
      ELSE '1970-01-01'::TIMESTAMPTZ
    END AS since_at
  ),
  scoped_visitors AS MATERIALIZED (
    SELECT
      visitor.id,
      visitor.project_id,
      visitor.name,
      visitor.sector,
      visitor.created_at,
      visitor.last_seen_at,
      COALESCE(project.client_name, 'Projeto Desconhecido') AS client_name
    FROM public.pos_ai_chat_visitors visitor
    LEFT JOIN public.projects project ON project.id = visitor.project_id
    WHERE p_project_id IS NULL OR visitor.project_id = p_project_id
  ),
  filtered_messages AS MATERIALIZED (
    SELECT message.*
    FROM public.pos_ai_chat_messages message
    CROSS JOIN params
    WHERE (p_project_id IS NULL OR message.project_id = p_project_id)
      AND message.created_at >= params.since_at
  ),
  user_activity AS MATERIALIZED (
    SELECT
      visitor.id AS visitor_id,
      visitor.project_id,
      visitor.client_name,
      visitor.name,
      visitor.sector,
      COUNT(*) FILTER (WHERE message.role = 'user') AS user_questions,
      COUNT(*) FILTER (WHERE message.role = 'assistant') AS assistant_replies,
      COUNT(message.id) AS total_messages,
      COUNT(DISTINCT message.session_id) AS total_sessions,
      COALESCE(SUM(message.total_tokens), 0)::BIGINT AS total_tokens,
      ROUND(
        (COALESCE(SUM(message.input_tokens - COALESCE(message.cached_tokens, 0)), 0) * 0.00000005) +
        (COALESCE(SUM(message.cached_tokens), 0) * 0.000000025) +
        (COALESCE(SUM(message.output_tokens), 0) * 0.00000020) +
        (COUNT(*) FILTER (WHERE message.role = 'assistant') * 0.0025),
        4
      ) AS estimated_cost_usd,
      COUNT(*) FILTER (WHERE message.feedback = 'helpful') AS helpful_count,
      COUNT(*) FILTER (WHERE message.feedback = 'unhelpful') AS unhelpful_count,
      CASE
        WHEN COUNT(*) FILTER (WHERE message.feedback IS NOT NULL) > 0 THEN
          ROUND(
            COUNT(*) FILTER (WHERE message.feedback = 'helpful')::NUMERIC * 100 /
            COUNT(*) FILTER (WHERE message.feedback IS NOT NULL)::NUMERIC,
            1
          )
        ELSE NULL
      END AS satisfaction_rate,
      MAX(message.created_at) AS last_activity
    FROM scoped_visitors visitor
    JOIN filtered_messages message
      ON message.project_id = visitor.project_id
     AND message.visitor_id = visitor.id
    GROUP BY
      visitor.id,
      visitor.project_id,
      visitor.client_name,
      visitor.name,
      visitor.sector
  ),
  sector_activity AS MATERIALIZED (
    SELECT
      sector,
      COUNT(*) AS active_users,
      SUM(user_questions)::BIGINT AS user_questions,
      SUM(assistant_replies)::BIGINT AS assistant_replies,
      SUM(total_messages)::BIGINT AS total_messages,
      SUM(total_sessions)::BIGINT AS total_sessions,
      SUM(total_tokens)::BIGINT AS total_tokens,
      ROUND(SUM(estimated_cost_usd), 4) AS estimated_cost_usd,
      SUM(helpful_count)::BIGINT AS helpful_count,
      SUM(unhelpful_count)::BIGINT AS unhelpful_count,
      CASE
        WHEN SUM(helpful_count + unhelpful_count) > 0 THEN
          ROUND(SUM(helpful_count)::NUMERIC * 100 / SUM(helpful_count + unhelpful_count)::NUMERIC, 1)
        ELSE NULL
      END AS satisfaction_rate,
      MAX(last_activity) AS last_activity
    FROM user_activity
    GROUP BY sector
  ),
  message_totals AS (
    SELECT
      COUNT(*) AS total_messages,
      COUNT(*) FILTER (WHERE visitor_id IS NOT NULL) AS identified_messages,
      COUNT(*) FILTER (WHERE visitor_id IS NULL) AS unidentified_messages,
      ROUND(
        (COALESCE(SUM(input_tokens - COALESCE(cached_tokens, 0)) FILTER (WHERE visitor_id IS NULL), 0) * 0.00000005) +
        (COALESCE(SUM(cached_tokens) FILTER (WHERE visitor_id IS NULL), 0) * 0.000000025) +
        (COALESCE(SUM(output_tokens) FILTER (WHERE visitor_id IS NULL), 0) * 0.00000020) +
        (COUNT(*) FILTER (WHERE visitor_id IS NULL AND role = 'assistant') * 0.0025),
        4
      ) AS unidentified_cost_usd
    FROM filtered_messages
  ),
  visitor_totals AS (
    SELECT COUNT(*) AS registered_users FROM scoped_visitors
  ),
  activity_totals AS (
    SELECT
      COUNT(*) AS active_users,
      COUNT(DISTINCT sector) AS active_sectors,
      COALESCE(SUM(user_questions), 0)::BIGINT AS user_questions,
      COALESCE(SUM(total_sessions), 0)::BIGINT AS total_sessions,
      COALESCE(SUM(total_messages), 0)::BIGINT AS identified_messages,
      COALESCE(SUM(total_tokens), 0)::BIGINT AS total_tokens,
      COALESCE(ROUND(SUM(estimated_cost_usd), 4), 0) AS estimated_cost_usd
    FROM user_activity
  )
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'registered_users', visitor_totals.registered_users,
      'active_users', activity_totals.active_users,
      'active_sectors', activity_totals.active_sectors,
      'user_questions', activity_totals.user_questions,
      'total_sessions', activity_totals.total_sessions,
      'total_messages', message_totals.total_messages,
      'identified_messages', message_totals.identified_messages,
      'unidentified_messages', message_totals.unidentified_messages,
      'total_tokens', activity_totals.total_tokens,
      'estimated_cost_usd', activity_totals.estimated_cost_usd,
      'unidentified_cost_usd', message_totals.unidentified_cost_usd,
      'identification_rate', CASE
        WHEN message_totals.total_messages > 0 THEN
          ROUND(message_totals.identified_messages::NUMERIC * 100 / message_totals.total_messages::NUMERIC, 1)
        ELSE 0
      END,
      'avg_questions_per_user', CASE
        WHEN activity_totals.active_users > 0 THEN
          ROUND(activity_totals.user_questions::NUMERIC / activity_totals.active_users::NUMERIC, 1)
        ELSE 0
      END
    ),
    'by_user', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'visitor_id', activity.visitor_id,
          'project_id', activity.project_id,
          'client_name', activity.client_name,
          'name', activity.name,
          'sector', activity.sector,
          'user_questions', activity.user_questions,
          'assistant_replies', activity.assistant_replies,
          'total_messages', activity.total_messages,
          'total_sessions', activity.total_sessions,
          'total_tokens', activity.total_tokens,
          'estimated_cost_usd', activity.estimated_cost_usd,
          'helpful_count', activity.helpful_count,
          'unhelpful_count', activity.unhelpful_count,
          'satisfaction_rate', activity.satisfaction_rate,
          'last_activity', activity.last_activity
        ) ORDER BY activity.user_questions DESC, activity.last_activity DESC
      )
      FROM user_activity activity
    ), '[]'::JSONB),
    'by_sector', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'sector', activity.sector,
          'active_users', activity.active_users,
          'user_questions', activity.user_questions,
          'assistant_replies', activity.assistant_replies,
          'total_messages', activity.total_messages,
          'total_sessions', activity.total_sessions,
          'total_tokens', activity.total_tokens,
          'estimated_cost_usd', activity.estimated_cost_usd,
          'helpful_count', activity.helpful_count,
          'unhelpful_count', activity.unhelpful_count,
          'satisfaction_rate', activity.satisfaction_rate,
          'last_activity', activity.last_activity
        ) ORDER BY activity.user_questions DESC, activity.last_activity DESC
      )
      FROM sector_activity activity
    ), '[]'::JSONB)
  )
  FROM visitor_totals, activity_totals, message_totals;
$$;

REVOKE ALL ON FUNCTION public.get_pos_chat_visitor_admin_analytics(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pos_chat_visitor_admin_analytics(UUID, INT) FROM anon;
REVOKE ALL ON FUNCTION public.get_pos_chat_visitor_stats(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.get_pos_chat_project_summary(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pos_chat_visitor_admin_analytics(UUID, INT) TO authenticated;

-- Separa as horas gerenciais por origem para os graficos empilhados do HUB.

CREATE OR REPLACE FUNCTION public.get_sd_time_management_report(
  p_start_date DATE,
  p_end_date DATE,
  p_user_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report JSONB;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'sd_time_management', 'view') THEN
    RAISE EXCEPTION 'Sem permissao para consultar as horas da equipe.' USING ERRCODE = '42501';
  END IF;
  IF p_start_date IS NULL
     OR p_end_date IS NULL
     OR p_end_date < p_start_date
     OR p_end_date - p_start_date > 366 THEN
    RAISE EXCEPTION 'Periodo de consulta invalido.';
  END IF;

  WITH entry_totals AS (
    SELECT
      entry.id,
      entry.user_id,
      coalesce(profile.full_name, profile.email, 'Usuario')::text AS user_name,
      profile.email::text AS user_email,
      profile.team::text AS user_team,
      entry.work_date,
      entry.title,
      entry.description,
      entry.source,
      coalesce(
        sum(
          CASE
            WHEN time_interval.ended_at IS NOT NULL
             AND time_interval.ended_at > time_interval.started_at
              THEN extract(epoch FROM (time_interval.ended_at - time_interval.started_at)) / 60
            ELSE 0
          END
        ),
        0
      )::integer AS total_minutes
    FROM public.sd_time_entries entry
    JOIN public.profiles profile ON profile.id = entry.user_id
    LEFT JOIN public.sd_time_intervals time_interval ON time_interval.entry_id = entry.id
    WHERE entry.work_date BETWEEN p_start_date AND p_end_date
    GROUP BY entry.id, profile.full_name, profile.email, profile.team
  ),
  filtered AS (
    SELECT *
    FROM entry_totals entry
    WHERE (p_user_id IS NULL OR entry.user_id = p_user_id)
      AND (
        nullif(btrim(coalesce(p_search, '')), '') IS NULL
        OR concat_ws(' ', entry.user_name, entry.user_email, entry.title, entry.description)
          ILIKE '%' || btrim(p_search) || '%'
      )
  )
  SELECT jsonb_build_object(
    'total_minutes', coalesce((SELECT sum(entry.total_minutes)::integer FROM filtered entry), 0),
    'manual_minutes', coalesce((
      SELECT sum(entry.total_minutes)::integer FROM filtered entry WHERE entry.source = 'manual'
    ), 0),
    'imported_minutes', coalesce((
      SELECT sum(entry.total_minutes)::integer FROM filtered entry WHERE entry.source = 'ellevo_0800'
    ), 0),
    'analyst_count', (SELECT count(DISTINCT entry.user_id)::integer FROM filtered entry),
    'worked_user_days', (
      SELECT count(*)::integer
      FROM (SELECT DISTINCT entry.user_id, entry.work_date FROM filtered entry) worked_days
    ),
    'daily', coalesce((
      SELECT jsonb_agg(to_jsonb(day_total) ORDER BY day_total.work_date)
      FROM (
        SELECT
          entry.work_date,
          sum(entry.total_minutes)::integer AS total_minutes,
          coalesce(sum(entry.total_minutes) FILTER (WHERE entry.source = 'manual'), 0)::integer AS manual_minutes,
          coalesce(sum(entry.total_minutes) FILTER (WHERE entry.source = 'ellevo_0800'), 0)::integer AS imported_minutes
        FROM filtered entry
        GROUP BY entry.work_date
      ) day_total
    ), '[]'::jsonb),
    'analyst_totals', coalesce((
      SELECT jsonb_agg(to_jsonb(analyst_total) ORDER BY analyst_total.user_name)
      FROM (
        SELECT
          entry.user_id,
          entry.user_name,
          entry.user_email,
          entry.user_team,
          sum(entry.total_minutes)::integer AS total_minutes,
          coalesce(sum(entry.total_minutes) FILTER (WHERE entry.source = 'manual'), 0)::integer AS manual_minutes,
          coalesce(sum(entry.total_minutes) FILTER (WHERE entry.source = 'ellevo_0800'), 0)::integer AS imported_minutes,
          count(DISTINCT entry.work_date)::integer AS worked_days
        FROM filtered entry
        GROUP BY entry.user_id, entry.user_name, entry.user_email, entry.user_team
      ) analyst_total
    ), '[]'::jsonb),
    'available_analysts', coalesce((
      SELECT jsonb_agg(to_jsonb(analyst) ORDER BY analyst.user_name)
      FROM (
        SELECT DISTINCT
          entry.user_id,
          entry.user_name,
          entry.user_email,
          entry.user_team
        FROM entry_totals entry
      ) analyst
    ), '[]'::jsonb)
  ) INTO v_report;

  RETURN v_report;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sd_time_management_report(DATE, DATE, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sd_time_management_report(DATE, DATE, UUID, TEXT) TO authenticated;

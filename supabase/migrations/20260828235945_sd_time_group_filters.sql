-- Adiciona filtro multiplo por grupo de atendimento aos relatorios gerenciais do SD.
-- Horas manuais usam o grupo mais recente conhecido do analista no 0800.

CREATE INDEX IF NOT EXISTS idx_sd_time_entries_user_import_group
  ON public.sd_time_entries (user_id, work_date DESC, imported_at DESC)
  WHERE source = 'ellevo_0800';

CREATE OR REPLACE FUNCTION public.get_sd_time_management_report(
  p_start_date DATE,
  p_end_date DATE,
  p_user_id UUID,
  p_search TEXT,
  p_groups TEXT[]
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

  WITH analyst_groups AS (
    SELECT DISTINCT ON (entry.user_id)
      entry.user_id,
      nullif(btrim(entry.source_metadata->>'ellevo_group'), '') AS attendance_group
    FROM public.sd_time_entries entry
    WHERE entry.source = 'ellevo_0800'
      AND nullif(btrim(entry.source_metadata->>'ellevo_group'), '') IS NOT NULL
    ORDER BY entry.user_id, entry.work_date DESC, entry.imported_at DESC NULLS LAST, entry.created_at DESC
  ),
  entry_totals AS (
    SELECT
      entry.id,
      entry.user_id,
      coalesce(profile.full_name, profile.email, 'Usuario')::text AS user_name,
      profile.email::text AS user_email,
      profile.team::text AS user_team,
      coalesce(
        nullif(btrim(entry.source_metadata->>'ellevo_group'), ''),
        analyst_group.attendance_group
      )::text AS attendance_group,
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
    LEFT JOIN analyst_groups analyst_group ON analyst_group.user_id = entry.user_id
    LEFT JOIN public.sd_time_intervals time_interval ON time_interval.entry_id = entry.id
    WHERE entry.work_date BETWEEN p_start_date AND p_end_date
    GROUP BY entry.id, profile.full_name, profile.email, profile.team, analyst_group.attendance_group
  ),
  group_filtered AS (
    SELECT *
    FROM entry_totals entry
    WHERE coalesce(cardinality(p_groups), 0) = 0
       OR entry.attendance_group = ANY(p_groups)
  ),
  filtered AS (
    SELECT *
    FROM group_filtered entry
    WHERE (p_user_id IS NULL OR entry.user_id = p_user_id)
      AND (
        nullif(btrim(coalesce(p_search, '')), '') IS NULL
        OR concat_ws(
          ' ',
          entry.user_name,
          entry.user_email,
          entry.attendance_group,
          entry.title,
          entry.description
        ) ILIKE '%' || btrim(p_search) || '%'
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
          entry.attendance_group,
          sum(entry.total_minutes)::integer AS total_minutes,
          coalesce(sum(entry.total_minutes) FILTER (WHERE entry.source = 'manual'), 0)::integer AS manual_minutes,
          coalesce(sum(entry.total_minutes) FILTER (WHERE entry.source = 'ellevo_0800'), 0)::integer AS imported_minutes,
          count(DISTINCT entry.work_date)::integer AS worked_days
        FROM filtered entry
        GROUP BY entry.user_id, entry.user_name, entry.user_email, entry.user_team, entry.attendance_group
      ) analyst_total
    ), '[]'::jsonb),
    'available_analysts', coalesce((
      SELECT jsonb_agg(to_jsonb(analyst) ORDER BY analyst.user_name)
      FROM (
        SELECT DISTINCT
          entry.user_id,
          entry.user_name,
          entry.user_email,
          entry.user_team,
          entry.attendance_group
        FROM group_filtered entry
      ) analyst
    ), '[]'::jsonb),
    'available_groups', coalesce((
      SELECT jsonb_agg(group_name ORDER BY group_name)
      FROM (
        SELECT DISTINCT entry.attendance_group AS group_name
        FROM entry_totals entry
        WHERE entry.attendance_group IS NOT NULL
      ) groups
    ), '[]'::jsonb)
  ) INTO v_report;

  RETURN v_report;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sd_time_management_page(
  p_start_date DATE,
  p_end_date DATE,
  p_user_id UUID,
  p_search TEXT,
  p_groups TEXT[],
  p_limit INTEGER,
  p_offset INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page JSONB;
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
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION 'Paginacao invalida.';
  END IF;

  WITH analyst_groups AS (
    SELECT DISTINCT ON (entry.user_id)
      entry.user_id,
      nullif(btrim(entry.source_metadata->>'ellevo_group'), '') AS attendance_group
    FROM public.sd_time_entries entry
    WHERE entry.source = 'ellevo_0800'
      AND nullif(btrim(entry.source_metadata->>'ellevo_group'), '') IS NOT NULL
    ORDER BY entry.user_id, entry.work_date DESC, entry.imported_at DESC NULLS LAST, entry.created_at DESC
  ),
  matching_entries AS (
    SELECT
      entry.id,
      entry.user_id,
      coalesce(profile.full_name, profile.email, 'Usuario')::text AS user_name,
      profile.email::text AS user_email,
      profile.team::text AS user_team,
      coalesce(
        nullif(btrim(entry.source_metadata->>'ellevo_group'), ''),
        analyst_group.attendance_group
      )::text AS attendance_group,
      entry.work_date,
      entry.title,
      entry.description,
      entry.created_at,
      entry.updated_at,
      entry.source,
      entry.source_external_id,
      entry.source_metadata,
      entry.imported_at
    FROM public.sd_time_entries entry
    JOIN public.profiles profile ON profile.id = entry.user_id
    LEFT JOIN analyst_groups analyst_group ON analyst_group.user_id = entry.user_id
    WHERE entry.work_date BETWEEN p_start_date AND p_end_date
      AND (p_user_id IS NULL OR entry.user_id = p_user_id)
      AND (
        coalesce(cardinality(p_groups), 0) = 0
        OR coalesce(
          nullif(btrim(entry.source_metadata->>'ellevo_group'), ''),
          analyst_group.attendance_group
        ) = ANY(p_groups)
      )
      AND (
        nullif(btrim(coalesce(p_search, '')), '') IS NULL
        OR concat_ws(
          ' ',
          coalesce(profile.full_name, profile.email, 'Usuario'),
          profile.email,
          coalesce(
            nullif(btrim(entry.source_metadata->>'ellevo_group'), ''),
            analyst_group.attendance_group
          ),
          entry.title,
          entry.description
        ) ILIKE '%' || btrim(p_search) || '%'
      )
  ),
  paged_entries AS (
    SELECT *
    FROM matching_entries
    ORDER BY work_date DESC, created_at DESC, id
    LIMIT p_limit OFFSET p_offset
  )
  SELECT jsonb_build_object(
    'total_count', (SELECT count(*)::integer FROM matching_entries),
    'items', coalesce((
      SELECT jsonb_agg(to_jsonb(item) ORDER BY item.work_date DESC, item.created_at DESC, item.id)
      FROM (
        SELECT
          entry.*,
          coalesce((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', time_interval.id,
                'entry_id', time_interval.entry_id,
                'started_at', to_char(time_interval.started_at, 'HH24:MI'),
                'ended_at', CASE
                  WHEN time_interval.ended_at IS NULL THEN NULL
                  ELSE to_char(time_interval.ended_at, 'HH24:MI')
                END,
                'position', time_interval.position
              ) ORDER BY time_interval.position
            )
            FROM public.sd_time_intervals time_interval
            WHERE time_interval.entry_id = entry.id
          ), '[]'::jsonb) AS intervals
        FROM paged_entries entry
      ) item
    ), '[]'::jsonb)
  ) INTO v_page;

  RETURN v_page;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sd_time_management_report(DATE, DATE, UUID, TEXT, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sd_time_management_page(DATE, DATE, UUID, TEXT, TEXT[], INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sd_time_management_report(DATE, DATE, UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sd_time_management_page(DATE, DATE, UUID, TEXT, TEXT[], INTEGER, INTEGER) TO authenticated;

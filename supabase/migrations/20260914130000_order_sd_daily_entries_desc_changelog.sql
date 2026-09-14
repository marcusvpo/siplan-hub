-- Ordena a consulta gerencial pela data e pelo primeiro horário do lançamento.
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
      entry.imported_at,
      (
        SELECT min(time_interval.started_at)
        FROM public.sd_time_intervals time_interval
        WHERE time_interval.entry_id = entry.id
      ) AS first_started_at
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
    ORDER BY work_date DESC, first_started_at DESC NULLS LAST, created_at DESC, id
    LIMIT p_limit OFFSET p_offset
  )
  SELECT jsonb_build_object(
    'total_count', (SELECT count(*)::integer FROM matching_entries),
    'items', coalesce((
      SELECT jsonb_agg(
        to_jsonb(item) - 'first_started_at'
        ORDER BY item.work_date DESC, item.first_started_at DESC NULLS LAST, item.created_at DESC, item.id
      )
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

REVOKE ALL ON FUNCTION public.get_sd_time_management_page(DATE, DATE, UUID, TEXT, TEXT[], INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sd_time_management_page(DATE, DATE, UUID, TEXT, TEXT[], INTEGER, INTEGER) TO authenticated;

INSERT INTO public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
)
SELECT
  'changelog',
  'release_fix',
  'sd_time_management',
  'Lançamentos do dia em ordem decrescente',
  'Os lançamentos da Consulta gerencial de horas agora são exibidos do horário mais recente para o mais antigo.',
  '/sd/consulta-horas'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_fix'
    AND permission_resource = 'sd_time_management'
    AND title = 'Lançamentos do dia em ordem decrescente'
    AND action_url = '/sd/consulta-horas'
);

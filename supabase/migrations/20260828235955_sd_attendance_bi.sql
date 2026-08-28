-- BI gerencial do atendimento do SD.
-- Consolida horas, chamados, naturezas, produtos e desempenho sem depender
-- do limite de linhas do PostgREST.

INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('sd_attendance_bi', 'view', 'Visualizar o BI de atendimento do SD')
ON CONFLICT (resource, action) DO UPDATE
  SET description = EXCLUDED.description;

INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.app_roles role
JOIN public.app_permissions permission
  ON permission.resource = 'sd_attendance_bi'
 AND permission.action = 'view'
WHERE role.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Quem ja podia consultar as horas recebe o BI no primeiro deploy.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT DISTINCT current_access.role_id, new_permission.id
FROM public.app_role_permissions current_access
JOIN public.app_permissions current_permission
  ON current_permission.id = current_access.permission_id
 AND current_permission.resource = 'sd_time_management'
 AND current_permission.action = 'view'
JOIN public.app_permissions new_permission
  ON new_permission.resource = 'sd_attendance_bi'
 AND new_permission.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_sd_attendance_bi(
  p_start_date DATE,
  p_end_date DATE,
  p_user_ids UUID[],
  p_groups TEXT[],
  p_sources TEXT[],
  p_natures TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'sd_attendance_bi', 'view') THEN
    RAISE EXCEPTION 'Sem permissao para visualizar o BI de atendimento do SD.' USING ERRCODE = '42501';
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
  interval_totals AS (
    SELECT
      time_interval.entry_id,
      coalesce(sum(
        CASE
          WHEN time_interval.ended_at IS NOT NULL
           AND time_interval.ended_at > time_interval.started_at
            THEN extract(epoch FROM (time_interval.ended_at - time_interval.started_at)) / 60
          ELSE 0
        END
      ), 0)::integer AS total_minutes,
      min(time_interval.started_at) AS first_started_at
    FROM public.sd_time_intervals time_interval
    GROUP BY time_interval.entry_id
  ),
  base AS MATERIALIZED (
    SELECT
      entry.id,
      entry.user_id,
      coalesce(profile.full_name, profile.email, 'Usuário')::text AS user_name,
      profile.email::text AS user_email,
      profile.team::text AS user_team,
      coalesce(
        nullif(btrim(entry.source_metadata->>'ellevo_group'), ''),
        analyst_group.attendance_group,
        'Sem grupo'
      )::text AS attendance_group,
      entry.work_date,
      entry.title,
      entry.source,
      entry.source_metadata,
      interval_total.total_minutes,
      interval_total.first_started_at,
      nullif(btrim(entry.source_metadata->>'ticket_number'), '') AS ticket_number,
      coalesce(
        nullif(btrim(ticket_general.natureza), ''),
        nullif(btrim(ticket_sales.natureza), ''),
        CASE WHEN entry.source = 'manual' THEN 'Lançamento interno HUB' ELSE 'Não classificado' END
      )::text AS nature,
      coalesce(
        nullif(btrim(entry.source_metadata->>'activity'), ''),
        CASE WHEN entry.source = 'manual' THEN 'Atividade interna HUB' ELSE 'Não informado' END
      )::text AS activity,
      coalesce(
        nullif(btrim(ticket_general.software), ''),
        nullif(btrim(ticket_sales.software), ''),
        nullif(btrim(ticket_general.produto), ''),
        nullif(btrim(ticket_sales.produto), ''),
        CASE WHEN entry.source = 'manual' THEN 'Interno HUB' ELSE 'Não informado' END
      )::text AS product,
      coalesce(
        nullif(btrim(ticket_general.nome_cliente), ''),
        nullif(btrim(ticket_sales.nome_cliente), ''),
        'Cliente não identificado'
      )::text AS client_name,
      coalesce(
        nullif(btrim(ticket_general.titulo), ''),
        nullif(btrim(ticket_sales.titulo), ''),
        entry.title
      )::text AS ticket_title,
      (
        nullif(btrim(ticket_general.natureza), '') IS NOT NULL
        OR nullif(btrim(ticket_sales.natureza), '') IS NOT NULL
      ) AS classified,
      lower(coalesce(entry.source_metadata->>'overtime', 'false')) IN ('true', '1', 'sim', 'yes') AS overtime,
      lower(coalesce(entry.source_metadata->>'rework', '')) NOT IN ('', 'false', '0', 'nao', 'não', 'n') AS rework,
      lower(coalesce(entry.source_metadata->>'considers_contract', 'false')) IN ('true', '1', 'sim', 'yes') AS considers_contract
    FROM public.sd_time_entries entry
    JOIN public.profiles profile ON profile.id = entry.user_id
    LEFT JOIN analyst_groups analyst_group ON analyst_group.user_id = entry.user_id
    LEFT JOIN interval_totals interval_total ON interval_total.entry_id = entry.id
    LEFT JOIN public.chamados_0800 ticket_general
      ON ticket_general.numero_chamado = entry.source_metadata->>'ticket_number'
    LEFT JOIN public.chamados_processo_venda ticket_sales
      ON ticket_sales.numero_chamado = entry.source_metadata->>'ticket_number'
    WHERE entry.work_date BETWEEN p_start_date AND p_end_date
  ),
  filtered AS MATERIALIZED (
    SELECT *
    FROM base entry
    WHERE (coalesce(cardinality(p_user_ids), 0) = 0 OR entry.user_id = ANY(p_user_ids))
      AND (coalesce(cardinality(p_groups), 0) = 0 OR entry.attendance_group = ANY(p_groups))
      AND (coalesce(cardinality(p_sources), 0) = 0 OR entry.source = ANY(p_sources))
      AND (coalesce(cardinality(p_natures), 0) = 0 OR entry.nature = ANY(p_natures))
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date),
    'metrics', jsonb_build_object(
      'total_minutes', coalesce((SELECT sum(item.total_minutes)::integer FROM filtered item), 0),
      'manual_minutes', coalesce((SELECT sum(item.total_minutes)::integer FROM filtered item WHERE item.source = 'manual'), 0),
      'imported_minutes', coalesce((SELECT sum(item.total_minutes)::integer FROM filtered item WHERE item.source = 'ellevo_0800'), 0),
      'ticket_count', (SELECT count(DISTINCT item.ticket_number)::integer FROM filtered item WHERE item.ticket_number IS NOT NULL),
      'classified_ticket_count', (SELECT count(DISTINCT item.ticket_number)::integer FROM filtered item WHERE item.ticket_number IS NOT NULL AND item.classified),
      'analyst_count', (SELECT count(DISTINCT item.user_id)::integer FROM filtered item),
      'entry_count', (SELECT count(*)::integer FROM filtered item),
      'average_entry_minutes', coalesce((SELECT round(avg(item.total_minutes))::integer FROM filtered item), 0),
      'average_ticket_minutes', coalesce((
        SELECT round(sum(item.total_minutes)::numeric / nullif(count(DISTINCT item.ticket_number), 0))::integer
        FROM filtered item
        WHERE item.ticket_number IS NOT NULL
      ), 0),
      'overtime_minutes', coalesce((SELECT sum(item.total_minutes)::integer FROM filtered item WHERE item.overtime), 0),
      'rework_minutes', coalesce((SELECT sum(item.total_minutes)::integer FROM filtered item WHERE item.rework), 0),
      'contract_minutes', coalesce((SELECT sum(item.total_minutes)::integer FROM filtered item WHERE item.considers_contract), 0)
    ),
    'daily', coalesce((
      SELECT jsonb_agg(to_jsonb(day_total) ORDER BY day_total.work_date)
      FROM (
        SELECT
          item.work_date,
          sum(item.total_minutes)::integer AS total_minutes,
          coalesce(sum(item.total_minutes) FILTER (WHERE item.source = 'manual'), 0)::integer AS manual_minutes,
          coalesce(sum(item.total_minutes) FILTER (WHERE item.source = 'ellevo_0800'), 0)::integer AS imported_minutes,
          count(DISTINCT item.ticket_number)::integer AS ticket_count
        FROM filtered item
        GROUP BY item.work_date
      ) day_total
    ), '[]'::jsonb),
    'by_group', coalesce((
      SELECT jsonb_agg(to_jsonb(group_total) ORDER BY group_total.total_minutes DESC, group_total.group_name)
      FROM (
        SELECT
          item.attendance_group AS group_name,
          sum(item.total_minutes)::integer AS total_minutes,
          coalesce(sum(item.total_minutes) FILTER (WHERE item.source = 'manual'), 0)::integer AS manual_minutes,
          coalesce(sum(item.total_minutes) FILTER (WHERE item.source = 'ellevo_0800'), 0)::integer AS imported_minutes,
          count(DISTINCT item.user_id)::integer AS analyst_count,
          count(DISTINCT item.ticket_number)::integer AS ticket_count
        FROM filtered item
        GROUP BY item.attendance_group
      ) group_total
    ), '[]'::jsonb),
    'by_analyst', coalesce((
      SELECT jsonb_agg(to_jsonb(analyst_total) ORDER BY analyst_total.total_minutes DESC, analyst_total.user_name)
      FROM (
        SELECT
          item.user_id,
          item.user_name,
          item.user_email,
          item.attendance_group,
          sum(item.total_minutes)::integer AS total_minutes,
          coalesce(sum(item.total_minutes) FILTER (WHERE item.source = 'manual'), 0)::integer AS manual_minutes,
          coalesce(sum(item.total_minutes) FILTER (WHERE item.source = 'ellevo_0800'), 0)::integer AS imported_minutes,
          count(DISTINCT item.ticket_number)::integer AS ticket_count,
          count(*)::integer AS entry_count,
          round(avg(item.total_minutes))::integer AS average_entry_minutes,
          count(DISTINCT item.work_date)::integer AS worked_days
        FROM filtered item
        GROUP BY item.user_id, item.user_name, item.user_email, item.attendance_group
      ) analyst_total
    ), '[]'::jsonb),
    'by_nature', coalesce((
      SELECT jsonb_agg(to_jsonb(nature_total) ORDER BY nature_total.total_minutes DESC, nature_total.nature)
      FROM (
        SELECT
          item.nature,
          sum(item.total_minutes)::integer AS total_minutes,
          count(DISTINCT item.ticket_number)::integer AS ticket_count,
          count(*)::integer AS entry_count
        FROM filtered item
        GROUP BY item.nature
      ) nature_total
    ), '[]'::jsonb),
    'by_activity', coalesce((
      SELECT jsonb_agg(to_jsonb(activity_total) ORDER BY activity_total.total_minutes DESC, activity_total.activity)
      FROM (
        SELECT
          item.activity,
          sum(item.total_minutes)::integer AS total_minutes,
          count(DISTINCT item.ticket_number)::integer AS ticket_count,
          count(*)::integer AS entry_count
        FROM filtered item
        GROUP BY item.activity
      ) activity_total
    ), '[]'::jsonb),
    'by_product', coalesce((
      SELECT jsonb_agg(to_jsonb(product_total) ORDER BY product_total.total_minutes DESC, product_total.product)
      FROM (
        SELECT
          item.product,
          sum(item.total_minutes)::integer AS total_minutes,
          count(DISTINCT item.ticket_number)::integer AS ticket_count,
          count(*)::integer AS entry_count
        FROM filtered item
        GROUP BY item.product
      ) product_total
    ), '[]'::jsonb),
    'by_hour', coalesce((
      SELECT jsonb_agg(to_jsonb(hour_total) ORDER BY hour_total.hour_of_day)
      FROM (
        SELECT
          extract(hour FROM item.first_started_at)::integer AS hour_of_day,
          sum(item.total_minutes)::integer AS total_minutes,
          count(*)::integer AS entry_count
        FROM filtered item
        WHERE item.first_started_at IS NOT NULL
        GROUP BY extract(hour FROM item.first_started_at)::integer
      ) hour_total
    ), '[]'::jsonb),
    'top_tickets', coalesce((
      SELECT jsonb_agg(to_jsonb(ticket_total) ORDER BY ticket_total.total_minutes DESC, ticket_total.ticket_number)
      FROM (
        SELECT
          item.ticket_number,
          max(item.ticket_title) AS ticket_title,
          max(item.client_name) AS client_name,
          max(item.nature) AS nature,
          max(item.product) AS product,
          sum(item.total_minutes)::integer AS total_minutes,
          count(DISTINCT item.user_id)::integer AS analyst_count,
          count(*)::integer AS entry_count
        FROM filtered item
        WHERE item.ticket_number IS NOT NULL
        GROUP BY item.ticket_number
        ORDER BY sum(item.total_minutes) DESC
        LIMIT 15
      ) ticket_total
    ), '[]'::jsonb),
    'filters', jsonb_build_object(
      'analysts', coalesce((
        SELECT jsonb_agg(to_jsonb(analyst) ORDER BY analyst.user_name)
        FROM (
          SELECT DISTINCT item.user_id, item.user_name, item.user_email, item.attendance_group
          FROM base item
        ) analyst
      ), '[]'::jsonb),
      'groups', coalesce((
        SELECT jsonb_agg(group_name ORDER BY group_name)
        FROM (SELECT DISTINCT item.attendance_group AS group_name FROM base item) group_option
      ), '[]'::jsonb),
      'natures', coalesce((
        SELECT jsonb_agg(nature ORDER BY nature)
        FROM (SELECT DISTINCT item.nature FROM base item) nature_option
      ), '[]'::jsonb),
      'products', coalesce((
        SELECT jsonb_agg(product ORDER BY product)
        FROM (SELECT DISTINCT item.product FROM base item) product_option
      ), '[]'::jsonb)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sd_attendance_bi(DATE, DATE, UUID[], TEXT[], TEXT[], TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sd_attendance_bi(DATE, DATE, UUID[], TEXT[], TEXT[], TEXT[]) TO authenticated;

-- Registro de horas do SD: lançamentos pessoais e consulta consolidada para gestores.

CREATE TABLE IF NOT EXISTS public.sd_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sd_time_entries_title_length CHECK (char_length(btrim(title)) BETWEEN 2 AND 120),
  CONSTRAINT sd_time_entries_description_length CHECK (description IS NULL OR char_length(description) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_sd_time_entries_user_date
  ON public.sd_time_entries (user_id, work_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sd_time_entries_date
  ON public.sd_time_entries (work_date DESC);

CREATE TABLE IF NOT EXISTS public.sd_time_intervals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.sd_time_entries(id) ON DELETE CASCADE,
  started_at TIME NOT NULL,
  ended_at TIME,
  position SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sd_time_intervals_valid_range CHECK (ended_at IS NULL OR ended_at > started_at),
  CONSTRAINT sd_time_intervals_position CHECK (position BETWEEN 0 AND 19),
  UNIQUE (entry_id, position)
);

DROP TRIGGER IF EXISTS set_sd_time_entries_updated_at ON public.sd_time_entries;
CREATE TRIGGER set_sd_time_entries_updated_at
  BEFORE UPDATE ON public.sd_time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sd_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sd_time_intervals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own or managed SD time entries" ON public.sd_time_entries;
CREATE POLICY "Read own or managed SD time entries"
  ON public.sd_time_entries FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() AND public.has_permission(auth.uid(), 'sd_time_entries', 'view'))
    OR public.has_permission(auth.uid(), 'sd_time_management', 'view')
  );

DROP POLICY IF EXISTS "Create own SD time entries" ON public.sd_time_entries;
CREATE POLICY "Create own SD time entries"
  ON public.sd_time_entries FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_permission(auth.uid(), 'sd_time_entries', 'create')
  );

DROP POLICY IF EXISTS "Update own SD time entries" ON public.sd_time_entries;
CREATE POLICY "Update own SD time entries"
  ON public.sd_time_entries FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND public.has_permission(auth.uid(), 'sd_time_entries', 'edit')
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_permission(auth.uid(), 'sd_time_entries', 'edit')
  );

DROP POLICY IF EXISTS "Delete own SD time entries" ON public.sd_time_entries;
CREATE POLICY "Delete own SD time entries"
  ON public.sd_time_entries FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND public.has_permission(auth.uid(), 'sd_time_entries', 'delete')
  );

DROP POLICY IF EXISTS "Read own or managed SD time intervals" ON public.sd_time_intervals;
CREATE POLICY "Read own or managed SD time intervals"
  ON public.sd_time_intervals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sd_time_entries entry
      WHERE entry.id = entry_id
        AND (
          (entry.user_id = auth.uid() AND public.has_permission(auth.uid(), 'sd_time_entries', 'view'))
          OR public.has_permission(auth.uid(), 'sd_time_management', 'view')
        )
    )
  );

DROP POLICY IF EXISTS "Create own SD time intervals" ON public.sd_time_intervals;
CREATE POLICY "Create own SD time intervals"
  ON public.sd_time_intervals FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sd_time_entries entry
      WHERE entry.id = entry_id
        AND entry.user_id = auth.uid()
        AND public.has_permission(auth.uid(), 'sd_time_entries', 'create')
    )
  );

DROP POLICY IF EXISTS "Update own SD time intervals" ON public.sd_time_intervals;
CREATE POLICY "Update own SD time intervals"
  ON public.sd_time_intervals FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sd_time_entries entry
      WHERE entry.id = entry_id
        AND entry.user_id = auth.uid()
        AND public.has_permission(auth.uid(), 'sd_time_entries', 'edit')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sd_time_entries entry
      WHERE entry.id = entry_id
        AND entry.user_id = auth.uid()
        AND public.has_permission(auth.uid(), 'sd_time_entries', 'edit')
    )
  );

DROP POLICY IF EXISTS "Delete own SD time intervals" ON public.sd_time_intervals;
CREATE POLICY "Delete own SD time intervals"
  ON public.sd_time_intervals FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sd_time_entries entry
      WHERE entry.id = entry_id
        AND entry.user_id = auth.uid()
        AND public.has_permission(auth.uid(), 'sd_time_entries', 'delete')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sd_time_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sd_time_intervals TO authenticated;

CREATE OR REPLACE FUNCTION public.save_sd_time_entry(
  p_work_date DATE,
  p_title TEXT,
  p_description TEXT,
  p_intervals JSONB,
  p_entry_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_owner_id UUID;
  v_action TEXT := CASE WHEN p_entry_id IS NULL THEN 'create' ELSE 'edit' END;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_permission(auth.uid(), 'sd_time_entries', v_action) THEN
    RAISE EXCEPTION 'Sem permissão para salvar lançamentos de horas.' USING ERRCODE = '42501';
  END IF;

  IF char_length(btrim(coalesce(p_title, ''))) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'Informe um título entre 2 e 120 caracteres.';
  END IF;

  IF p_intervals IS NULL OR jsonb_typeof(p_intervals) <> 'array'
     OR jsonb_array_length(p_intervals) < 1 OR jsonb_array_length(p_intervals) > 20 THEN
    RAISE EXCEPTION 'Informe entre 1 e 20 entradas de horário.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_intervals) interval_data
    WHERE coalesce(interval_data->>'start', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       OR (
         nullif(interval_data->>'end', '') IS NOT NULL
         AND (
           (interval_data->>'end') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
           OR (interval_data->>'end')::time <= (interval_data->>'start')::time
         )
       )
  ) THEN
    RAISE EXCEPTION 'Há um intervalo de horário inválido.';
  END IF;

  IF p_entry_id IS NULL THEN
    INSERT INTO public.sd_time_entries (user_id, work_date, title, description)
    VALUES (auth.uid(), p_work_date, btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''))
    RETURNING id INTO v_entry_id;
  ELSE
    SELECT user_id INTO v_owner_id
    FROM public.sd_time_entries
    WHERE id = p_entry_id
    FOR UPDATE;

    IF v_owner_id IS NULL OR v_owner_id <> auth.uid() THEN
      RAISE EXCEPTION 'Lançamento não encontrado ou pertencente a outro usuário.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.sd_time_entries
    SET work_date = p_work_date,
        title = btrim(p_title),
        description = nullif(btrim(coalesce(p_description, '')), '')
    WHERE id = p_entry_id;

    DELETE FROM public.sd_time_intervals WHERE entry_id = p_entry_id;
    v_entry_id := p_entry_id;
  END IF;

  INSERT INTO public.sd_time_intervals (entry_id, started_at, ended_at, position)
  SELECT
    v_entry_id,
    (interval_data->>'start')::time,
    nullif(interval_data->>'end', '')::time,
    (ordinality - 1)::smallint
  FROM jsonb_array_elements(p_intervals) WITH ORDINALITY AS data(interval_data, ordinality);

  RETURN v_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_sd_time_entry(p_entry_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'sd_time_entries', 'delete') THEN
    RAISE EXCEPTION 'Sem permissão para excluir lançamentos de horas.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.sd_time_entries
  WHERE id = p_entry_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento não encontrado ou pertencente a outro usuário.' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sd_time_management(
  p_start_date DATE,
  p_end_date DATE,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_team TEXT,
  work_date DATE,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  intervals JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'sd_time_management', 'view') THEN
    RAISE EXCEPTION 'Sem permissão para consultar as horas da equipe.' USING ERRCODE = '42501';
  END IF;

  IF p_end_date < p_start_date OR p_end_date - p_start_date > 366 THEN
    RAISE EXCEPTION 'Período de consulta inválido.';
  END IF;

  RETURN QUERY
  SELECT
    entry.id,
    entry.user_id,
    coalesce(profile.full_name, profile.email, 'Usuário')::text,
    profile.email::text,
    profile.team::text,
    entry.work_date,
    entry.title,
    entry.description,
    entry.created_at,
    entry.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', interval.id,
          'entry_id', interval.entry_id,
          'started_at', to_char(interval.started_at, 'HH24:MI'),
          'ended_at', CASE WHEN interval.ended_at IS NULL THEN NULL ELSE to_char(interval.ended_at, 'HH24:MI') END,
          'position', interval.position
        ) ORDER BY interval.position
      ) FILTER (WHERE interval.id IS NOT NULL),
      '[]'::jsonb
    ) AS intervals
  FROM public.sd_time_entries entry
  JOIN public.profiles profile ON profile.id = entry.user_id
  LEFT JOIN public.sd_time_intervals interval ON interval.entry_id = entry.id
  WHERE entry.work_date BETWEEN p_start_date AND p_end_date
    AND (p_user_id IS NULL OR entry.user_id = p_user_id)
  GROUP BY entry.id, profile.full_name, profile.email, profile.team
  ORDER BY entry.work_date DESC, entry.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.save_sd_time_entry(DATE, TEXT, TEXT, JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_sd_time_entry(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sd_time_management(DATE, DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_sd_time_entry(DATE, TEXT, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_sd_time_entry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sd_time_management(DATE, DATE, UUID) TO authenticated;

INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('sd_time_entries', 'view', 'Visualizar os próprios lançamentos de horas do SD'),
  ('sd_time_entries', 'create', 'Criar lançamentos próprios de horas do SD'),
  ('sd_time_entries', 'edit', 'Editar lançamentos próprios de horas do SD'),
  ('sd_time_entries', 'delete', 'Excluir lançamentos próprios de horas do SD'),
  ('sd_time_management', 'view', 'Consultar os lançamentos de horas de toda a equipe do SD')
ON CONFLICT (resource, action) DO UPDATE
  SET description = EXCLUDED.description;

-- Administradores recebem todas as ações novas.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.app_roles role
CROSS JOIN public.app_permissions permission
WHERE role.name = 'admin'
  AND permission.resource IN ('sd_time_entries', 'sd_time_management')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Quem já possui uma ação equivalente em Soluções recebe a ação pessoal de horas.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT DISTINCT current_permission.role_id, new_permission.id
FROM public.app_role_permissions current_permission
JOIN public.app_permissions current_definition
  ON current_definition.id = current_permission.permission_id
 AND current_definition.resource = 'sd_solutions'
JOIN public.app_permissions new_permission
  ON new_permission.resource = 'sd_time_entries'
 AND new_permission.action = current_definition.action
WHERE current_definition.action IN ('view', 'create', 'edit', 'delete')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- A consulta consolidada nasce apenas para quem já gerencia o módulo SD.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT DISTINCT current_permission.role_id, new_permission.id
FROM public.app_role_permissions current_permission
JOIN public.app_permissions current_definition
  ON current_definition.id = current_permission.permission_id
 AND current_definition.resource = 'sd_solutions'
 AND current_definition.action = 'manage'
JOIN public.app_permissions new_permission
  ON new_permission.resource = 'sd_time_management'
 AND new_permission.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

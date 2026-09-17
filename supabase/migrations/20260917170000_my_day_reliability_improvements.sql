-- Robustez do Meu Dia: conclusão explícita, sincronização da agenda e
-- validação transacional de tarefas recorrentes.

ALTER TABLE public.my_day_board_columns
ADD COLUMN IF NOT EXISTS is_completion BOOLEAN NOT NULL DEFAULT false;

UPDATE public.my_day_board_columns
SET is_completion = true
WHERE lower(title) ~ '(conclu|finaliz|feito|done)';

CREATE OR REPLACE FUNCTION public.create_my_day_board(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_color TEXT DEFAULT '#e11d48'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_board_id UUID;
  next_position DOUBLE PRECISION;
  should_be_default BOOLEAN;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'work_board', 'create') THEN
    RAISE EXCEPTION 'Sem permissao para criar quadros pessoais';
  END IF;

  IF char_length(btrim(p_name)) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Nome do quadro invalido';
  END IF;

  SELECT COALESCE(MAX(position), 0) + 1024,
         NOT EXISTS (
           SELECT 1 FROM public.my_day_boards WHERE user_id = auth.uid()
         )
  INTO next_position, should_be_default
  FROM public.my_day_boards
  WHERE user_id = auth.uid();

  INSERT INTO public.my_day_boards (
    user_id, name, description, color, is_default, position
  )
  VALUES (
    auth.uid(), btrim(p_name), NULLIF(btrim(p_description), ''), p_color,
    should_be_default, next_position
  )
  RETURNING id INTO new_board_id;

  INSERT INTO public.my_day_board_columns (
    board_id, user_id, title, color, is_completion, position
  )
  VALUES
    (new_board_id, auth.uid(), 'Ideias', '#64748b', false, 1024),
    (new_board_id, auth.uid(), 'Em andamento', '#f59e0b', false, 2048),
    (new_board_id, auth.uid(), 'Concluido', '#10b981', true, 3072);

  RETURN new_board_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_my_day_board_column(
  p_column_id UUID,
  p_title TEXT,
  p_color TEXT,
  p_is_completion BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'work_board', 'edit') THEN
    RAISE EXCEPTION 'Sem permissao para editar colunas pessoais';
  END IF;

  IF char_length(btrim(p_title)) NOT BETWEEN 1 AND 60
    OR p_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Dados da coluna invalidos';
  END IF;

  UPDATE public.my_day_board_columns
  SET title = btrim(p_title),
      color = p_color,
      is_completion = p_is_completion
  WHERE id = p_column_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coluna nao encontrada';
  END IF;

  UPDATE public.my_day_board_cards
  SET completed_at = CASE
    WHEN p_is_completion THEN COALESCE(completed_at, now())
    ELSE NULL
  END
  WHERE column_id = p_column_id
    AND user_id = auth.uid()
    AND archived_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_my_day_board_cards(p_updates JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  item JSONB;
  updated_count INTEGER := 0;
  row_count INTEGER;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'work_board', 'edit') THEN
    RAISE EXCEPTION 'Sem permissao para sincronizar cartoes pessoais';
  END IF;

  IF jsonb_typeof(p_updates) <> 'array' THEN
    RAISE EXCEPTION 'Atualizacoes invalidas';
  END IF;

  IF jsonb_array_length(p_updates) > 500 THEN
    RAISE EXCEPTION 'Limite de atualizacoes excedido';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_updates)
  LOOP
    IF char_length(btrim(item ->> 'title')) NOT BETWEEN 1 AND 160
      OR (item ->> 'priority') NOT IN ('low', 'medium', 'high', 'critical')
      OR NULLIF(item ->> 'due_at', '') IS NULL THEN
      RAISE EXCEPTION 'Dados de sincronizacao invalidos';
    END IF;

    UPDATE public.my_day_board_cards
    SET title = btrim(item ->> 'title'),
        priority = item ->> 'priority',
        due_at = (item ->> 'due_at')::TIMESTAMPTZ
    WHERE id = (item ->> 'id')::UUID
      AND user_id = auth.uid()
      AND archived_at IS NULL
      AND linked_path LIKE '%myDaySource=%';

    GET DIAGNOSTICS row_count = ROW_COUNT;
    updated_count := updated_count + row_count;
  END LOOP;

  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_my_day_board_columns(
  p_board_id UUID,
  p_column_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'work_board', 'edit') THEN
    RAISE EXCEPTION 'Sem permissao para organizar colunas pessoais';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.my_day_boards
    WHERE id = p_board_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Quadro nao encontrado';
  END IF;

  SELECT count(*)
  INTO existing_count
  FROM public.my_day_board_columns
  WHERE board_id = p_board_id
    AND user_id = auth.uid();

  IF COALESCE(array_length(p_column_ids, 1), 0) <> existing_count
    OR EXISTS (
      SELECT requested.column_id
      FROM unnest(p_column_ids) AS requested(column_id)
      GROUP BY requested.column_id
      HAVING count(*) > 1
    )
    OR EXISTS (
      SELECT 1
      FROM unnest(p_column_ids) AS requested(column_id)
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.my_day_board_columns board_column
        WHERE board_column.id = requested.column_id
          AND board_column.board_id = p_board_id
          AND board_column.user_id = auth.uid()
      )
    ) THEN
    RAISE EXCEPTION 'Ordem de colunas invalida';
  END IF;

  UPDATE public.my_day_board_columns board_column
  SET position = ordered.ordinality * 1024
  FROM unnest(p_column_ids) WITH ORDINALITY AS ordered(column_id, ordinality)
  WHERE board_column.id = ordered.column_id
    AND board_column.board_id = p_board_id
    AND board_column.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_my_day_task(p_task_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_task public.my_day_tasks%ROWTYPE;
  next_task_id UUID;
  next_due_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'work_center', 'edit') THEN
    RAISE EXCEPTION 'Sem permissao para concluir tarefas';
  END IF;

  SELECT *
  INTO current_task
  FROM public.my_day_tasks
  WHERE id = p_task_id
    AND user_id = auth.uid()
    AND status = 'pending'
  FOR UPDATE;

  IF current_task.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF current_task.recurrence <> 'none'
    AND NOT public.has_permission(auth.uid(), 'work_center', 'create') THEN
    RAISE EXCEPTION 'Para concluir uma tarefa recorrente, e necessario poder criar tarefas';
  END IF;

  UPDATE public.my_day_tasks
  SET status = 'completed',
      completed_at = now(),
      snoozed_until = NULL
  WHERE id = current_task.id
    AND user_id = auth.uid();

  IF current_task.recurrence = 'none' THEN
    RETURN NULL;
  END IF;

  next_due_at := CASE current_task.recurrence
    WHEN 'daily' THEN current_task.due_at + INTERVAL '1 day'
    WHEN 'weekly' THEN current_task.due_at + INTERVAL '1 week'
    WHEN 'monthly' THEN current_task.due_at + INTERVAL '1 month'
  END;

  WHILE next_due_at <= now() LOOP
    next_due_at := CASE current_task.recurrence
      WHEN 'daily' THEN next_due_at + INTERVAL '1 day'
      WHEN 'weekly' THEN next_due_at + INTERVAL '1 week'
      WHEN 'monthly' THEN next_due_at + INTERVAL '1 month'
    END;
  END LOOP;

  INSERT INTO public.my_day_tasks (
    user_id,
    title,
    description,
    due_at,
    priority,
    linked_path,
    recurrence,
    reminder_minutes,
    recurrence_parent_id
  ) VALUES (
    current_task.user_id,
    current_task.title,
    current_task.description,
    next_due_at,
    current_task.priority,
    current_task.linked_path,
    current_task.recurrence,
    current_task.reminder_minutes,
    COALESCE(current_task.recurrence_parent_id, current_task.id)
  )
  RETURNING id INTO next_task_id;

  RETURN next_task_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_my_day_board(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_my_day_board_column(UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_my_day_board_cards(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reorder_my_day_board_columns(UUID, UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_my_day_task(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_my_day_board(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_day_board_column(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_my_day_board_cards(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_my_day_board_columns(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_my_day_task(UUID) TO authenticated;

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
  'release_improvement',
  'work_center',
  'Meu Dia com fluxos mais confiaveis',
  'O quadro ganhou colunas de conclusao explicitas e sincronizacao dos cartoes vinculados com a agenda. Lembretes no PWA e tarefas recorrentes tambem receberam melhorias de confiabilidade e permissao.',
  '/meu-dia'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'work_center'
    AND title = 'Meu Dia com fluxos mais confiaveis'
    AND action_url = '/meu-dia'
);

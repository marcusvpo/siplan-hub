-- Evolução operacional da Central de Trabalho / Meu Dia.
-- Inclui recorrência segura, lembretes locais, adiamento e a fila unificada
-- de prioridades na composição personalizada do usuário.

ALTER TABLE public.my_day_tasks
ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER,
ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID
  REFERENCES public.my_day_tasks(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'my_day_tasks_recurrence_check'
      AND conrelid = 'public.my_day_tasks'::regclass
  ) THEN
    ALTER TABLE public.my_day_tasks
    ADD CONSTRAINT my_day_tasks_recurrence_check
    CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'my_day_tasks_reminder_minutes_check'
      AND conrelid = 'public.my_day_tasks'::regclass
  ) THEN
    ALTER TABLE public.my_day_tasks
    ADD CONSTRAINT my_day_tasks_reminder_minutes_check
    CHECK (reminder_minutes IS NULL OR reminder_minutes IN (0, 15, 30, 60, 1440));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_my_day_tasks_user_reminders
  ON public.my_day_tasks (user_id, status, due_at, snoozed_until)
  WHERE reminder_minutes IS NOT NULL;

ALTER TABLE public.my_day_preferences
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT false;

UPDATE public.my_day_preferences
SET widget_order = ARRAY['priorities']::TEXT[] || widget_order
WHERE NOT ('priorities' = ANY(widget_order));

UPDATE public.my_day_preferences
SET widget_layout = widget_layout || '{"priorities": "full"}'::JSONB
WHERE NOT (widget_layout ? 'priorities');

ALTER TABLE public.my_day_preferences
ALTER COLUMN widget_order SET DEFAULT ARRAY[
  'priorities', 'agenda', 'insights', 'projects', 'shortcuts', 'conversion', 'copilot'
]::TEXT[],
ALTER COLUMN widget_layout SET DEFAULT '{
  "priorities": "full",
  "agenda": "half",
  "insights": "half",
  "projects": "full",
  "shortcuts": "full",
  "conversion": "full",
  "copilot": "full"
}'::JSONB;

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
  UPDATE public.my_day_tasks
  SET status = 'completed',
      completed_at = now(),
      snoozed_until = NULL
  WHERE id = p_task_id
    AND user_id = auth.uid()
    AND status = 'pending'
  RETURNING * INTO current_task;

  IF current_task.id IS NULL OR current_task.recurrence = 'none' THEN
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

REVOKE ALL ON FUNCTION public.complete_my_day_task(UUID) FROM PUBLIC, anon;
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
  'Meu Dia mais completo e personalizável',
  'A Central de Trabalho ganhou fila unificada de prioridades, agenda com filtros, recorrência, lembretes e adiamento, atualização automática, falhas isoladas por bloco e personalização com modelos, prévia e arrastar e soltar.',
  '/meu-dia'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'work_center'
    AND title = 'Meu Dia mais completo e personalizável'
    AND action_url = '/meu-dia'
);

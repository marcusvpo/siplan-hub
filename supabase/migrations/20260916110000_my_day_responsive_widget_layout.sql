-- Permite que cada usuário organize os widgets do Meu Dia em meia linha
-- ou linha inteira, mantendo empilhamento automático no mobile.

ALTER TABLE public.my_day_preferences
ADD COLUMN IF NOT EXISTS widget_layout JSONB;

UPDATE public.my_day_preferences
SET widget_layout = '{
  "agenda": "half",
  "insights": "half",
  "projects": "full",
  "shortcuts": "full",
  "conversion": "full",
  "copilot": "full"
}'::JSONB
WHERE widget_layout IS NULL;

ALTER TABLE public.my_day_preferences
ALTER COLUMN widget_layout SET DEFAULT '{
  "agenda": "half",
  "insights": "half",
  "projects": "full",
  "shortcuts": "full",
  "conversion": "full",
  "copilot": "full"
}'::JSONB,
ALTER COLUMN widget_layout SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'my_day_preferences_widget_layout_object'
      AND conrelid = 'public.my_day_preferences'::regclass
  ) THEN
    ALTER TABLE public.my_day_preferences
    ADD CONSTRAINT my_day_preferences_widget_layout_object
    CHECK (jsonb_typeof(widget_layout) = 'object');
  END IF;
END
$$;

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
  'Layout responsivo no Meu Dia',
  'Agora é possível escolher meia largura ou largura inteira para cada bloco, reorganizar as linhas e usar a tela sem espaços vazios. No celular, os blocos são empilhados automaticamente.',
  '/meu-dia'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'work_center'
    AND title = 'Layout responsivo no Meu Dia'
    AND action_url = '/meu-dia'
);

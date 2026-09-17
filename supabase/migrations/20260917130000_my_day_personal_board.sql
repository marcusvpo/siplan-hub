-- Meu Quadro: Kanban pessoal integrado ao Meu Dia.

INSERT INTO public.app_permissions (resource, action, description)
VALUES
  ('work_board', 'view', 'Visualizar o quadro pessoal do Meu Dia'),
  ('work_board', 'create', 'Criar quadros, colunas e cartoes pessoais'),
  ('work_board', 'edit', 'Editar e organizar quadros, colunas e cartoes pessoais'),
  ('work_board', 'delete', 'Excluir quadros, colunas e cartoes pessoais')
ON CONFLICT (resource, action) DO UPDATE
SET description = EXCLUDED.description;

-- O administrador recebe todas as acoes da nova tela.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.app_roles role
CROSS JOIN public.app_permissions permission
WHERE role.name = 'admin'
  AND permission.resource = 'work_board'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Perfis que ja usavam o Meu Dia herdam a acao equivalente. O administrador
-- pode restringir o novo recurso deliberadamente depois do deploy.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT existing.role_id, board_permission.id
FROM public.app_role_permissions existing
JOIN public.app_permissions work_center_permission
  ON work_center_permission.id = existing.permission_id
 AND work_center_permission.resource = 'work_center'
JOIN public.app_permissions board_permission
  ON board_permission.resource = 'work_board'
 AND board_permission.action = work_center_permission.action
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE TABLE public.my_day_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 300),
  color TEXT NOT NULL DEFAULT '#e11d48'
    CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_default BOOLEAN NOT NULL DEFAULT false,
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

CREATE UNIQUE INDEX idx_my_day_boards_one_default
  ON public.my_day_boards (user_id)
  WHERE is_default;

CREATE INDEX idx_my_day_boards_user_position
  ON public.my_day_boards (user_id, position);

CREATE TABLE public.my_day_board_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 60),
  color TEXT NOT NULL DEFAULT '#64748b'
    CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, board_id, user_id),
  CONSTRAINT my_day_board_columns_board_owner_fkey
    FOREIGN KEY (board_id, user_id)
    REFERENCES public.my_day_boards(id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_my_day_board_columns_board_position
  ON public.my_day_board_columns (board_id, position);

CREATE TABLE public.my_day_board_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL,
  column_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 4000),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  due_at TIMESTAMPTZ,
  labels TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  checklist JSONB NOT NULL DEFAULT '[]'::JSONB
    CHECK (jsonb_typeof(checklist) = 'array'),
  linked_path TEXT CHECK (linked_path IS NULL OR linked_path LIKE '/%'),
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT my_day_board_cards_board_owner_fkey
    FOREIGN KEY (board_id, user_id)
    REFERENCES public.my_day_boards(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT my_day_board_cards_column_owner_fkey
    FOREIGN KEY (column_id, board_id, user_id)
    REFERENCES public.my_day_board_columns(id, board_id, user_id)
    ON DELETE RESTRICT
);

CREATE INDEX idx_my_day_board_cards_column_position
  ON public.my_day_board_cards (column_id, position)
  WHERE archived_at IS NULL;

CREATE INDEX idx_my_day_board_cards_user_due
  ON public.my_day_board_cards (user_id, due_at)
  WHERE archived_at IS NULL AND due_at IS NOT NULL;

CREATE TRIGGER update_my_day_boards_updated_at
BEFORE UPDATE ON public.my_day_boards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_my_day_board_columns_updated_at
BEFORE UPDATE ON public.my_day_board_columns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_my_day_board_cards_updated_at
BEFORE UPDATE ON public.my_day_board_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.my_day_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.my_day_board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.my_day_board_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own My Day boards"
ON public.my_day_boards FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'view')
);

CREATE POLICY "Users can create their own My Day boards"
ON public.my_day_boards FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'create')
);

CREATE POLICY "Users can edit their own My Day boards"
ON public.my_day_boards FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'edit')
)
WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'edit')
);

CREATE POLICY "Users can delete their own My Day boards"
ON public.my_day_boards FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'delete')
);

CREATE POLICY "Users can view their own My Day board columns"
ON public.my_day_board_columns FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'view')
);

CREATE POLICY "Users can create their own My Day board columns"
ON public.my_day_board_columns FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'create')
);

CREATE POLICY "Users can edit their own My Day board columns"
ON public.my_day_board_columns FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'edit')
)
WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'edit')
);

CREATE POLICY "Users can delete their own My Day board columns"
ON public.my_day_board_columns FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'delete')
);

CREATE POLICY "Users can view their own My Day board cards"
ON public.my_day_board_cards FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'view')
);

CREATE POLICY "Users can create their own My Day board cards"
ON public.my_day_board_cards FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'create')
);

CREATE POLICY "Users can edit their own My Day board cards"
ON public.my_day_board_cards FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'edit')
)
WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'edit')
);

CREATE POLICY "Users can delete their own My Day board cards"
ON public.my_day_board_cards FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'work_board', 'delete')
);

REVOKE ALL ON public.my_day_boards FROM anon;
REVOKE ALL ON public.my_day_board_columns FROM anon;
REVOKE ALL ON public.my_day_board_cards FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_day_boards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_day_board_columns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_day_board_cards TO authenticated;

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
    board_id, user_id, title, color, position
  )
  VALUES
    (new_board_id, auth.uid(), 'Ideias', '#64748b', 1024),
    (new_board_id, auth.uid(), 'Em andamento', '#f59e0b', 2048),
    (new_board_id, auth.uid(), 'Concluido', '#10b981', 3072);

  RETURN new_board_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_default_my_day_board(p_board_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'work_board', 'edit') THEN
    RAISE EXCEPTION 'Sem permissao para editar quadros pessoais';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.my_day_boards
    WHERE id = p_board_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Quadro nao encontrado';
  END IF;

  UPDATE public.my_day_boards
  SET is_default = false
  WHERE user_id = auth.uid() AND is_default;

  UPDATE public.my_day_boards
  SET is_default = true
  WHERE id = p_board_id AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.create_my_day_board(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_default_my_day_board(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_my_day_board(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_default_my_day_board(UUID) TO authenticated;

UPDATE public.my_day_preferences
SET widget_order = array_append(widget_order, 'board')
WHERE NOT ('board' = ANY(widget_order));

UPDATE public.my_day_preferences
SET widget_layout = COALESCE(widget_layout, '{}'::JSONB) || '{"board": "full"}'::JSONB
WHERE NOT (COALESCE(widget_layout, '{}'::JSONB) ? 'board');

ALTER TABLE public.my_day_preferences
ALTER COLUMN widget_order SET DEFAULT ARRAY[
  'priorities', 'agenda', 'board', 'insights', 'projects', 'shortcuts', 'conversion', 'copilot'
]::TEXT[];

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
  'release_screen',
  'work_board',
  'Novo Meu Quadro pessoal',
  'Organize notas e atividades em quadros Kanban privados, personalize colunas, arraste cartoes e acompanhe prazos diretamente na agenda do Meu Dia.',
  '/meu-dia/quadro'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_screen'
    AND permission_resource = 'work_board'
    AND title = 'Novo Meu Quadro pessoal'
    AND action_url = '/meu-dia/quadro'
);

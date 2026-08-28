-- Lets assistant managers edit or remove identified chat users while preserving
-- their conversation history. Deleting a visitor uses the existing FK's
-- ON DELETE SET NULL behavior, so prior messages become unidentified.

CREATE OR REPLACE FUNCTION public.manage_pos_ai_chat_visitor(
  p_visitor_id UUID,
  p_name TEXT DEFAULT NULL,
  p_sector TEXT DEFAULT NULL,
  p_delete BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor public.pos_ai_chat_visitors%ROWTYPE;
  v_name TEXT;
  v_sector TEXT;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'pos_ai_logs', 'manage') THEN
    RAISE EXCEPTION 'Sem permissao para gerenciar usuarios do assistente.'
      USING ERRCODE = '42501';
  END IF;

  SELECT visitor.*
  INTO v_visitor
  FROM public.pos_ai_chat_visitors visitor
  WHERE visitor.id = p_visitor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario nao encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(p_delete, false) THEN
    DELETE FROM public.pos_ai_chat_visitors visitor
    WHERE visitor.id = p_visitor_id;

    RETURN jsonb_build_object(
      'success', true,
      'deleted', true,
      'project_id', v_visitor.project_id
    );
  END IF;

  v_name := btrim(COALESCE(p_name, ''));
  v_sector := btrim(COALESCE(p_sector, ''));

  IF char_length(v_name) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION 'O nome deve ter entre 2 e 80 caracteres.'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(v_sector) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION 'O setor deve ter entre 2 e 80 caracteres.'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pos_ai_chat_visitors duplicate
    WHERE duplicate.project_id = v_visitor.project_id
      AND duplicate.id <> p_visitor_id
      AND lower(btrim(duplicate.name)) = lower(v_name)
      AND lower(btrim(duplicate.sector)) = lower(v_sector)
  ) THEN
    RAISE EXCEPTION 'Ja existe um usuario com este nome e setor no cartorio.'
      USING ERRCODE = '23505';
  END IF;

  UPDATE public.pos_ai_chat_visitors visitor
  SET name = v_name,
      sector = v_sector
  WHERE visitor.id = p_visitor_id
  RETURNING visitor.* INTO v_visitor;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', false,
    'project_id', v_visitor.project_id,
    'visitor', jsonb_build_object(
      'id', v_visitor.id,
      'project_id', v_visitor.project_id,
      'name', v_visitor.name,
      'sector', v_visitor.sector,
      'created_at', v_visitor.created_at,
      'last_seen_at', v_visitor.last_seen_at
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manage_pos_ai_chat_visitor(UUID, TEXT, TEXT, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_pos_ai_chat_visitor(UUID, TEXT, TEXT, BOOLEAN)
  TO authenticated;

-- Replace the original broad FOR ALL policy. Public chat mutations continue
-- through SECURITY DEFINER RPCs, while direct edit/delete is manager-only.
DROP POLICY IF EXISTS "Authenticated users can manage pos chat visitors"
  ON public.pos_ai_chat_visitors;

CREATE POLICY "Authenticated users can read pos chat visitors"
  ON public.pos_ai_chat_visitors
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert pos chat visitors"
  ON public.pos_ai_chat_visitors
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Assistant managers can update pos chat visitors"
  ON public.pos_ai_chat_visitors
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'pos_ai_logs', 'manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'pos_ai_logs', 'manage'));

CREATE POLICY "Assistant managers can delete pos chat visitors"
  ON public.pos_ai_chat_visitors
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'pos_ai_logs', 'manage'));

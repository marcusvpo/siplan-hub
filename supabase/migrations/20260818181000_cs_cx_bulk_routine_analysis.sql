-- Permite analisar todos os itens vinculados a um cartorio em uma unica operacao.

CREATE OR REPLACE FUNCTION public.cs_cx_set_routine_items_bulk(
  p_registry_office_id UUID,
  p_active BOOLEAN,
  p_analysis_notes TEXT DEFAULT NULL,
  p_analyzed_at TIMESTAMPTZ DEFAULT now()
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  changed_count INTEGER := 0;
  analysis_time TIMESTAMPTZ := COALESCE(p_analyzed_at, now());
  normalized_notes TEXT := NULLIF(trim(p_analysis_notes), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;
  IF NOT public.has_permission(auth.uid(), 'cs_cx_rotinas', 'edit') THEN
    RAISE EXCEPTION 'Sem permissao para analisar rotinas';
  END IF;
  IF p_registry_office_id IS NULL THEN
    RAISE EXCEPTION 'Informe o cartorio';
  END IF;

  WITH target_items AS MATERIALIZED (
    SELECT item.id,
           item.office_routine_id,
           item.model_item_id,
           item.active AS previous_status
    FROM public.cs_cx_office_routine_items item
    JOIN public.cs_cx_office_routines routine
      ON routine.id = item.office_routine_id
    WHERE routine.registry_office_id = p_registry_office_id
      AND routine.source_present
      AND item.source_present
    FOR UPDATE OF item
  ), updated_items AS (
    UPDATE public.cs_cx_office_routine_items item
    SET active = p_active,
        analysis_notes = normalized_notes,
        configured_by = auth.uid(),
        configured_at = now(),
        analyzed_at = analysis_time
    FROM target_items target
    WHERE item.id = target.id
    RETURNING item.id
  ), history_rows AS (
    INSERT INTO public.cs_cx_routine_history (
      office_routine_id, model_item_id, action, previous_status, new_status,
      notes, actor_profile_id, occurred_at, origin, source_present
    )
    SELECT target.office_routine_id,
           target.model_item_id,
           CASE WHEN p_active IS TRUE THEN 'ATIVADO'
                WHEN p_active IS FALSE THEN 'DESATIVADO'
                ELSE 'ANALISADO' END,
           target.previous_status,
           p_active,
           normalized_notes,
           auth.uid(),
           analysis_time,
           'hub',
           true
    FROM target_items target
    JOIN updated_items updated ON updated.id = target.id
    RETURNING id
  )
  SELECT count(*)::INTEGER INTO changed_count
  FROM history_rows;

  RETURN changed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_set_routine_items_bulk(
  UUID, BOOLEAN, TEXT, TIMESTAMPTZ
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_cx_set_routine_items_bulk(
  UUID, BOOLEAN, TEXT, TIMESTAMPTZ
) TO authenticated;

COMMENT ON FUNCTION public.cs_cx_set_routine_items_bulk(
  UUID, BOOLEAN, TEXT, TIMESTAMPTZ
) IS 'Atualiza e registra no historico todos os itens de rotina de um cartorio.';

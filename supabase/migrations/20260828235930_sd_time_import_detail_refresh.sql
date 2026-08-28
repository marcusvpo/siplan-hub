-- Atualiza os detalhes de lançamentos ja importados sem duplicar seus intervalos.

CREATE OR REPLACE FUNCTION public.refresh_sd_time_import_details(p_items JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  IF p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) > 10000 THEN
    RAISE EXCEPTION 'Conteudo da atualizacao dos lancamentos importados invalido.';
  END IF;

  WITH import_items AS (
    SELECT value AS item
    FROM jsonb_array_elements(p_items)
    WHERE coalesce(value->>'external_id', '') <> ''
      AND coalesce(value->>'title', '') <> ''
  )
  UPDATE public.sd_time_entries entry
  SET title = left(btrim(import_item.item->>'title'), 120),
      description = nullif(
        left(btrim(coalesce(import_item.item->>'description', '')), 20000),
        ''
      ),
      source_metadata = coalesce(import_item.item->'metadata', '{}'::jsonb),
      imported_at = now()
  FROM import_items import_item
  WHERE entry.source = 'ellevo_0800'
    AND entry.source_external_id = import_item.item->>'external_id';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_sd_time_import_details(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_sd_time_import_details(JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_sd_time_import_details(JSONB) TO service_role;

-- Administração transacional de modelos, itens e catálogos de rotinas CS/CX.

CREATE POLICY cs_cx_routine_categories_admin_read ON public.cs_cx_routine_categories
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'view'));
CREATE POLICY cs_cx_routine_types_admin_read ON public.cs_cx_routine_types
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'view'));
CREATE POLICY cs_cx_routine_models_admin_read ON public.cs_cx_routine_models
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'view'));
CREATE POLICY cs_cx_routine_model_products_admin_read ON public.cs_cx_routine_model_products
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'view'));
CREATE POLICY cs_cx_routine_model_items_admin_read ON public.cs_cx_routine_model_items
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'view'));
CREATE POLICY cs_cx_products_admin_read ON public.cs_cx_products
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'view'));
CREATE POLICY cs_cx_office_routines_admin_read ON public.cs_cx_office_routines
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'));
CREATE POLICY cs_cx_office_routine_items_admin_manage ON public.cs_cx_office_routine_items
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'));
CREATE POLICY cs_cx_routine_history_admin_create ON public.cs_cx_routine_history
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'));

CREATE OR REPLACE FUNCTION public.cs_cx_save_routine_model(
  p_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_active BOOLEAN,
  p_product_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  model_id UUID;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'manage') THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar modelos de rotina';
  END IF;
  IF NULLIF(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o nome do modelo';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.cs_cx_routine_models (
      name, description, active, created_by, origin, source_present
    ) VALUES (
      trim(p_name), NULLIF(trim(p_description), ''), COALESCE(p_active, true),
      auth.uid(), 'hub', true
    ) RETURNING id INTO model_id;
  ELSE
    UPDATE public.cs_cx_routine_models
    SET name = trim(p_name),
        description = NULLIF(trim(p_description), ''),
        active = COALESCE(p_active, true),
        source_present = true
    WHERE id = p_id
    RETURNING id INTO model_id;

    IF model_id IS NULL THEN
      RAISE EXCEPTION 'Modelo de rotina não encontrado';
    END IF;
  END IF;

  DELETE FROM public.cs_cx_routine_model_products
  WHERE routine_model_id = model_id
    AND NOT (product_id = ANY(COALESCE(p_product_ids, ARRAY[]::UUID[])));

  INSERT INTO public.cs_cx_routine_model_products (
    routine_model_id, product_id, origin, source_present
  )
  SELECT model_id, product_id, 'hub', true
  FROM unnest(COALESCE(p_product_ids, ARRAY[]::UUID[])) AS product_id
  ON CONFLICT (routine_model_id, product_id)
  DO UPDATE SET source_present = true, last_synced_at = now();

  RETURN model_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_delete_routine_model(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  application_count INTEGER;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'manage') THEN
    RAISE EXCEPTION 'Sem permissão para excluir modelos de rotina';
  END IF;

  SELECT count(*) INTO application_count
  FROM public.cs_cx_office_routines
  WHERE routine_model_id = p_id;

  IF application_count > 0 THEN
    RAISE EXCEPTION 'Não é possível excluir: o modelo possui % aplicação(ões)', application_count;
  END IF;

  DELETE FROM public.cs_cx_routine_models WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modelo de rotina não encontrado';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_save_routine_model_item(
  p_id UUID,
  p_routine_model_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_category_id UUID,
  p_routine_type_id UUID,
  p_required BOOLEAN,
  p_default_active BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item_id UUID;
  next_order INTEGER;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'manage') THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar itens de rotina';
  END IF;
  IF NULLIF(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o nome do item';
  END IF;

  IF p_id IS NULL THEN
    SELECT COALESCE(max(sort_order), 0) + 1 INTO next_order
    FROM public.cs_cx_routine_model_items
    WHERE routine_model_id = p_routine_model_id AND source_present;

    INSERT INTO public.cs_cx_routine_model_items (
      routine_model_id, name, description, category_id, routine_type_id,
      sort_order, required, default_active, origin, source_present
    ) VALUES (
      p_routine_model_id, trim(p_name), NULLIF(trim(p_description), ''),
      p_category_id, p_routine_type_id, next_order, COALESCE(p_required, false),
      p_default_active, 'hub', true
    ) RETURNING id INTO item_id;

    WITH added AS (
      INSERT INTO public.cs_cx_office_routine_items (
        office_routine_id, model_item_id, active, notes, configured_by, origin, source_present
      )
      SELECT routine.id, item_id, p_default_active,
             'Item adicionado automaticamente ao modelo', auth.uid(), 'hub', true
      FROM public.cs_cx_office_routines routine
      WHERE routine.routine_model_id = p_routine_model_id
        AND routine.active
        AND routine.source_present
      ON CONFLICT (office_routine_id, model_item_id) DO NOTHING
      RETURNING office_routine_id
    )
    INSERT INTO public.cs_cx_routine_history (
      office_routine_id, model_item_id, action, previous_status, new_status,
      notes, actor_profile_id, origin, source_present
    )
    SELECT office_routine_id, item_id, 'ITEM_ADICIONADO', NULL, p_default_active,
           format('Item "%s" adicionado automaticamente ao modelo', trim(p_name)),
           auth.uid(), 'hub', true
    FROM added;
  ELSE
    UPDATE public.cs_cx_routine_model_items
    SET name = trim(p_name),
        description = NULLIF(trim(p_description), ''),
        category_id = p_category_id,
        routine_type_id = p_routine_type_id,
        required = COALESCE(p_required, false),
        default_active = p_default_active,
        source_present = true
    WHERE id = p_id AND routine_model_id = p_routine_model_id
    RETURNING id INTO item_id;

    IF item_id IS NULL THEN
      RAISE EXCEPTION 'Item de rotina não encontrado neste modelo';
    END IF;
  END IF;

  RETURN item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_delete_routine_model_item(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item_name TEXT;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'manage') THEN
    RAISE EXCEPTION 'Sem permissão para excluir itens de rotina';
  END IF;

  SELECT name INTO item_name
  FROM public.cs_cx_routine_model_items
  WHERE id = p_id
  FOR UPDATE;
  IF item_name IS NULL THEN
    RAISE EXCEPTION 'Item de rotina não encontrado';
  END IF;

  INSERT INTO public.cs_cx_routine_history (
    office_routine_id, model_item_id, action, previous_status, new_status,
    notes, actor_profile_id, origin, source_present
  )
  SELECT office_routine_id, p_id, 'REMOVIDO_POR_EXCLUSAO_MODELO', active, false,
         format('Item "%s" removido devido à exclusão no modelo', item_name),
         auth.uid(), 'hub', true
  FROM public.cs_cx_office_routine_items
  WHERE model_item_id = p_id;

  DELETE FROM public.cs_cx_office_routine_items WHERE model_item_id = p_id;
  DELETE FROM public.cs_cx_routine_model_items WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_reorder_routine_model_item(
  p_id UUID,
  p_new_order INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_item public.cs_cx_routine_model_items%ROWTYPE;
  target_id UUID;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'manage') THEN
    RAISE EXCEPTION 'Sem permissão para reordenar itens de rotina';
  END IF;
  IF p_new_order < 1 THEN
    RAISE EXCEPTION 'A ordem deve ser maior que zero';
  END IF;

  SELECT * INTO current_item
  FROM public.cs_cx_routine_model_items
  WHERE id = p_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item de rotina não encontrado';
  END IF;

  SELECT id INTO target_id
  FROM public.cs_cx_routine_model_items
  WHERE routine_model_id = current_item.routine_model_id
    AND sort_order = p_new_order
    AND id <> p_id
  LIMIT 1
  FOR UPDATE;

  IF target_id IS NOT NULL THEN
    UPDATE public.cs_cx_routine_model_items
    SET sort_order = current_item.sort_order
    WHERE id = target_id;
  END IF;

  UPDATE public.cs_cx_routine_model_items
  SET sort_order = p_new_order
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_save_routine_model(UUID, TEXT, TEXT, BOOLEAN, UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cs_cx_delete_routine_model(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cs_cx_save_routine_model_item(UUID, UUID, TEXT, TEXT, UUID, UUID, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cs_cx_delete_routine_model_item(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cs_cx_reorder_routine_model_item(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_routine_model(UUID, TEXT, TEXT, BOOLEAN, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_delete_routine_model(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_routine_model_item(UUID, UUID, TEXT, TEXT, UUID, UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_delete_routine_model_item(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_reorder_routine_model_item(UUID, INTEGER) TO authenticated;

CREATE TRIGGER audit_cs_cx_routine_categories
  AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_routine_categories
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('categoria_rotina');
CREATE TRIGGER audit_cs_cx_routine_types
  AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_routine_types
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('tipo_rotina');
CREATE TRIGGER audit_cs_cx_routine_model_products
  AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_routine_model_products
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('produto_modelo_rotina');
CREATE TRIGGER audit_cs_cx_routine_model_items
  AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_routine_model_items
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('item_modelo_rotina');

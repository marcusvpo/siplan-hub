-- Rotinas de CS/CX e remoção da área duplicada de pós-implantação.

DELETE FROM public.app_role_permissions
WHERE permission_id IN (
  SELECT id FROM public.app_permissions WHERE resource = 'cs_cx_pos_implantacao'
);
DELETE FROM public.app_permissions WHERE resource = 'cs_cx_pos_implantacao';

CREATE TABLE public.cs_cx_routine_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_color TEXT NOT NULL DEFAULT '#6c757d',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cs_cx_routine_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cs_cx_routine_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  legacy_creator_user_id BIGINT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cs_cx_routine_model_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  routine_model_id UUID NOT NULL REFERENCES public.cs_cx_routine_models(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.cs_cx_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (routine_model_id, product_id)
);

CREATE TABLE public.cs_cx_routine_model_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  routine_model_id UUID NOT NULL REFERENCES public.cs_cx_routine_models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES public.cs_cx_routine_categories(id) ON DELETE RESTRICT,
  routine_type_id UUID NOT NULL REFERENCES public.cs_cx_routine_types(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT false,
  default_active BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cs_cx_office_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  registry_office_id UUID NOT NULL REFERENCES public.cs_cx_registry_offices(id) ON DELETE CASCADE,
  routine_model_id UUID NOT NULL REFERENCES public.cs_cx_routine_models(id) ON DELETE RESTRICT,
  legacy_user_id BIGINT,
  applied_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (registry_office_id, routine_model_id)
);

CREATE TABLE public.cs_cx_office_routine_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  office_routine_id UUID NOT NULL REFERENCES public.cs_cx_office_routines(id) ON DELETE CASCADE,
  model_item_id UUID NOT NULL REFERENCES public.cs_cx_routine_model_items(id) ON DELETE RESTRICT,
  active BOOLEAN,
  notes TEXT,
  analysis_notes TEXT,
  configured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  legacy_configured_by_user_id BIGINT,
  configured_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  analyzed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (office_routine_id, model_item_id)
);

CREATE TABLE public.cs_cx_routine_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  office_routine_id UUID REFERENCES public.cs_cx_office_routines(id) ON DELETE SET NULL,
  model_item_id UUID REFERENCES public.cs_cx_routine_model_items(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  previous_status BOOLEAN,
  new_status BOOLEAN,
  notes TEXT,
  legacy_user_id BIGINT,
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cs_cx_routine_items_model ON public.cs_cx_routine_model_items(routine_model_id, sort_order);
CREATE INDEX idx_cs_cx_office_routines_office ON public.cs_cx_office_routines(registry_office_id);
CREATE INDEX idx_cs_cx_office_routine_items_routine ON public.cs_cx_office_routine_items(office_routine_id);
CREATE INDEX idx_cs_cx_routine_history_routine ON public.cs_cx_routine_history(office_routine_id, occurred_at DESC);

ALTER TABLE public.cs_cx_routine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_routine_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_routine_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_routine_model_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_routine_model_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_office_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_office_routine_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_routine_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_cx_routine_categories_read ON public.cs_cx_routine_categories FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'view'));
CREATE POLICY cs_cx_routine_types_read ON public.cs_cx_routine_types FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'view'));
CREATE POLICY cs_cx_routine_models_read ON public.cs_cx_routine_models FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'view'));
CREATE POLICY cs_cx_routine_model_products_read ON public.cs_cx_routine_model_products FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'view'));
CREATE POLICY cs_cx_routine_model_items_read ON public.cs_cx_routine_model_items FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'view'));

CREATE POLICY cs_cx_routine_categories_manage ON public.cs_cx_routine_categories FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'));
CREATE POLICY cs_cx_routine_types_manage ON public.cs_cx_routine_types FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'));
CREATE POLICY cs_cx_routine_models_manage ON public.cs_cx_routine_models FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'));
CREATE POLICY cs_cx_routine_model_products_manage ON public.cs_cx_routine_model_products FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'));
CREATE POLICY cs_cx_routine_model_items_manage ON public.cs_cx_routine_model_items FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'));

CREATE POLICY cs_cx_office_routines_read ON public.cs_cx_office_routines FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'view'));
CREATE POLICY cs_cx_office_routines_create ON public.cs_cx_office_routines FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'create'));
CREATE POLICY cs_cx_office_routines_edit ON public.cs_cx_office_routines FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'edit'));
CREATE POLICY cs_cx_office_routines_delete ON public.cs_cx_office_routines FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'delete'));

CREATE POLICY cs_cx_office_routine_items_read ON public.cs_cx_office_routine_items FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'view'));
CREATE POLICY cs_cx_office_routine_items_create ON public.cs_cx_office_routine_items FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'create'));
CREATE POLICY cs_cx_office_routine_items_edit ON public.cs_cx_office_routine_items FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'edit'));
CREATE POLICY cs_cx_office_routine_items_delete ON public.cs_cx_office_routine_items FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'delete'));

CREATE POLICY cs_cx_routine_history_read ON public.cs_cx_routine_history FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'view'));
CREATE POLICY cs_cx_routine_history_create ON public.cs_cx_routine_history FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'cs_cx_rotinas', 'create')
    OR public.has_permission(auth.uid(), 'cs_cx_rotinas', 'edit')
  );

CREATE OR REPLACE FUNCTION public.cs_cx_apply_routine(
  p_registry_office_id UUID,
  p_routine_model_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  routine_id UUID;
BEGIN
  INSERT INTO public.cs_cx_office_routines (
    registry_office_id, routine_model_id, applied_by, notes, origin, source_present
  ) VALUES (
    p_registry_office_id, p_routine_model_id, auth.uid(), NULLIF(trim(p_notes), ''), 'hub', true
  ) RETURNING id INTO routine_id;

  INSERT INTO public.cs_cx_office_routine_items (
    office_routine_id, model_item_id, active, configured_by, origin, source_present
  )
  SELECT routine_id, item.id, item.default_active, auth.uid(), 'hub', true
  FROM public.cs_cx_routine_model_items item
  WHERE item.routine_model_id = p_routine_model_id
    AND item.source_present;

  INSERT INTO public.cs_cx_routine_history (
    office_routine_id, action, actor_profile_id, origin, source_present
  ) VALUES (routine_id, 'APLICADO', auth.uid(), 'hub', true);

  RETURN routine_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_set_routine_item(
  p_config_id UUID,
  p_active BOOLEAN,
  p_analysis_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  old_row public.cs_cx_office_routine_items%ROWTYPE;
BEGIN
  SELECT * INTO old_row
  FROM public.cs_cx_office_routine_items
  WHERE id = p_config_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item de rotina não encontrado';
  END IF;

  UPDATE public.cs_cx_office_routine_items
  SET active = p_active,
      analysis_notes = NULLIF(trim(p_analysis_notes), ''),
      configured_by = auth.uid(),
      configured_at = now(),
      analyzed_at = now()
  WHERE id = p_config_id;

  INSERT INTO public.cs_cx_routine_history (
    office_routine_id, model_item_id, action, previous_status, new_status,
    notes, actor_profile_id, origin, source_present
  ) VALUES (
    old_row.office_routine_id,
    old_row.model_item_id,
    CASE WHEN p_active IS TRUE THEN 'ATIVADO'
         WHEN p_active IS FALSE THEN 'DESATIVADO'
         ELSE 'ANALISAR' END,
    old_row.active,
    p_active,
    NULLIF(trim(p_analysis_notes), ''),
    auth.uid(),
    'hub',
    true
  );
END;
$$;

CREATE TRIGGER update_cs_cx_routine_models_updated_at BEFORE UPDATE ON public.cs_cx_routine_models
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_update_updated_at();
CREATE TRIGGER update_cs_cx_office_routines_updated_at BEFORE UPDATE ON public.cs_cx_office_routines
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_update_updated_at();
CREATE TRIGGER update_cs_cx_office_routine_items_updated_at BEFORE UPDATE ON public.cs_cx_office_routine_items
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_update_updated_at();

CREATE TRIGGER audit_cs_cx_routine_models
  AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_routine_models
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('modelo_rotina');
CREATE TRIGGER audit_cs_cx_office_routines
  AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_office_routines
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('rotina_cartorio');
CREATE TRIGGER audit_cs_cx_office_routine_items
  AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_office_routine_items
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('config_item_cartorio');

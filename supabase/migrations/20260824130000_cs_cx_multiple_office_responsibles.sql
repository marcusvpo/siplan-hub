-- Permite varios responsaveis por cartorio e usa o vinculo para limitar o acesso
-- aos dados de CS/CX sem conceder a permissao global de visualizar terceiros.

CREATE TABLE IF NOT EXISTS public.cs_cx_registry_office_responsibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_office_id UUID NOT NULL
    REFERENCES public.cs_cx_registry_offices(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (registry_office_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_cs_cx_office_responsibles_office
  ON public.cs_cx_registry_office_responsibles(registry_office_id);
CREATE INDEX IF NOT EXISTS idx_cs_cx_office_responsibles_profile
  ON public.cs_cx_registry_office_responsibles(profile_id);

ALTER TABLE public.cs_cx_registry_office_responsibles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.cs_cx_registry_office_responsibles TO authenticated;

INSERT INTO public.cs_cx_registry_office_responsibles
  (registry_office_id, profile_id, created_by)
SELECT office.id, office.analyst_profile_id, office.created_by
FROM public.cs_cx_registry_offices office
WHERE office.analyst_profile_id IS NOT NULL
ON CONFLICT (registry_office_id, profile_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.cs_cx_is_office_responsible(
  p_registry_office_id UUID,
  p_profile_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_profile_id IS NOT NULL
    AND p_registry_office_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.cs_cx_registry_office_responsibles responsible
      WHERE responsible.registry_office_id = p_registry_office_id
        AND responsible.profile_id = p_profile_id
    );
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_can_view_office_record(
  req_resource TEXT,
  owner_id UUID,
  p_registry_office_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.has_permission(auth.uid(), req_resource, 'view')
    AND (
      owner_id = auth.uid()
      OR public.cs_cx_is_office_responsible(p_registry_office_id, auth.uid())
      OR public.has_permission(auth.uid(), req_resource, 'view_others')
    );
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_can_manage_office_record(
  req_resource TEXT,
  req_action TEXT,
  owner_id UUID,
  p_registry_office_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.has_permission(auth.uid(), req_resource, req_action)
    AND (
      owner_id = auth.uid()
      OR public.cs_cx_is_office_responsible(p_registry_office_id, auth.uid())
      OR public.has_permission(auth.uid(), req_resource, 'manage_others')
    );
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_can_report_office_record(
  owner_id UUID,
  p_registry_office_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.has_permission(auth.uid(), 'cs_cx_reports', 'view')
    AND (
      owner_id = auth.uid()
      OR public.cs_cx_is_office_responsible(p_registry_office_id, auth.uid())
      OR public.has_permission(auth.uid(), 'cs_cx_reports', 'view_others')
    );
$$;

REVOKE ALL ON FUNCTION public.cs_cx_is_office_responsible(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_can_view_office_record(TEXT, UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_can_manage_office_record(TEXT, TEXT, UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_can_report_office_record(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cs_cx_is_office_responsible(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_can_view_office_record(TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_can_manage_office_record(TEXT, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_can_report_office_record(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS cs_cx_office_responsibles_read
  ON public.cs_cx_registry_office_responsibles;
DROP POLICY IF EXISTS cs_cx_office_responsibles_create
  ON public.cs_cx_registry_office_responsibles;
DROP POLICY IF EXISTS cs_cx_office_responsibles_edit
  ON public.cs_cx_registry_office_responsibles;
DROP POLICY IF EXISTS cs_cx_office_responsibles_delete
  ON public.cs_cx_registry_office_responsibles;
CREATE POLICY cs_cx_office_responsibles_read
  ON public.cs_cx_registry_office_responsibles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_registry_offices office
    WHERE office.id = registry_office_id
      AND public.cs_cx_can_view_office_record(
        'cs_cx_cartorios', office.created_by, office.id
      )
  ));
CREATE POLICY cs_cx_office_responsibles_create
  ON public.cs_cx_registry_office_responsibles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_registry_offices office
    WHERE office.id = registry_office_id
      AND (
        (office.created_by = auth.uid()
          AND public.has_permission(auth.uid(), 'cs_cx_cartorios', 'create'))
        OR public.cs_cx_can_manage_office_record(
          'cs_cx_cartorios', 'edit', office.created_by, office.id
        )
      )
  ));
CREATE POLICY cs_cx_office_responsibles_edit
  ON public.cs_cx_registry_office_responsibles FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_registry_offices office
    WHERE office.id = registry_office_id
      AND public.cs_cx_can_manage_office_record(
        'cs_cx_cartorios', 'edit', office.created_by, office.id
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_registry_offices office
    WHERE office.id = registry_office_id
      AND public.cs_cx_can_manage_office_record(
        'cs_cx_cartorios', 'edit', office.created_by, office.id
      )
  ));
CREATE POLICY cs_cx_office_responsibles_delete
  ON public.cs_cx_registry_office_responsibles FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_registry_offices office
    WHERE office.id = registry_office_id
      AND public.cs_cx_can_manage_office_record(
        'cs_cx_cartorios', 'edit', office.created_by, office.id
      )
  ));

CREATE OR REPLACE FUNCTION public.cs_cx_save_registry_office_v4(
  p_id UUID,
  p_name TEXT,
  p_sap_code TEXT,
  p_contact_details TEXT,
  p_notes TEXT,
  p_active BOOLEAN,
  p_products JSONB,
  p_responsibles JSONB,
  p_responsible_profile_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  saved_id UUID;
  primary_responsible_id UUID;
BEGIN
  SELECT selected.profile_id
  INTO primary_responsible_id
  FROM unnest(COALESCE(p_responsible_profile_ids, ARRAY[]::UUID[]))
    WITH ORDINALITY AS selected(profile_id, position)
  WHERE selected.profile_id IS NOT NULL
  ORDER BY selected.position
  LIMIT 1;

  saved_id := public.cs_cx_save_registry_office_v3(
    p_id,
    p_name,
    p_sap_code,
    p_contact_details,
    p_notes,
    p_active,
    p_products,
    p_responsibles,
    primary_responsible_id
  );

  DELETE FROM public.cs_cx_registry_office_responsibles responsible
  WHERE responsible.registry_office_id = saved_id
    AND NOT responsible.profile_id = ANY(
      COALESCE(p_responsible_profile_ids, ARRAY[]::UUID[])
    );

  INSERT INTO public.cs_cx_registry_office_responsibles
    (registry_office_id, profile_id, created_by)
  SELECT DISTINCT saved_id, selected.profile_id, auth.uid()
  FROM unnest(COALESCE(p_responsible_profile_ids, ARRAY[]::UUID[]))
    AS selected(profile_id)
  WHERE selected.profile_id IS NOT NULL
  ON CONFLICT (registry_office_id, profile_id) DO NOTHING;

  RETURN saved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_save_registry_office_v4(
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, JSONB, UUID[]
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_registry_office_v4(
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, JSONB, UUID[]
) TO authenticated;

-- O cartorio e os registros ligados a ele ficam visiveis para qualquer um dos
-- responsaveis, sem alterar as permissoes base de cada modulo.
DROP POLICY IF EXISTS cs_cx_registry_offices_read ON public.cs_cx_registry_offices;
DROP POLICY IF EXISTS cs_cx_registry_offices_edit ON public.cs_cx_registry_offices;
DROP POLICY IF EXISTS cs_cx_registry_offices_delete ON public.cs_cx_registry_offices;
DROP POLICY IF EXISTS cs_cx_registry_offices_reports_read ON public.cs_cx_registry_offices;
CREATE POLICY cs_cx_registry_offices_read ON public.cs_cx_registry_offices FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_office_record('cs_cx_cartorios', created_by, id));
CREATE POLICY cs_cx_registry_offices_edit ON public.cs_cx_registry_offices FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_cartorios', 'edit', created_by, id))
  WITH CHECK (public.cs_cx_can_manage_office_record('cs_cx_cartorios', 'edit', created_by, id));
CREATE POLICY cs_cx_registry_offices_delete ON public.cs_cx_registry_offices FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_cartorios', 'delete', created_by, id));
CREATE POLICY cs_cx_registry_offices_reports_read ON public.cs_cx_registry_offices FOR SELECT TO authenticated
  USING (public.cs_cx_can_report_office_record(created_by, id));

DROP POLICY IF EXISTS cs_cx_requests_read ON public.cs_cx_requests;
DROP POLICY IF EXISTS cs_cx_requests_edit ON public.cs_cx_requests;
DROP POLICY IF EXISTS cs_cx_requests_delete ON public.cs_cx_requests;
CREATE POLICY cs_cx_requests_read ON public.cs_cx_requests FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_office_record('cs_cx_registros', author_profile_id, registry_office_id));
CREATE POLICY cs_cx_requests_edit ON public.cs_cx_requests FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_registros', 'edit', author_profile_id, registry_office_id))
  WITH CHECK (public.cs_cx_can_manage_office_record('cs_cx_registros', 'edit', author_profile_id, registry_office_id));
CREATE POLICY cs_cx_requests_delete ON public.cs_cx_requests FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_registros', 'delete', author_profile_id, registry_office_id));

DROP POLICY IF EXISTS cs_cx_contacts_read ON public.cs_cx_contacts;
DROP POLICY IF EXISTS cs_cx_contacts_edit ON public.cs_cx_contacts;
DROP POLICY IF EXISTS cs_cx_contacts_delete ON public.cs_cx_contacts;
CREATE POLICY cs_cx_contacts_read ON public.cs_cx_contacts FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_office_record('cs_cx_contatos', author_profile_id, registry_office_id));
CREATE POLICY cs_cx_contacts_edit ON public.cs_cx_contacts FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_contatos', 'edit', author_profile_id, registry_office_id))
  WITH CHECK (public.cs_cx_can_manage_office_record('cs_cx_contatos', 'edit', author_profile_id, registry_office_id));
CREATE POLICY cs_cx_contacts_delete ON public.cs_cx_contacts FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_contatos', 'delete', author_profile_id, registry_office_id));

DROP POLICY IF EXISTS cs_cx_appointments_read ON public.cs_cx_appointments;
DROP POLICY IF EXISTS cs_cx_appointments_edit ON public.cs_cx_appointments;
DROP POLICY IF EXISTS cs_cx_appointments_delete ON public.cs_cx_appointments;
CREATE POLICY cs_cx_appointments_read ON public.cs_cx_appointments FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_office_record('cs_cx_agendamentos', created_by, registry_office_id));
CREATE POLICY cs_cx_appointments_edit ON public.cs_cx_appointments FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_agendamentos', 'edit', created_by, registry_office_id))
  WITH CHECK (public.cs_cx_can_manage_office_record('cs_cx_agendamentos', 'edit', created_by, registry_office_id));
CREATE POLICY cs_cx_appointments_delete ON public.cs_cx_appointments FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_agendamentos', 'delete', created_by, registry_office_id));

DROP POLICY IF EXISTS cs_cx_office_routines_read ON public.cs_cx_office_routines;
DROP POLICY IF EXISTS cs_cx_office_routines_edit ON public.cs_cx_office_routines;
DROP POLICY IF EXISTS cs_cx_office_routines_delete ON public.cs_cx_office_routines;
DROP POLICY IF EXISTS cs_cx_office_routines_reports_read ON public.cs_cx_office_routines;
CREATE POLICY cs_cx_office_routines_read ON public.cs_cx_office_routines FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_office_record('cs_cx_rotinas', applied_by, registry_office_id));
CREATE POLICY cs_cx_office_routines_edit ON public.cs_cx_office_routines FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_rotinas', 'edit', applied_by, registry_office_id))
  WITH CHECK (public.cs_cx_can_manage_office_record('cs_cx_rotinas', 'edit', applied_by, registry_office_id));
CREATE POLICY cs_cx_office_routines_delete ON public.cs_cx_office_routines FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_rotinas', 'delete', applied_by, registry_office_id));
CREATE POLICY cs_cx_office_routines_reports_read ON public.cs_cx_office_routines FOR SELECT TO authenticated
  USING (public.cs_cx_can_report_office_record(applied_by, registry_office_id));

DROP POLICY IF EXISTS cs_cx_visits_read ON public.cs_cx_visits;
DROP POLICY IF EXISTS cs_cx_visits_edit ON public.cs_cx_visits;
DROP POLICY IF EXISTS cs_cx_visits_delete ON public.cs_cx_visits;
CREATE POLICY cs_cx_visits_read ON public.cs_cx_visits FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_office_record('cs_cx_visitas', created_by, registry_office_id));
CREATE POLICY cs_cx_visits_edit ON public.cs_cx_visits FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_visitas', 'edit', created_by, registry_office_id))
  WITH CHECK (public.cs_cx_can_manage_office_record('cs_cx_visitas', 'edit', created_by, registry_office_id));
CREATE POLICY cs_cx_visits_delete ON public.cs_cx_visits FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_visitas', 'delete', created_by, registry_office_id));

DROP POLICY IF EXISTS cs_cx_nps_invitations_read ON public.cs_cx_nps_invitations;
DROP POLICY IF EXISTS cs_cx_nps_invitations_edit ON public.cs_cx_nps_invitations;
DROP POLICY IF EXISTS cs_cx_nps_invitations_delete ON public.cs_cx_nps_invitations;
CREATE POLICY cs_cx_nps_invitations_read ON public.cs_cx_nps_invitations FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_office_record('cs_cx_nps', created_by, registry_office_id));
CREATE POLICY cs_cx_nps_invitations_edit ON public.cs_cx_nps_invitations FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_nps', 'edit', created_by, registry_office_id))
  WITH CHECK (public.cs_cx_can_manage_office_record('cs_cx_nps', 'edit', created_by, registry_office_id));
CREATE POLICY cs_cx_nps_invitations_delete ON public.cs_cx_nps_invitations FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_nps', 'delete', created_by, registry_office_id));

DROP POLICY IF EXISTS cs_cx_nps_responses_read ON public.cs_cx_nps_responses;
DROP POLICY IF EXISTS cs_cx_nps_responses_delete ON public.cs_cx_nps_responses;
CREATE POLICY cs_cx_nps_responses_read ON public.cs_cx_nps_responses FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_office_record('cs_cx_nps', owner_profile_id, registry_office_id));
CREATE POLICY cs_cx_nps_responses_delete ON public.cs_cx_nps_responses FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_nps', 'delete', owner_profile_id, registry_office_id));

DROP POLICY IF EXISTS cs_cx_nps_history_read ON public.cs_cx_nps_history;
DROP POLICY IF EXISTS cs_cx_nps_history_write ON public.cs_cx_nps_history;
CREATE POLICY cs_cx_nps_history_read ON public.cs_cx_nps_history FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_office_record('cs_cx_nps', generated_by, registry_office_id));
CREATE POLICY cs_cx_nps_history_write ON public.cs_cx_nps_history FOR ALL TO authenticated
  USING (public.cs_cx_can_manage_office_record('cs_cx_nps', 'edit', generated_by, registry_office_id))
  WITH CHECK (public.cs_cx_can_manage_office_record('cs_cx_nps', 'edit', generated_by, registry_office_id));

-- Os produtos implantados e seus responsaveis tambem podem ser mantidos pelos
-- responsaveis gerais do cartorio.
DROP POLICY IF EXISTS cs_cx_registry_office_products_manage ON public.cs_cx_registry_office_products;
CREATE POLICY cs_cx_registry_office_products_manage ON public.cs_cx_registry_office_products FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_registry_offices office
    WHERE office.id = registry_office_id
      AND public.cs_cx_can_manage_office_record('cs_cx_cartorios', 'edit', office.created_by, office.id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_registry_offices office
    WHERE office.id = registry_office_id
      AND (
        (office.created_by = auth.uid() AND public.has_permission(auth.uid(), 'cs_cx_cartorios', 'create'))
        OR public.cs_cx_can_manage_office_record('cs_cx_cartorios', 'edit', office.created_by, office.id)
      )
  ));

DROP POLICY IF EXISTS cs_cx_office_product_responsibles_create ON public.cs_cx_registry_office_product_responsibles;
DROP POLICY IF EXISTS cs_cx_office_product_responsibles_edit ON public.cs_cx_registry_office_product_responsibles;
DROP POLICY IF EXISTS cs_cx_office_product_responsibles_delete ON public.cs_cx_registry_office_product_responsibles;
CREATE POLICY cs_cx_office_product_responsibles_create ON public.cs_cx_registry_office_product_responsibles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.cs_cx_registry_office_products link
    JOIN public.cs_cx_registry_offices office ON office.id = link.registry_office_id
    WHERE link.id = registry_office_product_id
      AND (
        (office.created_by = auth.uid() AND public.has_permission(auth.uid(), 'cs_cx_cartorios', 'create'))
        OR public.cs_cx_can_manage_office_record('cs_cx_cartorios', 'edit', office.created_by, office.id)
      )
  ));
CREATE POLICY cs_cx_office_product_responsibles_edit ON public.cs_cx_registry_office_product_responsibles FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.cs_cx_registry_office_products link
    JOIN public.cs_cx_registry_offices office ON office.id = link.registry_office_id
    WHERE link.id = registry_office_product_id
      AND public.cs_cx_can_manage_office_record('cs_cx_cartorios', 'edit', office.created_by, office.id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.cs_cx_registry_office_products link
    JOIN public.cs_cx_registry_offices office ON office.id = link.registry_office_id
    WHERE link.id = registry_office_product_id
      AND public.cs_cx_can_manage_office_record('cs_cx_cartorios', 'edit', office.created_by, office.id)
  ));
CREATE POLICY cs_cx_office_product_responsibles_delete ON public.cs_cx_registry_office_product_responsibles FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.cs_cx_registry_office_products link
    JOIN public.cs_cx_registry_offices office ON office.id = link.registry_office_id
    WHERE link.id = registry_office_product_id
      AND public.cs_cx_can_manage_office_record('cs_cx_cartorios', 'edit', office.created_by, office.id)
  ));

COMMENT ON TABLE public.cs_cx_registry_office_responsibles IS
  'Responsaveis gerais de cada cartorio, usados tambem no escopo de acesso aos dados de CS/CX.';
COMMENT ON COLUMN public.cs_cx_registry_offices.analyst_profile_id IS
  'Responsavel principal legado; os vinculos completos ficam em cs_cx_registry_office_responsibles.';

NOTIFY pgrst, 'reload schema';

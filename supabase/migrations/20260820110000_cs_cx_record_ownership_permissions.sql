-- Permissões granulares para lançamentos próprios e de outros usuários no CS/CX.
-- Os perfis existentes recebem as novas permissões equivalentes para preservar
-- o comportamento atual; o administrador pode removê-las depois por perfil.

INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('cs_cx_registros', 'view_others', 'Visualizar solicitações lançadas por outros usuários'),
  ('cs_cx_registros', 'manage_others', 'Editar ou excluir solicitações lançadas por outros usuários'),
  ('cs_cx_cartorios', 'view_others', 'Visualizar cartórios lançados por outros usuários'),
  ('cs_cx_cartorios', 'manage_others', 'Editar ou excluir cartórios lançados por outros usuários'),
  ('cs_cx_contatos', 'view_others', 'Visualizar contatos lançados por outros usuários'),
  ('cs_cx_contatos', 'manage_others', 'Editar ou excluir contatos lançados por outros usuários'),
  ('cs_cx_agendamentos', 'view_others', 'Visualizar agendamentos lançados por outros usuários'),
  ('cs_cx_agendamentos', 'manage_others', 'Editar ou excluir agendamentos lançados por outros usuários'),
  ('cs_cx_rotinas', 'view_others', 'Visualizar aplicações de rotinas lançadas por outros usuários'),
  ('cs_cx_rotinas', 'manage_others', 'Editar ou excluir aplicações de rotinas lançadas por outros usuários'),
  ('cs_cx_visitas', 'view_others', 'Visualizar visitas lançadas por outros usuários'),
  ('cs_cx_visitas', 'manage_others', 'Editar ou excluir visitas lançadas por outros usuários'),
  ('cs_cx_nps', 'view_others', 'Visualizar pesquisas e respostas vinculadas a outros usuários'),
  ('cs_cx_nps', 'manage_others', 'Editar ou excluir pesquisas vinculadas a outros usuários'),
  ('cs_cx_reports', 'view_others', 'Incluir lançamentos de outros usuários nos relatórios')
ON CONFLICT (resource, action) DO UPDATE
SET description = EXCLUDED.description;

-- Mantém o acesso que cada perfil já possuía antes da granularidade por autor.
INSERT INTO public.cs_cx_access_profile_permissions (access_profile_id, permission_id)
SELECT DISTINCT current_permission.access_profile_id, new_permission.id
FROM public.cs_cx_access_profile_permissions current_permission
JOIN public.app_permissions current_definition
  ON current_definition.id = current_permission.permission_id
JOIN public.app_permissions new_permission
  ON new_permission.resource = current_definition.resource
 AND new_permission.action = 'view_others'
WHERE current_definition.action = 'view'
  AND new_permission.resource IN (
    'cs_cx_registros', 'cs_cx_cartorios', 'cs_cx_contatos',
    'cs_cx_agendamentos', 'cs_cx_rotinas', 'cs_cx_visitas',
    'cs_cx_nps', 'cs_cx_reports'
  )
ON CONFLICT (access_profile_id, permission_id) DO NOTHING;

INSERT INTO public.cs_cx_access_profile_permissions (access_profile_id, permission_id)
SELECT DISTINCT current_permission.access_profile_id, new_permission.id
FROM public.cs_cx_access_profile_permissions current_permission
JOIN public.app_permissions current_definition
  ON current_definition.id = current_permission.permission_id
JOIN public.app_permissions new_permission
  ON new_permission.resource = current_definition.resource
 AND new_permission.action = 'manage_others'
WHERE current_definition.action IN ('edit', 'delete')
  AND new_permission.resource IN (
    'cs_cx_registros', 'cs_cx_cartorios', 'cs_cx_contatos',
    'cs_cx_agendamentos', 'cs_cx_rotinas', 'cs_cx_visitas', 'cs_cx_nps'
  )
ON CONFLICT (access_profile_id, permission_id) DO NOTHING;

INSERT INTO public.cs_cx_access_profile_permissions (access_profile_id, permission_id)
SELECT access_profile.id, permission.id
FROM public.cs_cx_access_profiles access_profile
CROSS JOIN public.app_permissions permission
WHERE access_profile.name = 'Administrador CS/CX'
  AND permission.action IN ('view_others', 'manage_others')
  AND (
    permission.resource = 'cs_cx_reports'
    OR permission.resource IN (
      'cs_cx_registros', 'cs_cx_cartorios', 'cs_cx_contatos',
      'cs_cx_agendamentos', 'cs_cx_rotinas', 'cs_cx_visitas', 'cs_cx_nps'
    )
  )
ON CONFLICT (access_profile_id, permission_id) DO NOTHING;

ALTER TABLE public.cs_cx_registry_offices
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.cs_cx_visits
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.cs_cx_nps_responses
  ADD COLUMN IF NOT EXISTS owner_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.cs_cx_registry_offices
SET created_by = analyst_profile_id
WHERE created_by IS NULL AND analyst_profile_id IS NOT NULL;

UPDATE public.cs_cx_visits
SET created_by = visitor_profile_id
WHERE created_by IS NULL AND visitor_profile_id IS NOT NULL;

UPDATE public.cs_cx_nps_responses response
SET owner_profile_id = COALESCE(
  response.author_profile_id,
  invitation.created_by
)
FROM public.cs_cx_nps_invitations invitation
WHERE invitation.id = response.invitation_id
  AND response.owner_profile_id IS NULL;

UPDATE public.cs_cx_nps_responses
SET owner_profile_id = author_profile_id
WHERE owner_profile_id IS NULL AND author_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cs_cx_registry_offices_created_by
  ON public.cs_cx_registry_offices(created_by);
CREATE INDEX IF NOT EXISTS idx_cs_cx_visits_created_by
  ON public.cs_cx_visits(created_by);
CREATE INDEX IF NOT EXISTS idx_cs_cx_nps_responses_owner
  ON public.cs_cx_nps_responses(owner_profile_id);

CREATE OR REPLACE FUNCTION public.cs_cx_can_view_owned(
  req_resource TEXT,
  owner_id UUID
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
      OR public.has_permission(auth.uid(), req_resource, 'view_others')
    );
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_can_manage_owned(
  req_resource TEXT,
  req_action TEXT,
  owner_id UUID
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
      OR public.has_permission(auth.uid(), req_resource, 'manage_others')
    );
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_can_report_owned(owner_id UUID)
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
      OR public.has_permission(auth.uid(), 'cs_cx_reports', 'view_others')
    );
$$;

REVOKE ALL ON FUNCTION public.cs_cx_can_view_owned(TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_can_manage_owned(TEXT, TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_can_report_owned(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cs_cx_can_view_owned(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_can_manage_owned(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_can_report_owned(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.cs_cx_default_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_default_author_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.author_profile_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.author_profile_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_default_applied_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.applied_by IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.applied_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_default_nps_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_profile_id IS NULL THEN
    NEW.owner_profile_id := COALESCE(
      NEW.author_profile_id,
      (SELECT invitation.created_by
       FROM public.cs_cx_nps_invitations invitation
       WHERE invitation.id = NEW.invitation_id),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cs_cx_registry_offices_default_owner ON public.cs_cx_registry_offices;
CREATE TRIGGER cs_cx_registry_offices_default_owner
  BEFORE INSERT ON public.cs_cx_registry_offices
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_default_created_by();
DROP TRIGGER IF EXISTS cs_cx_visits_default_owner ON public.cs_cx_visits;
CREATE TRIGGER cs_cx_visits_default_owner
  BEFORE INSERT ON public.cs_cx_visits
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_default_created_by();
DROP TRIGGER IF EXISTS cs_cx_appointments_default_owner ON public.cs_cx_appointments;
CREATE TRIGGER cs_cx_appointments_default_owner
  BEFORE INSERT ON public.cs_cx_appointments
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_default_created_by();
DROP TRIGGER IF EXISTS cs_cx_nps_questionnaires_default_owner ON public.cs_cx_nps_questionnaires;
CREATE TRIGGER cs_cx_nps_questionnaires_default_owner
  BEFORE INSERT ON public.cs_cx_nps_questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_default_created_by();
DROP TRIGGER IF EXISTS cs_cx_nps_invitations_default_owner ON public.cs_cx_nps_invitations;
CREATE TRIGGER cs_cx_nps_invitations_default_owner
  BEFORE INSERT ON public.cs_cx_nps_invitations
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_default_created_by();
DROP TRIGGER IF EXISTS cs_cx_requests_default_owner ON public.cs_cx_requests;
CREATE TRIGGER cs_cx_requests_default_owner
  BEFORE INSERT ON public.cs_cx_requests
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_default_author_profile();
DROP TRIGGER IF EXISTS cs_cx_contacts_default_owner ON public.cs_cx_contacts;
CREATE TRIGGER cs_cx_contacts_default_owner
  BEFORE INSERT ON public.cs_cx_contacts
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_default_author_profile();
DROP TRIGGER IF EXISTS cs_cx_office_routines_default_owner ON public.cs_cx_office_routines;
CREATE TRIGGER cs_cx_office_routines_default_owner
  BEFORE INSERT ON public.cs_cx_office_routines
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_default_applied_by();
DROP TRIGGER IF EXISTS cs_cx_nps_responses_default_owner ON public.cs_cx_nps_responses;
CREATE TRIGGER cs_cx_nps_responses_default_owner
  BEFORE INSERT ON public.cs_cx_nps_responses
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_default_nps_owner();

-- Estas rotinas já validam as permissões e passam a respeitar também o RLS.
ALTER FUNCTION public.cs_cx_save_contact(UUID, DATE, TEXT, TEXT, UUID[], TEXT, TEXT, UUID, TEXT)
  SECURITY INVOKER;
ALTER FUNCTION public.cs_cx_save_registry_office(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB)
  SECURITY INVOKER;
ALTER FUNCTION public.cs_cx_save_registry_office_v2(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, JSONB)
  SECURITY INVOKER;
ALTER FUNCTION public.cs_cx_save_registry_office_v3(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, JSONB, UUID)
  SECURITY INVOKER;
ALTER FUNCTION public.cs_cx_save_request_v2(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, UUID, TEXT)
  SECURITY INVOKER;

-- Entidades principais: leitura e alteração passam a considerar o autor.
DROP POLICY IF EXISTS cs_cx_registry_offices_read ON public.cs_cx_registry_offices;
DROP POLICY IF EXISTS cs_cx_registry_offices_create ON public.cs_cx_registry_offices;
DROP POLICY IF EXISTS cs_cx_registry_offices_edit ON public.cs_cx_registry_offices;
DROP POLICY IF EXISTS cs_cx_registry_offices_delete ON public.cs_cx_registry_offices;
DROP POLICY IF EXISTS cs_cx_registry_offices_reports_read ON public.cs_cx_registry_offices;
CREATE POLICY cs_cx_registry_offices_read ON public.cs_cx_registry_offices FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_owned('cs_cx_cartorios', created_by));
CREATE POLICY cs_cx_registry_offices_create ON public.cs_cx_registry_offices FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_cartorios', 'create') AND created_by = auth.uid());
CREATE POLICY cs_cx_registry_offices_edit ON public.cs_cx_registry_offices FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_cartorios', 'edit', created_by))
  WITH CHECK (public.cs_cx_can_manage_owned('cs_cx_cartorios', 'edit', created_by));
CREATE POLICY cs_cx_registry_offices_delete ON public.cs_cx_registry_offices FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_cartorios', 'delete', created_by));
CREATE POLICY cs_cx_registry_offices_reports_read ON public.cs_cx_registry_offices FOR SELECT TO authenticated
  USING (public.cs_cx_can_report_owned(created_by));

DROP POLICY IF EXISTS cs_cx_requests_read ON public.cs_cx_requests;
DROP POLICY IF EXISTS cs_cx_requests_create ON public.cs_cx_requests;
DROP POLICY IF EXISTS cs_cx_requests_edit ON public.cs_cx_requests;
DROP POLICY IF EXISTS cs_cx_requests_delete ON public.cs_cx_requests;
CREATE POLICY cs_cx_requests_read ON public.cs_cx_requests FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_owned('cs_cx_registros', author_profile_id));
CREATE POLICY cs_cx_requests_create ON public.cs_cx_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_registros', 'create') AND author_profile_id = auth.uid());
CREATE POLICY cs_cx_requests_edit ON public.cs_cx_requests FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_registros', 'edit', author_profile_id))
  WITH CHECK (public.cs_cx_can_manage_owned('cs_cx_registros', 'edit', author_profile_id));
CREATE POLICY cs_cx_requests_delete ON public.cs_cx_requests FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_registros', 'delete', author_profile_id));

DROP POLICY IF EXISTS cs_cx_contacts_read ON public.cs_cx_contacts;
DROP POLICY IF EXISTS cs_cx_contacts_create ON public.cs_cx_contacts;
DROP POLICY IF EXISTS cs_cx_contacts_edit ON public.cs_cx_contacts;
DROP POLICY IF EXISTS cs_cx_contacts_delete ON public.cs_cx_contacts;
CREATE POLICY cs_cx_contacts_read ON public.cs_cx_contacts FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_owned('cs_cx_contatos', author_profile_id));
CREATE POLICY cs_cx_contacts_create ON public.cs_cx_contacts FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_contatos', 'create') AND author_profile_id = auth.uid());
CREATE POLICY cs_cx_contacts_edit ON public.cs_cx_contacts FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_contatos', 'edit', author_profile_id))
  WITH CHECK (public.cs_cx_can_manage_owned('cs_cx_contatos', 'edit', author_profile_id));
CREATE POLICY cs_cx_contacts_delete ON public.cs_cx_contacts FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_contatos', 'delete', author_profile_id));

DROP POLICY IF EXISTS cs_cx_appointments_read ON public.cs_cx_appointments;
DROP POLICY IF EXISTS cs_cx_appointments_create ON public.cs_cx_appointments;
DROP POLICY IF EXISTS cs_cx_appointments_edit ON public.cs_cx_appointments;
DROP POLICY IF EXISTS cs_cx_appointments_delete ON public.cs_cx_appointments;
CREATE POLICY cs_cx_appointments_read ON public.cs_cx_appointments FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_owned('cs_cx_agendamentos', created_by));
CREATE POLICY cs_cx_appointments_create ON public.cs_cx_appointments FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_agendamentos', 'create') AND created_by = auth.uid());
CREATE POLICY cs_cx_appointments_edit ON public.cs_cx_appointments FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_agendamentos', 'edit', created_by))
  WITH CHECK (public.cs_cx_can_manage_owned('cs_cx_agendamentos', 'edit', created_by));
CREATE POLICY cs_cx_appointments_delete ON public.cs_cx_appointments FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_agendamentos', 'delete', created_by));

DROP POLICY IF EXISTS cs_cx_office_routines_read ON public.cs_cx_office_routines;
DROP POLICY IF EXISTS cs_cx_office_routines_create ON public.cs_cx_office_routines;
DROP POLICY IF EXISTS cs_cx_office_routines_edit ON public.cs_cx_office_routines;
DROP POLICY IF EXISTS cs_cx_office_routines_delete ON public.cs_cx_office_routines;
DROP POLICY IF EXISTS cs_cx_office_routines_reports_read ON public.cs_cx_office_routines;
CREATE POLICY cs_cx_office_routines_read ON public.cs_cx_office_routines FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_owned('cs_cx_rotinas', applied_by));
CREATE POLICY cs_cx_office_routines_create ON public.cs_cx_office_routines FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'create') AND applied_by = auth.uid());
CREATE POLICY cs_cx_office_routines_edit ON public.cs_cx_office_routines FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_rotinas', 'edit', applied_by))
  WITH CHECK (public.cs_cx_can_manage_owned('cs_cx_rotinas', 'edit', applied_by));
CREATE POLICY cs_cx_office_routines_delete ON public.cs_cx_office_routines FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_rotinas', 'delete', applied_by));
CREATE POLICY cs_cx_office_routines_reports_read ON public.cs_cx_office_routines FOR SELECT TO authenticated
  USING (public.cs_cx_can_report_owned(applied_by));

DROP POLICY IF EXISTS cs_cx_visits_read ON public.cs_cx_visits;
DROP POLICY IF EXISTS cs_cx_visits_create ON public.cs_cx_visits;
DROP POLICY IF EXISTS cs_cx_visits_edit ON public.cs_cx_visits;
DROP POLICY IF EXISTS cs_cx_visits_delete ON public.cs_cx_visits;
CREATE POLICY cs_cx_visits_read ON public.cs_cx_visits FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_owned('cs_cx_visitas', created_by));
CREATE POLICY cs_cx_visits_create ON public.cs_cx_visits FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_visitas', 'create') AND created_by = auth.uid());
CREATE POLICY cs_cx_visits_edit ON public.cs_cx_visits FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_visitas', 'edit', created_by))
  WITH CHECK (public.cs_cx_can_manage_owned('cs_cx_visitas', 'edit', created_by));
CREATE POLICY cs_cx_visits_delete ON public.cs_cx_visits FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_visitas', 'delete', created_by));

DROP POLICY IF EXISTS cs_cx_nps_questionnaires_read ON public.cs_cx_nps_questionnaires;
DROP POLICY IF EXISTS cs_cx_nps_questionnaires_create ON public.cs_cx_nps_questionnaires;
DROP POLICY IF EXISTS cs_cx_nps_questionnaires_edit ON public.cs_cx_nps_questionnaires;
DROP POLICY IF EXISTS cs_cx_nps_questionnaires_delete ON public.cs_cx_nps_questionnaires;
CREATE POLICY cs_cx_nps_questionnaires_read ON public.cs_cx_nps_questionnaires FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_owned('cs_cx_nps', created_by));
CREATE POLICY cs_cx_nps_questionnaires_create ON public.cs_cx_nps_questionnaires FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_nps', 'create') AND created_by = auth.uid());
CREATE POLICY cs_cx_nps_questionnaires_edit ON public.cs_cx_nps_questionnaires FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_nps', 'edit', created_by))
  WITH CHECK (public.cs_cx_can_manage_owned('cs_cx_nps', 'edit', created_by));
CREATE POLICY cs_cx_nps_questionnaires_delete ON public.cs_cx_nps_questionnaires FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_nps', 'delete', created_by));

DROP POLICY IF EXISTS cs_cx_nps_invitations_read ON public.cs_cx_nps_invitations;
DROP POLICY IF EXISTS cs_cx_nps_invitations_create ON public.cs_cx_nps_invitations;
DROP POLICY IF EXISTS cs_cx_nps_invitations_edit ON public.cs_cx_nps_invitations;
DROP POLICY IF EXISTS cs_cx_nps_invitations_delete ON public.cs_cx_nps_invitations;
CREATE POLICY cs_cx_nps_invitations_read ON public.cs_cx_nps_invitations FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_owned('cs_cx_nps', created_by));
CREATE POLICY cs_cx_nps_invitations_create ON public.cs_cx_nps_invitations FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_nps', 'create') AND created_by = auth.uid());
CREATE POLICY cs_cx_nps_invitations_edit ON public.cs_cx_nps_invitations FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_nps', 'edit', created_by))
  WITH CHECK (public.cs_cx_can_manage_owned('cs_cx_nps', 'edit', created_by));
CREATE POLICY cs_cx_nps_invitations_delete ON public.cs_cx_nps_invitations FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_nps', 'delete', created_by));

DROP POLICY IF EXISTS cs_cx_nps_responses_read ON public.cs_cx_nps_responses;
DROP POLICY IF EXISTS cs_cx_nps_responses_delete ON public.cs_cx_nps_responses;
CREATE POLICY cs_cx_nps_responses_read ON public.cs_cx_nps_responses FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_owned('cs_cx_nps', owner_profile_id));
CREATE POLICY cs_cx_nps_responses_delete ON public.cs_cx_nps_responses FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_nps', 'delete', owner_profile_id));

DROP POLICY IF EXISTS cs_cx_nps_history_read ON public.cs_cx_nps_history;
DROP POLICY IF EXISTS cs_cx_nps_history_write ON public.cs_cx_nps_history;
CREATE POLICY cs_cx_nps_history_read ON public.cs_cx_nps_history FOR SELECT TO authenticated
  USING (public.cs_cx_can_view_owned('cs_cx_nps', generated_by));
CREATE POLICY cs_cx_nps_history_write ON public.cs_cx_nps_history FOR ALL TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_nps', 'edit', generated_by))
  WITH CHECK (public.cs_cx_can_manage_owned('cs_cx_nps', 'edit', generated_by));

-- Entidades dependentes herdam o proprietário do lançamento principal.
DROP POLICY IF EXISTS cs_cx_registry_office_products_read ON public.cs_cx_registry_office_products;
DROP POLICY IF EXISTS cs_cx_registry_office_products_manage ON public.cs_cx_registry_office_products;
CREATE POLICY cs_cx_registry_office_products_read ON public.cs_cx_registry_office_products FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_registry_offices office
    WHERE office.id = registry_office_id
  ));
CREATE POLICY cs_cx_registry_office_products_manage ON public.cs_cx_registry_office_products FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_registry_offices office
    WHERE office.id = registry_office_id
      AND public.cs_cx_can_manage_owned('cs_cx_cartorios', 'edit', office.created_by)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_registry_offices office
    WHERE office.id = registry_office_id
      AND public.cs_cx_can_manage_owned('cs_cx_cartorios', 'edit', office.created_by)
  ));

DROP POLICY IF EXISTS cs_cx_office_product_responsibles_read ON public.cs_cx_registry_office_product_responsibles;
DROP POLICY IF EXISTS cs_cx_office_product_responsibles_create ON public.cs_cx_registry_office_product_responsibles;
DROP POLICY IF EXISTS cs_cx_office_product_responsibles_edit ON public.cs_cx_registry_office_product_responsibles;
DROP POLICY IF EXISTS cs_cx_office_product_responsibles_delete ON public.cs_cx_registry_office_product_responsibles;
CREATE POLICY cs_cx_office_product_responsibles_read ON public.cs_cx_registry_office_product_responsibles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.cs_cx_registry_office_products link
    JOIN public.cs_cx_registry_offices office ON office.id = link.registry_office_id
    WHERE link.id = registry_office_product_id
  ));
CREATE POLICY cs_cx_office_product_responsibles_create ON public.cs_cx_registry_office_product_responsibles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.cs_cx_registry_office_products link
    JOIN public.cs_cx_registry_offices office ON office.id = link.registry_office_id
    WHERE link.id = registry_office_product_id
      AND public.cs_cx_can_manage_owned('cs_cx_cartorios', 'edit', office.created_by)
  ));
CREATE POLICY cs_cx_office_product_responsibles_edit ON public.cs_cx_registry_office_product_responsibles FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.cs_cx_registry_office_products link
    JOIN public.cs_cx_registry_offices office ON office.id = link.registry_office_id
    WHERE link.id = registry_office_product_id
      AND public.cs_cx_can_manage_owned('cs_cx_cartorios', 'edit', office.created_by)
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.cs_cx_registry_office_products link
    JOIN public.cs_cx_registry_offices office ON office.id = link.registry_office_id
    WHERE link.id = registry_office_product_id
      AND public.cs_cx_can_manage_owned('cs_cx_cartorios', 'edit', office.created_by)
  ));
CREATE POLICY cs_cx_office_product_responsibles_delete ON public.cs_cx_registry_office_product_responsibles FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.cs_cx_registry_office_products link
    JOIN public.cs_cx_registry_offices office ON office.id = link.registry_office_id
    WHERE link.id = registry_office_product_id
      AND public.cs_cx_can_manage_owned('cs_cx_cartorios', 'edit', office.created_by)
  ));

DROP POLICY IF EXISTS cs_cx_contact_products_read ON public.cs_cx_contact_products;
DROP POLICY IF EXISTS cs_cx_contact_products_create ON public.cs_cx_contact_products;
DROP POLICY IF EXISTS cs_cx_contact_products_edit ON public.cs_cx_contact_products;
DROP POLICY IF EXISTS cs_cx_contact_products_delete ON public.cs_cx_contact_products;
CREATE POLICY cs_cx_contact_products_read ON public.cs_cx_contact_products FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cs_cx_contacts contact WHERE contact.id = contact_id));
CREATE POLICY cs_cx_contact_products_create ON public.cs_cx_contact_products FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_contacts contact
    WHERE contact.id = contact_id
      AND (
        public.cs_cx_can_manage_owned('cs_cx_contatos', 'edit', contact.author_profile_id)
        OR (public.has_permission(auth.uid(), 'cs_cx_contatos', 'create') AND contact.author_profile_id = auth.uid())
      )
  ));
CREATE POLICY cs_cx_contact_products_edit ON public.cs_cx_contact_products FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_contacts contact
    WHERE contact.id = contact_id
      AND public.cs_cx_can_manage_owned('cs_cx_contatos', 'edit', contact.author_profile_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_contacts contact
    WHERE contact.id = contact_id
      AND public.cs_cx_can_manage_owned('cs_cx_contatos', 'edit', contact.author_profile_id)
  ));
CREATE POLICY cs_cx_contact_products_delete ON public.cs_cx_contact_products FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_contacts contact
    WHERE contact.id = contact_id
      AND public.cs_cx_can_manage_owned('cs_cx_contatos', 'edit', contact.author_profile_id)
  ));

DROP POLICY IF EXISTS cs_cx_request_attachments_read ON public.cs_cx_request_attachments;
DROP POLICY IF EXISTS cs_cx_request_attachments_manage ON public.cs_cx_request_attachments;
CREATE POLICY cs_cx_request_attachments_read ON public.cs_cx_request_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cs_cx_requests request WHERE request.id = request_id));
CREATE POLICY cs_cx_request_attachments_manage ON public.cs_cx_request_attachments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_requests request
    WHERE request.id = request_id
      AND public.cs_cx_can_manage_owned('cs_cx_registros', 'edit', request.author_profile_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_requests request
    WHERE request.id = request_id
      AND public.cs_cx_can_manage_owned('cs_cx_registros', 'edit', request.author_profile_id)
  ));

DROP POLICY IF EXISTS cs_cx_request_updates_read ON public.cs_cx_request_updates;
DROP POLICY IF EXISTS cs_cx_request_updates_create ON public.cs_cx_request_updates;
DROP POLICY IF EXISTS cs_cx_request_updates_edit ON public.cs_cx_request_updates;
DROP POLICY IF EXISTS cs_cx_request_updates_delete ON public.cs_cx_request_updates;
CREATE POLICY cs_cx_request_updates_read ON public.cs_cx_request_updates FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.cs_cx_requests request WHERE request.id = request_id)
    AND public.cs_cx_can_view_owned('cs_cx_registros', author_profile_id)
  );
CREATE POLICY cs_cx_request_updates_create ON public.cs_cx_request_updates FOR INSERT TO authenticated
  WITH CHECK (
    author_profile_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.cs_cx_requests request WHERE request.id = request_id)
    AND (
      public.has_permission(auth.uid(), 'cs_cx_registros', 'create')
      OR public.has_permission(auth.uid(), 'cs_cx_registros', 'edit')
    )
  );
CREATE POLICY cs_cx_request_updates_edit ON public.cs_cx_request_updates FOR UPDATE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_registros', 'edit', author_profile_id))
  WITH CHECK (public.cs_cx_can_manage_owned('cs_cx_registros', 'edit', author_profile_id));
CREATE POLICY cs_cx_request_updates_delete ON public.cs_cx_request_updates FOR DELETE TO authenticated
  USING (public.cs_cx_can_manage_owned('cs_cx_registros', 'delete', author_profile_id));

DROP POLICY IF EXISTS cs_cx_office_routine_items_read ON public.cs_cx_office_routine_items;
DROP POLICY IF EXISTS cs_cx_office_routine_items_create ON public.cs_cx_office_routine_items;
DROP POLICY IF EXISTS cs_cx_office_routine_items_edit ON public.cs_cx_office_routine_items;
DROP POLICY IF EXISTS cs_cx_office_routine_items_delete ON public.cs_cx_office_routine_items;
DROP POLICY IF EXISTS cs_cx_office_routine_items_reports_read ON public.cs_cx_office_routine_items;
CREATE POLICY cs_cx_office_routine_items_read ON public.cs_cx_office_routine_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cs_cx_office_routines routine WHERE routine.id = office_routine_id));
CREATE POLICY cs_cx_office_routine_items_create ON public.cs_cx_office_routine_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_office_routines routine
    WHERE routine.id = office_routine_id
      AND (
        public.cs_cx_can_manage_owned('cs_cx_rotinas', 'edit', routine.applied_by)
        OR (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'create') AND routine.applied_by = auth.uid())
      )
  ));
CREATE POLICY cs_cx_office_routine_items_edit ON public.cs_cx_office_routine_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_office_routines routine
    WHERE routine.id = office_routine_id
      AND public.cs_cx_can_manage_owned('cs_cx_rotinas', 'edit', routine.applied_by)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_office_routines routine
    WHERE routine.id = office_routine_id
      AND public.cs_cx_can_manage_owned('cs_cx_rotinas', 'edit', routine.applied_by)
  ));
CREATE POLICY cs_cx_office_routine_items_delete ON public.cs_cx_office_routine_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_office_routines routine
    WHERE routine.id = office_routine_id
      AND public.cs_cx_can_manage_owned('cs_cx_rotinas', 'delete', routine.applied_by)
  ));
CREATE POLICY cs_cx_office_routine_items_reports_read ON public.cs_cx_office_routine_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_office_routines routine
    WHERE routine.id = office_routine_id
      AND public.cs_cx_can_report_owned(routine.applied_by)
  ));

DROP POLICY IF EXISTS cs_cx_routine_history_read ON public.cs_cx_routine_history;
DROP POLICY IF EXISTS cs_cx_routine_history_create ON public.cs_cx_routine_history;
DROP POLICY IF EXISTS cs_cx_routine_history_reports_read ON public.cs_cx_routine_history;
CREATE POLICY cs_cx_routine_history_read ON public.cs_cx_routine_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cs_cx_office_routines routine WHERE routine.id = office_routine_id));
CREATE POLICY cs_cx_routine_history_create ON public.cs_cx_routine_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_office_routines routine
    WHERE routine.id = office_routine_id
      AND (
        public.cs_cx_can_manage_owned('cs_cx_rotinas', 'edit', routine.applied_by)
        OR (public.has_permission(auth.uid(), 'cs_cx_rotinas', 'create') AND routine.applied_by = auth.uid())
      )
  ));
CREATE POLICY cs_cx_routine_history_reports_read ON public.cs_cx_routine_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_office_routines routine
    WHERE routine.id = office_routine_id
      AND public.cs_cx_can_report_owned(routine.applied_by)
  ));

DROP POLICY IF EXISTS cs_cx_visit_checklist_read ON public.cs_cx_visit_checklist_items;
DROP POLICY IF EXISTS cs_cx_visit_checklist_edit ON public.cs_cx_visit_checklist_items;
DROP POLICY IF EXISTS cs_cx_visit_checklist_update ON public.cs_cx_visit_checklist_items;
DROP POLICY IF EXISTS cs_cx_visit_checklist_delete ON public.cs_cx_visit_checklist_items;
CREATE POLICY cs_cx_visit_checklist_read ON public.cs_cx_visit_checklist_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cs_cx_visits visit WHERE visit.id = visit_id));
CREATE POLICY cs_cx_visit_checklist_edit ON public.cs_cx_visit_checklist_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_visits visit
    WHERE visit.id = visit_id
      AND public.cs_cx_can_manage_owned('cs_cx_visitas', 'edit', visit.created_by)
  ));
CREATE POLICY cs_cx_visit_checklist_update ON public.cs_cx_visit_checklist_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_visits visit
    WHERE visit.id = visit_id
      AND public.cs_cx_can_manage_owned('cs_cx_visitas', 'edit', visit.created_by)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_visits visit
    WHERE visit.id = visit_id
      AND public.cs_cx_can_manage_owned('cs_cx_visitas', 'edit', visit.created_by)
  ));
CREATE POLICY cs_cx_visit_checklist_delete ON public.cs_cx_visit_checklist_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_visits visit
    WHERE visit.id = visit_id
      AND public.cs_cx_can_manage_owned('cs_cx_visitas', 'delete', visit.created_by)
  ));

DROP POLICY IF EXISTS cs_cx_visit_pending_read ON public.cs_cx_visit_pending_items;
DROP POLICY IF EXISTS cs_cx_visit_pending_edit ON public.cs_cx_visit_pending_items;
DROP POLICY IF EXISTS cs_cx_visit_pending_update ON public.cs_cx_visit_pending_items;
DROP POLICY IF EXISTS cs_cx_visit_pending_delete ON public.cs_cx_visit_pending_items;
CREATE POLICY cs_cx_visit_pending_read ON public.cs_cx_visit_pending_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cs_cx_visits visit WHERE visit.id = visit_id));
CREATE POLICY cs_cx_visit_pending_edit ON public.cs_cx_visit_pending_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_visits visit
    WHERE visit.id = visit_id
      AND public.cs_cx_can_manage_owned('cs_cx_visitas', 'edit', visit.created_by)
  ));
CREATE POLICY cs_cx_visit_pending_update ON public.cs_cx_visit_pending_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_visits visit
    WHERE visit.id = visit_id
      AND public.cs_cx_can_manage_owned('cs_cx_visitas', 'edit', visit.created_by)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_visits visit
    WHERE visit.id = visit_id
      AND public.cs_cx_can_manage_owned('cs_cx_visitas', 'edit', visit.created_by)
  ));
CREATE POLICY cs_cx_visit_pending_delete ON public.cs_cx_visit_pending_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_visits visit
    WHERE visit.id = visit_id
      AND public.cs_cx_can_manage_owned('cs_cx_visitas', 'delete', visit.created_by)
  ));

DROP POLICY IF EXISTS cs_cx_visit_attachments_read ON public.cs_cx_visit_attachments;
DROP POLICY IF EXISTS cs_cx_visit_attachments_edit ON public.cs_cx_visit_attachments;
DROP POLICY IF EXISTS cs_cx_visit_attachments_update ON public.cs_cx_visit_attachments;
DROP POLICY IF EXISTS cs_cx_visit_attachments_delete ON public.cs_cx_visit_attachments;
CREATE POLICY cs_cx_visit_attachments_read ON public.cs_cx_visit_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cs_cx_visits visit WHERE visit.id = visit_id));
CREATE POLICY cs_cx_visit_attachments_edit ON public.cs_cx_visit_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_visits visit
    WHERE visit.id = visit_id
      AND public.cs_cx_can_manage_owned('cs_cx_visitas', 'edit', visit.created_by)
  ));
CREATE POLICY cs_cx_visit_attachments_update ON public.cs_cx_visit_attachments FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_visits visit
    WHERE visit.id = visit_id
      AND public.cs_cx_can_manage_owned('cs_cx_visitas', 'edit', visit.created_by)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cs_cx_visits visit
    WHERE visit.id = visit_id
      AND public.cs_cx_can_manage_owned('cs_cx_visitas', 'edit', visit.created_by)
  ));
CREATE POLICY cs_cx_visit_attachments_delete ON public.cs_cx_visit_attachments FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cs_cx_visits visit
    WHERE visit.id = visit_id
      AND public.cs_cx_can_manage_owned('cs_cx_visitas', 'delete', visit.created_by)
  ));

DROP POLICY IF EXISTS cs_cx_storage_read ON storage.objects;
DROP POLICY IF EXISTS cs_cx_storage_insert ON storage.objects;
DROP POLICY IF EXISTS cs_cx_storage_update ON storage.objects;
DROP POLICY IF EXISTS cs_cx_storage_delete ON storage.objects;
CREATE POLICY cs_cx_storage_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cs-cx-attachments'
    AND (
      (name LIKE 'requests/%' AND public.has_permission(auth.uid(), 'cs_cx_registros', 'view') AND (owner_id = auth.uid()::text OR public.has_permission(auth.uid(), 'cs_cx_registros', 'view_others')))
      OR (name LIKE 'visits/%' AND public.has_permission(auth.uid(), 'cs_cx_visitas', 'view') AND (owner_id = auth.uid()::text OR public.has_permission(auth.uid(), 'cs_cx_visitas', 'view_others')))
    )
  );
CREATE POLICY cs_cx_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cs-cx-attachments'
    AND owner_id = auth.uid()::text
    AND (
      (name LIKE 'requests/%' AND public.has_permission(auth.uid(), 'cs_cx_registros', 'create'))
      OR (name LIKE 'visits/%' AND public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'))
    )
  );
CREATE POLICY cs_cx_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cs-cx-attachments'
    AND (
      (name LIKE 'requests/%' AND public.has_permission(auth.uid(), 'cs_cx_registros', 'edit') AND (owner_id = auth.uid()::text OR public.has_permission(auth.uid(), 'cs_cx_registros', 'manage_others')))
      OR (name LIKE 'visits/%' AND public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit') AND (owner_id = auth.uid()::text OR public.has_permission(auth.uid(), 'cs_cx_visitas', 'manage_others')))
    )
  )
  WITH CHECK (bucket_id = 'cs-cx-attachments');
CREATE POLICY cs_cx_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cs-cx-attachments'
    AND (
      (name LIKE 'requests/%' AND public.has_permission(auth.uid(), 'cs_cx_registros', 'delete') AND (owner_id = auth.uid()::text OR public.has_permission(auth.uid(), 'cs_cx_registros', 'manage_others')))
      OR (name LIKE 'visits/%' AND public.has_permission(auth.uid(), 'cs_cx_visitas', 'delete') AND (owner_id = auth.uid()::text OR public.has_permission(auth.uid(), 'cs_cx_visitas', 'manage_others')))
    )
  );

COMMENT ON FUNCTION public.cs_cx_can_view_owned(TEXT, UUID) IS
  'Valida visualização de um lançamento próprio ou de terceiros no CS/CX.';
COMMENT ON FUNCTION public.cs_cx_can_manage_owned(TEXT, TEXT, UUID) IS
  'Valida edição/exclusão de um lançamento próprio ou de terceiros no CS/CX.';

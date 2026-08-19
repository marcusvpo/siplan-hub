-- Dominio central do modulo CS/CX: cartorios, produtos, solicitacoes e contatos.
-- UUIDs sao usados no HUB; legacy_id garante rastreabilidade e upsert idempotente.

CREATE TABLE IF NOT EXISTS public.cs_cx_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT NOT NULL UNIQUE,
  product_code TEXT UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ,
  source_hash TEXT NOT NULL,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cs_cx_registry_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sap_code TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  analysis_at TIMESTAMPTZ,
  analysis_notes TEXT,
  notes TEXT,
  contact_details TEXT,
  legacy_analyst_user_id BIGINT,
  analyst_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_hash TEXT NOT NULL,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cs_cx_registry_office_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT NOT NULL UNIQUE,
  registry_office_id UUID NOT NULL REFERENCES public.cs_cx_registry_offices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.cs_cx_products(id) ON DELETE RESTRICT,
  implementation_date DATE,
  created_at TIMESTAMPTZ,
  source_hash TEXT NOT NULL,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (registry_office_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.cs_cx_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT NOT NULL UNIQUE,
  ticket_number TEXT,
  description TEXT,
  module TEXT,
  requester TEXT,
  responsible TEXT,
  requested_on DATE,
  expected_delivery_on DATE,
  delivered_on DATE,
  status TEXT,
  notes TEXT,
  registry_office_id UUID NOT NULL REFERENCES public.cs_cx_registry_offices(id) ON DELETE RESTRICT,
  legacy_user_id BIGINT,
  author_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  source_hash TEXT NOT NULL,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cs_cx_request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT NOT NULL UNIQUE,
  request_id UUID NOT NULL REFERENCES public.cs_cx_requests(id) ON DELETE CASCADE,
  stored_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  storage_path TEXT,
  legacy_user_id BIGINT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ,
  source_hash TEXT NOT NULL,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cs_cx_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT NOT NULL UNIQUE,
  contact_date DATE NOT NULL,
  notes TEXT,
  pending_items TEXT,
  product_id UUID NOT NULL REFERENCES public.cs_cx_products(id) ON DELETE RESTRICT,
  contact_person TEXT NOT NULL,
  contact_details TEXT,
  registry_office_id UUID NOT NULL REFERENCES public.cs_cx_registry_offices(id) ON DELETE RESTRICT,
  ticket_number TEXT,
  legacy_user_id BIGINT,
  author_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  source_hash TEXT NOT NULL,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cs_cx_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  legacy_id BIGINT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  legacy_entity_id BIGINT,
  old_data JSONB,
  new_data JSONB,
  legacy_user_id BIGINT,
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  source_hash TEXT NOT NULL,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_table, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_cs_cx_registry_offices_name ON public.cs_cx_registry_offices(name);
CREATE INDEX IF NOT EXISTS idx_cs_cx_requests_office ON public.cs_cx_requests(registry_office_id);
CREATE INDEX IF NOT EXISTS idx_cs_cx_requests_status ON public.cs_cx_requests(status);
CREATE INDEX IF NOT EXISTS idx_cs_cx_requests_dates ON public.cs_cx_requests(requested_on, expected_delivery_on);
CREATE INDEX IF NOT EXISTS idx_cs_cx_contacts_office_date ON public.cs_cx_contacts(registry_office_id, contact_date DESC);
CREATE INDEX IF NOT EXISTS idx_cs_cx_audit_entity ON public.cs_cx_audit_logs(entity_type, legacy_entity_id);

ALTER TABLE public.cs_cx_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_registry_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_registry_office_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_cx_products_read ON public.cs_cx_products FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_cartorios', 'view'));
CREATE POLICY cs_cx_products_manage ON public.cs_cx_products FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'));

CREATE POLICY cs_cx_registry_offices_read ON public.cs_cx_registry_offices FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_cartorios', 'view'));
CREATE POLICY cs_cx_registry_offices_create ON public.cs_cx_registry_offices FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_cartorios', 'create'));
CREATE POLICY cs_cx_registry_offices_edit ON public.cs_cx_registry_offices FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_cartorios', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_cartorios', 'edit'));
CREATE POLICY cs_cx_registry_offices_delete ON public.cs_cx_registry_offices FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_cartorios', 'delete'));

CREATE POLICY cs_cx_registry_office_products_read ON public.cs_cx_registry_office_products FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_cartorios', 'view'));
CREATE POLICY cs_cx_registry_office_products_manage ON public.cs_cx_registry_office_products FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_cartorios', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_cartorios', 'edit'));

CREATE POLICY cs_cx_requests_read ON public.cs_cx_requests FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_registros', 'view'));
CREATE POLICY cs_cx_requests_create ON public.cs_cx_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_registros', 'create'));
CREATE POLICY cs_cx_requests_edit ON public.cs_cx_requests FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_registros', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_registros', 'edit'));
CREATE POLICY cs_cx_requests_delete ON public.cs_cx_requests FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_registros', 'delete'));

CREATE POLICY cs_cx_request_attachments_read ON public.cs_cx_request_attachments FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_registros', 'view'));
CREATE POLICY cs_cx_request_attachments_manage ON public.cs_cx_request_attachments FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_registros', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_registros', 'edit'));

CREATE POLICY cs_cx_contacts_read ON public.cs_cx_contacts FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_contatos', 'view'));
CREATE POLICY cs_cx_contacts_create ON public.cs_cx_contacts FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_contatos', 'create'));
CREATE POLICY cs_cx_contacts_edit ON public.cs_cx_contacts FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_contatos', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_contatos', 'edit'));
CREATE POLICY cs_cx_contacts_delete ON public.cs_cx_contacts FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_contatos', 'delete'));

CREATE POLICY cs_cx_audit_logs_read ON public.cs_cx_audit_logs FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_reports', 'view'));

DROP TRIGGER IF EXISTS update_cs_cx_registry_offices_updated_at ON public.cs_cx_registry_offices;
CREATE TRIGGER update_cs_cx_registry_offices_updated_at BEFORE UPDATE ON public.cs_cx_registry_offices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('cs-cx-attachments', 'cs-cx-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY cs_cx_storage_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cs-cx-attachments'
    AND public.has_permission(auth.uid(), 'cs_cx_registros', 'view')
  );
CREATE POLICY cs_cx_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cs-cx-attachments'
    AND public.has_permission(auth.uid(), 'cs_cx_registros', 'create')
  );
CREATE POLICY cs_cx_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cs-cx-attachments'
    AND public.has_permission(auth.uid(), 'cs_cx_registros', 'edit')
  )
  WITH CHECK (
    bucket_id = 'cs-cx-attachments'
    AND public.has_permission(auth.uid(), 'cs_cx_registros', 'edit')
  );
CREATE POLICY cs_cx_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cs-cx-attachments'
    AND public.has_permission(auth.uid(), 'cs_cx_registros', 'delete')
  );

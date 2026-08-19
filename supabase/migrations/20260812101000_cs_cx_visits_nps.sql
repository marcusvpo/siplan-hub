-- Visitas e NPS do módulo CS/CX.

ALTER TABLE public.cs_cx_audit_logs ADD COLUMN IF NOT EXISTS import_details TEXT;

CREATE TABLE public.cs_cx_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  registry_office_id UUID NOT NULL REFERENCES public.cs_cx_registry_offices(id) ON DELETE CASCADE,
  legacy_visitor_user_id BIGINT,
  visitor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'emandamento', 'concluido', 'reaberto')),
  objective TEXT NOT NULL,
  general_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cs_cx_visit_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  visit_id UUID NOT NULL REFERENCES public.cs_cx_visits(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  checked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cs_cx_visit_pending_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  visit_id UUID NOT NULL REFERENCES public.cs_cx_visits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'media'
    CHECK (priority IN ('baixa', 'media', 'alta', 'critica')),
  category TEXT,
  notes TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'emandamento', 'resolvida')),
  request_id UUID REFERENCES public.cs_cx_requests(id) ON DELETE SET NULL,
  legacy_request_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cs_cx_visit_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  visit_id UUID NOT NULL REFERENCES public.cs_cx_visits(id) ON DELETE CASCADE,
  stored_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  description TEXT,
  storage_path TEXT,
  legacy_user_id BIGINT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cs_cx_nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  registry_office_id UUID NOT NULL REFERENCES public.cs_cx_registry_offices(id) ON DELETE CASCADE,
  legacy_user_id BIGINT,
  author_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ NOT NULL,
  respondent_name TEXT NOT NULL,
  respondent_office TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
  score_reason TEXT,
  improvement_suggestion TEXT,
  classification TEXT NOT NULL CHECK (classification IN ('PROMOTOR', 'NEUTRO', 'DETRATOR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cs_cx_nps_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  registry_office_id UUID NOT NULL REFERENCES public.cs_cx_registry_offices(id) ON DELETE CASCADE,
  legacy_user_id BIGINT,
  generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_responses INTEGER NOT NULL DEFAULT 0,
  total_promoters INTEGER NOT NULL DEFAULT 0,
  total_neutrals INTEGER NOT NULL DEFAULT 0,
  total_detractors INTEGER NOT NULL DEFAULT 0,
  promoter_percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
  detractor_percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
  nps_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

CREATE INDEX idx_cs_cx_visits_date ON public.cs_cx_visits(visit_date DESC);
CREATE INDEX idx_cs_cx_visits_office ON public.cs_cx_visits(registry_office_id);
CREATE INDEX idx_cs_cx_visit_checklist_visit ON public.cs_cx_visit_checklist_items(visit_id, sort_order);
CREATE INDEX idx_cs_cx_visit_pending_visit ON public.cs_cx_visit_pending_items(visit_id, status);
CREATE INDEX idx_cs_cx_visit_attachments_visit ON public.cs_cx_visit_attachments(visit_id);
CREATE INDEX idx_cs_cx_nps_responses_office_date ON public.cs_cx_nps_responses(registry_office_id, responded_at DESC);
CREATE INDEX idx_cs_cx_nps_responses_classification ON public.cs_cx_nps_responses(classification);
CREATE INDEX idx_cs_cx_nps_history_office_period ON public.cs_cx_nps_history(registry_office_id, period_end DESC);

ALTER TABLE public.cs_cx_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_visit_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_visit_pending_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_visit_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_nps_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_cx_visits_read ON public.cs_cx_visits FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'view'));
CREATE POLICY cs_cx_visits_create ON public.cs_cx_visits FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_visitas', 'create'));
CREATE POLICY cs_cx_visits_edit ON public.cs_cx_visits FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'));
CREATE POLICY cs_cx_visits_delete ON public.cs_cx_visits FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'delete'));

CREATE POLICY cs_cx_visit_checklist_read ON public.cs_cx_visit_checklist_items FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'view'));
CREATE POLICY cs_cx_visit_checklist_write ON public.cs_cx_visit_checklist_items FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'));
CREATE POLICY cs_cx_visit_pending_read ON public.cs_cx_visit_pending_items FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'view'));
CREATE POLICY cs_cx_visit_pending_write ON public.cs_cx_visit_pending_items FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'));
CREATE POLICY cs_cx_visit_attachments_read ON public.cs_cx_visit_attachments FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'view'));
CREATE POLICY cs_cx_visit_attachments_write ON public.cs_cx_visit_attachments FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'));

CREATE POLICY cs_cx_nps_responses_read ON public.cs_cx_nps_responses FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_nps', 'view'));
CREATE POLICY cs_cx_nps_responses_create ON public.cs_cx_nps_responses FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_nps', 'create'));
CREATE POLICY cs_cx_nps_responses_edit ON public.cs_cx_nps_responses FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_nps', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_nps', 'edit'));
CREATE POLICY cs_cx_nps_responses_delete ON public.cs_cx_nps_responses FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_nps', 'delete'));
CREATE POLICY cs_cx_nps_history_read ON public.cs_cx_nps_history FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_nps', 'view'));
CREATE POLICY cs_cx_nps_history_write ON public.cs_cx_nps_history FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_nps', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_nps', 'edit'));

CREATE OR REPLACE FUNCTION public.cs_cx_classify_nps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.classification = CASE
    WHEN NEW.score >= 9 THEN 'PROMOTOR'
    WHEN NEW.score >= 7 THEN 'NEUTRO'
    ELSE 'DETRATOR'
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER classify_cs_cx_nps BEFORE INSERT OR UPDATE OF score ON public.cs_cx_nps_responses
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_classify_nps();
CREATE TRIGGER update_cs_cx_visits_updated_at BEFORE UPDATE ON public.cs_cx_visits
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_update_updated_at();
CREATE TRIGGER update_cs_cx_visit_pending_updated_at BEFORE UPDATE ON public.cs_cx_visit_pending_items
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_update_updated_at();
CREATE TRIGGER update_cs_cx_nps_responses_updated_at BEFORE UPDATE ON public.cs_cx_nps_responses
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_update_updated_at();
CREATE TRIGGER update_cs_cx_nps_history_updated_at BEFORE UPDATE ON public.cs_cx_nps_history
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_update_updated_at();

CREATE TRIGGER audit_cs_cx_visits AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_visits
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('visita');
CREATE TRIGGER audit_cs_cx_nps_responses AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_nps_responses
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('resposta_nps');

CREATE POLICY cs_cx_visit_storage_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cs-cx-attachments' AND public.has_permission(auth.uid(), 'cs_cx_visitas', 'view'));
CREATE POLICY cs_cx_visit_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cs-cx-attachments' AND public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'));
CREATE POLICY cs_cx_visit_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cs-cx-attachments' AND public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'))
  WITH CHECK (bucket_id = 'cs-cx-attachments' AND public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'));
CREATE POLICY cs_cx_visit_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cs-cx-attachments' AND public.has_permission(auth.uid(), 'cs_cx_visitas', 'delete'));

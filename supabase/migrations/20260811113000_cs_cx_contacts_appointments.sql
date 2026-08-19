-- Agendamentos e auditoria nativa dos fluxos operacionais CS/CX.

CREATE TABLE IF NOT EXISTS public.cs_cx_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  appointment_type TEXT NOT NULL DEFAULT 'REUNIAO'
    CHECK (appointment_type IN ('REUNIAO', 'CALL', 'VISITA', 'OUTRO')),
  status TEXT NOT NULL DEFAULT 'AGENDADO'
    CHECK (status IN ('AGENDADO', 'REALIZADO', 'CANCELADO', 'REMARCADO', 'CONCLUIDO')),
  registry_office_id UUID REFERENCES public.cs_cx_registry_offices(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.cs_cx_contacts(id) ON DELETE SET NULL,
  legacy_responsible_user_id BIGINT,
  responsible_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  legacy_creator_user_id BIGINT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT,
  location TEXT,
  notes TEXT,
  result TEXT,
  realized_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  source_hash TEXT,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_cx_appointments_starts_at
  ON public.cs_cx_appointments(starts_at);
CREATE INDEX IF NOT EXISTS idx_cs_cx_appointments_status
  ON public.cs_cx_appointments(status);
CREATE INDEX IF NOT EXISTS idx_cs_cx_appointments_office
  ON public.cs_cx_appointments(registry_office_id);
CREATE INDEX IF NOT EXISTS idx_cs_cx_appointments_responsible
  ON public.cs_cx_appointments(responsible_profile_id);

ALTER TABLE public.cs_cx_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_cx_appointments_read ON public.cs_cx_appointments
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_agendamentos', 'view'));
CREATE POLICY cs_cx_appointments_create ON public.cs_cx_appointments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_agendamentos', 'create'));
CREATE POLICY cs_cx_appointments_edit ON public.cs_cx_appointments
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_agendamentos', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_agendamentos', 'edit'));
CREATE POLICY cs_cx_appointments_delete ON public.cs_cx_appointments
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_agendamentos', 'delete'));

CREATE OR REPLACE FUNCTION public.cs_cx_update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Conexoes de migracao nao carregam JWT; nesse caso, preserve o timestamp legado.
  IF auth.uid() IS NOT NULL THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_cs_cx_registry_offices_updated_at ON public.cs_cx_registry_offices;
CREATE TRIGGER update_cs_cx_registry_offices_updated_at
  BEFORE UPDATE ON public.cs_cx_registry_offices
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_update_updated_at();

DROP TRIGGER IF EXISTS update_cs_cx_contacts_updated_at ON public.cs_cx_contacts;
CREATE TRIGGER update_cs_cx_contacts_updated_at
  BEFORE UPDATE ON public.cs_cx_contacts
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_update_updated_at();

DROP TRIGGER IF EXISTS update_cs_cx_requests_updated_at ON public.cs_cx_requests;
CREATE TRIGGER update_cs_cx_requests_updated_at
  BEFORE UPDATE ON public.cs_cx_requests
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_update_updated_at();

DROP TRIGGER IF EXISTS update_cs_cx_appointments_updated_at ON public.cs_cx_appointments;
CREATE TRIGGER update_cs_cx_appointments_updated_at
  BEFORE UPDATE ON public.cs_cx_appointments
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_update_updated_at();

ALTER TABLE public.cs_cx_audit_logs
  ADD COLUMN IF NOT EXISTS entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_cs_cx_audit_native_entity
  ON public.cs_cx_audit_logs(source_table, entity_id);

CREATE OR REPLACE FUNCTION public.cs_cx_capture_native_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  record_id UUID;
BEGIN
  -- Cargas via conexao PostgreSQL nao possuem JWT e ja sao auditadas por run.
  IF auth.uid() IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    record_id := OLD.id;
  ELSE
    record_id := NEW.id;
  END IF;
  INSERT INTO public.cs_cx_audit_logs (
    source_table, action, entity_type, entity_id, old_data, new_data,
    actor_profile_id, occurred_at, origin, source_present
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    TG_ARGV[0],
    record_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    now(),
    'hub',
    true
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS audit_cs_cx_registry_offices ON public.cs_cx_registry_offices;
CREATE TRIGGER audit_cs_cx_registry_offices
  AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_registry_offices
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('cartorio');

DROP TRIGGER IF EXISTS audit_cs_cx_requests ON public.cs_cx_requests;
CREATE TRIGGER audit_cs_cx_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_requests
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('registro');

DROP TRIGGER IF EXISTS audit_cs_cx_contacts ON public.cs_cx_contacts;
CREATE TRIGGER audit_cs_cx_contacts
  AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_contacts
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('contato');

DROP TRIGGER IF EXISTS audit_cs_cx_appointments ON public.cs_cx_appointments;
CREATE TRIGGER audit_cs_cx_appointments
  AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_appointments
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('agendamento');

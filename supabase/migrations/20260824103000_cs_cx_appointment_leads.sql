-- Permite agendar compromissos com leads ainda sem cartório ou contato cadastrados.

ALTER TABLE public.cs_cx_appointments
  ADD COLUMN IF NOT EXISTS is_lead BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_office_name TEXT,
  ADD COLUMN IF NOT EXISTS lead_contact_name TEXT;

ALTER TABLE public.cs_cx_appointments
  DROP CONSTRAINT IF EXISTS cs_cx_appointments_lead_context_check;

ALTER TABLE public.cs_cx_appointments
  ADD CONSTRAINT cs_cx_appointments_lead_context_check CHECK (
    (
      is_lead
      AND registry_office_id IS NULL
      AND contact_id IS NULL
      AND NULLIF(trim(lead_office_name), '') IS NOT NULL
      AND NULLIF(trim(lead_contact_name), '') IS NOT NULL
    )
    OR
    (
      NOT is_lead
      AND lead_office_name IS NULL
      AND lead_contact_name IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_cs_cx_appointments_is_lead
  ON public.cs_cx_appointments(is_lead)
  WHERE is_lead;

COMMENT ON COLUMN public.cs_cx_appointments.is_lead IS
  'Indica compromisso com cliente potencial ainda não cadastrado.';
COMMENT ON COLUMN public.cs_cx_appointments.lead_office_name IS
  'Nome livre do cartório ou organização do lead.';
COMMENT ON COLUMN public.cs_cx_appointments.lead_contact_name IS
  'Nome livre da pessoa de contato do lead.';

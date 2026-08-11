-- Permite que o HUB crie dados novos sem fabricar IDs do sistema legado.

ALTER TABLE public.cs_cx_products
  ALTER COLUMN legacy_id DROP NOT NULL,
  ALTER COLUMN source_hash DROP NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'hub'
    CHECK (origin IN ('legacy', 'hub'));

ALTER TABLE public.cs_cx_registry_offices
  ALTER COLUMN legacy_id DROP NOT NULL,
  ALTER COLUMN source_hash DROP NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'hub'
    CHECK (origin IN ('legacy', 'hub'));

ALTER TABLE public.cs_cx_registry_office_products
  ALTER COLUMN legacy_id DROP NOT NULL,
  ALTER COLUMN source_hash DROP NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'hub'
    CHECK (origin IN ('legacy', 'hub'));

ALTER TABLE public.cs_cx_requests
  ALTER COLUMN legacy_id DROP NOT NULL,
  ALTER COLUMN source_hash DROP NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'hub'
    CHECK (origin IN ('legacy', 'hub'));

ALTER TABLE public.cs_cx_request_attachments
  ALTER COLUMN legacy_id DROP NOT NULL,
  ALTER COLUMN source_hash DROP NOT NULL,
  ALTER COLUMN uploaded_at SET DEFAULT now(),
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'hub'
    CHECK (origin IN ('legacy', 'hub'));

ALTER TABLE public.cs_cx_contacts
  ALTER COLUMN legacy_id DROP NOT NULL,
  ALTER COLUMN source_hash DROP NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'hub'
    CHECK (origin IN ('legacy', 'hub'));

ALTER TABLE public.cs_cx_audit_logs
  ALTER COLUMN legacy_id DROP NOT NULL,
  ALTER COLUMN source_hash DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'hub'
    CHECK (origin IN ('legacy', 'hub'));

-- Protege ambientes onde a carga inicial tenha sido executada entre migrations.
UPDATE public.cs_cx_products SET origin = 'legacy' WHERE legacy_id IS NOT NULL;
UPDATE public.cs_cx_registry_offices SET origin = 'legacy' WHERE legacy_id IS NOT NULL;
UPDATE public.cs_cx_registry_office_products SET origin = 'legacy' WHERE legacy_id IS NOT NULL;
UPDATE public.cs_cx_requests SET origin = 'legacy' WHERE legacy_id IS NOT NULL;
UPDATE public.cs_cx_request_attachments SET origin = 'legacy' WHERE legacy_id IS NOT NULL;
UPDATE public.cs_cx_contacts SET origin = 'legacy' WHERE legacy_id IS NOT NULL;
UPDATE public.cs_cx_audit_logs SET origin = 'legacy' WHERE legacy_id IS NOT NULL;

-- Salva cadastro e produtos de um cartorio de forma atomica.
CREATE OR REPLACE FUNCTION public.cs_cx_save_registry_office(
  p_id UUID,
  p_name TEXT,
  p_sap_code TEXT DEFAULT NULL,
  p_contact_details TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_active BOOLEAN DEFAULT true,
  p_products JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  IF p_id IS NULL THEN
    IF NOT public.has_permission(auth.uid(), 'cs_cx_cartorios', 'create') THEN
      RAISE EXCEPTION 'Sem permissao para criar cartorios';
    END IF;

    INSERT INTO public.cs_cx_registry_offices
      (name, sap_code, contact_details, notes, active, origin, source_present)
    VALUES
      (trim(p_name), NULLIF(trim(p_sap_code), ''), NULLIF(trim(p_contact_details), ''),
       NULLIF(trim(p_notes), ''), p_active, 'hub', true)
    RETURNING id INTO saved_id;
  ELSE
    IF NOT public.has_permission(auth.uid(), 'cs_cx_cartorios', 'edit') THEN
      RAISE EXCEPTION 'Sem permissao para editar cartorios';
    END IF;

    UPDATE public.cs_cx_registry_offices
    SET name = trim(p_name),
        sap_code = NULLIF(trim(p_sap_code), ''),
        contact_details = NULLIF(trim(p_contact_details), ''),
        notes = NULLIF(trim(p_notes), ''),
        active = p_active,
        updated_at = now()
    WHERE id = p_id
    RETURNING id INTO saved_id;

    IF saved_id IS NULL THEN
      RAISE EXCEPTION 'Cartorio nao encontrado';
    END IF;
  END IF;

  DELETE FROM public.cs_cx_registry_office_products link
  WHERE link.registry_office_id = saved_id
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(COALESCE(p_products, '[]'::jsonb))
        AS selected(product_id UUID, implementation_date TEXT)
      WHERE selected.product_id = link.product_id
    );

  INSERT INTO public.cs_cx_registry_office_products
    (registry_office_id, product_id, implementation_date, origin, source_present)
  SELECT saved_id,
         selected.product_id,
         NULLIF(selected.implementation_date, '')::date,
         'hub',
         true
  FROM jsonb_to_recordset(COALESCE(p_products, '[]'::jsonb))
    AS selected(product_id UUID, implementation_date TEXT)
  ON CONFLICT (registry_office_id, product_id) DO UPDATE
  SET implementation_date = EXCLUDED.implementation_date,
      source_present = true,
      last_synced_at = now();

  RETURN saved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_save_registry_office(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_registry_office(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB) TO authenticated;

COMMENT ON FUNCTION public.cs_cx_save_registry_office IS
  'Cria ou edita cartorio e seus produtos em uma unica transacao, respeitando RBAC.';

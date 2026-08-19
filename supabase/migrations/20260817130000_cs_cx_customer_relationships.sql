-- Relacionamentos solicitados na homologacao: multiplos produtos por contato
-- e multiplos responsaveis por produto implantado em cada cartorio.

CREATE TABLE IF NOT EXISTS public.cs_cx_contact_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.cs_cx_contacts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.cs_cx_products(id) ON DELETE RESTRICT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contact_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cs_cx_contact_products_contact
  ON public.cs_cx_contact_products(contact_id);
CREATE INDEX IF NOT EXISTS idx_cs_cx_contact_products_product
  ON public.cs_cx_contact_products(product_id);

CREATE TABLE IF NOT EXISTS public.cs_cx_registry_office_product_responsibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_office_product_id UUID NOT NULL
    REFERENCES public.cs_cx_registry_office_products(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (registry_office_product_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_cs_cx_office_product_responsibles_link
  ON public.cs_cx_registry_office_product_responsibles(registry_office_product_id);
CREATE INDEX IF NOT EXISTS idx_cs_cx_office_product_responsibles_profile
  ON public.cs_cx_registry_office_product_responsibles(profile_id);

ALTER TABLE public.cs_cx_contact_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_registry_office_product_responsibles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cs_cx_contact_products_read ON public.cs_cx_contact_products;
CREATE POLICY cs_cx_contact_products_read
  ON public.cs_cx_contact_products FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_contatos', 'view'));

DROP POLICY IF EXISTS cs_cx_contact_products_create ON public.cs_cx_contact_products;
CREATE POLICY cs_cx_contact_products_create
  ON public.cs_cx_contact_products FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'cs_cx_contatos', 'create')
    OR public.has_permission(auth.uid(), 'cs_cx_contatos', 'edit')
  );

DROP POLICY IF EXISTS cs_cx_contact_products_edit ON public.cs_cx_contact_products;
CREATE POLICY cs_cx_contact_products_edit
  ON public.cs_cx_contact_products FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_contatos', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_contatos', 'edit'));

DROP POLICY IF EXISTS cs_cx_contact_products_delete ON public.cs_cx_contact_products;
CREATE POLICY cs_cx_contact_products_delete
  ON public.cs_cx_contact_products FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_contatos', 'edit'));

DROP POLICY IF EXISTS cs_cx_office_product_responsibles_read
  ON public.cs_cx_registry_office_product_responsibles;
CREATE POLICY cs_cx_office_product_responsibles_read
  ON public.cs_cx_registry_office_product_responsibles FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_cartorios', 'view'));

DROP POLICY IF EXISTS cs_cx_office_product_responsibles_create
  ON public.cs_cx_registry_office_product_responsibles;
CREATE POLICY cs_cx_office_product_responsibles_create
  ON public.cs_cx_registry_office_product_responsibles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'cs_cx_cartorios', 'create')
    OR public.has_permission(auth.uid(), 'cs_cx_cartorios', 'edit')
  );

DROP POLICY IF EXISTS cs_cx_office_product_responsibles_edit
  ON public.cs_cx_registry_office_product_responsibles;
CREATE POLICY cs_cx_office_product_responsibles_edit
  ON public.cs_cx_registry_office_product_responsibles FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_cartorios', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_cartorios', 'edit'));

DROP POLICY IF EXISTS cs_cx_office_product_responsibles_delete
  ON public.cs_cx_registry_office_product_responsibles;
CREATE POLICY cs_cx_office_product_responsibles_delete
  ON public.cs_cx_registry_office_product_responsibles FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_cartorios', 'edit'));

INSERT INTO public.cs_cx_contact_products
  (contact_id, product_id, is_primary, created_by)
SELECT contact.id, contact.product_id, true, contact.author_profile_id
FROM public.cs_cx_contacts contact
ON CONFLICT (contact_id, product_id) DO UPDATE
SET is_primary = true;

CREATE OR REPLACE FUNCTION public.cs_cx_sync_contact_primary_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cs_cx_contact_products
  SET is_primary = false
  WHERE contact_id = NEW.id AND product_id <> NEW.product_id AND is_primary;

  INSERT INTO public.cs_cx_contact_products
    (contact_id, product_id, is_primary, created_by)
  VALUES (NEW.id, NEW.product_id, true, NEW.author_profile_id)
  ON CONFLICT (contact_id, product_id) DO UPDATE
  SET is_primary = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_cs_cx_contact_primary_product ON public.cs_cx_contacts;
CREATE TRIGGER sync_cs_cx_contact_primary_product
  AFTER INSERT OR UPDATE OF product_id ON public.cs_cx_contacts
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_sync_contact_primary_product();

CREATE OR REPLACE FUNCTION public.cs_cx_save_contact(
  p_id UUID,
  p_contact_date DATE,
  p_notes TEXT,
  p_pending_items TEXT,
  p_product_ids UUID[],
  p_contact_person TEXT,
  p_contact_details TEXT,
  p_registry_office_id UUID,
  p_ticket_number TEXT
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
  IF COALESCE(array_length(p_product_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um produto';
  END IF;
  IF NULLIF(trim(p_contact_person), '') IS NULL THEN
    RAISE EXCEPTION 'Informe a pessoa de contato';
  END IF;

  IF p_id IS NULL THEN
    IF NOT public.has_permission(auth.uid(), 'cs_cx_contatos', 'create') THEN
      RAISE EXCEPTION 'Sem permissao para criar contatos';
    END IF;
    INSERT INTO public.cs_cx_contacts
      (contact_date, notes, pending_items, product_id, contact_person,
       contact_details, registry_office_id, ticket_number, author_profile_id,
       origin, source_present)
    VALUES
      (p_contact_date, NULLIF(trim(p_notes), ''), NULLIF(trim(p_pending_items), ''),
       p_product_ids[1], trim(p_contact_person), NULLIF(trim(p_contact_details), ''),
       p_registry_office_id, NULLIF(trim(p_ticket_number), ''), auth.uid(),
       'hub', true)
    RETURNING id INTO saved_id;
  ELSE
    IF NOT public.has_permission(auth.uid(), 'cs_cx_contatos', 'edit') THEN
      RAISE EXCEPTION 'Sem permissao para editar contatos';
    END IF;
    UPDATE public.cs_cx_contacts
    SET contact_date = p_contact_date,
        notes = NULLIF(trim(p_notes), ''),
        pending_items = NULLIF(trim(p_pending_items), ''),
        product_id = p_product_ids[1],
        contact_person = trim(p_contact_person),
        contact_details = NULLIF(trim(p_contact_details), ''),
        registry_office_id = p_registry_office_id,
        ticket_number = NULLIF(trim(p_ticket_number), ''),
        updated_at = now()
    WHERE id = p_id
    RETURNING id INTO saved_id;
    IF saved_id IS NULL THEN
      RAISE EXCEPTION 'Contato nao encontrado';
    END IF;
  END IF;

  DELETE FROM public.cs_cx_contact_products link
  WHERE link.contact_id = saved_id
    AND NOT (link.product_id = ANY(p_product_ids));

  INSERT INTO public.cs_cx_contact_products
    (contact_id, product_id, is_primary, created_by)
  SELECT saved_id, selected.product_id, selected.ordinality = 1, auth.uid()
  FROM unnest(p_product_ids) WITH ORDINALITY AS selected(product_id, ordinality)
  ON CONFLICT (contact_id, product_id) DO UPDATE
  SET is_primary = EXCLUDED.is_primary;

  RETURN saved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_save_contact(
  UUID, DATE, TEXT, TEXT, UUID[], TEXT, TEXT, UUID, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_contact(
  UUID, DATE, TEXT, TEXT, UUID[], TEXT, TEXT, UUID, TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION public.cs_cx_save_registry_office_v2(
  p_id UUID,
  p_name TEXT,
  p_sap_code TEXT DEFAULT NULL,
  p_contact_details TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_active BOOLEAN DEFAULT true,
  p_products JSONB DEFAULT '[]'::jsonb,
  p_responsibles JSONB DEFAULT '[]'::jsonb
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
  SELECT saved_id, selected.product_id,
         NULLIF(selected.implementation_date, '')::date, 'hub', true
  FROM jsonb_to_recordset(COALESCE(p_products, '[]'::jsonb))
    AS selected(product_id UUID, implementation_date TEXT)
  ON CONFLICT (registry_office_id, product_id) DO UPDATE
  SET implementation_date = EXCLUDED.implementation_date,
      source_present = true,
      last_synced_at = now();

  DELETE FROM public.cs_cx_registry_office_product_responsibles responsible
  USING public.cs_cx_registry_office_products link
  WHERE responsible.registry_office_product_id = link.id
    AND link.registry_office_id = saved_id
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(COALESCE(p_responsibles, '[]'::jsonb))
        AS selected(product_id UUID, profile_id UUID)
      WHERE selected.product_id = link.product_id
        AND selected.profile_id = responsible.profile_id
    );

  INSERT INTO public.cs_cx_registry_office_product_responsibles
    (registry_office_product_id, profile_id, created_by)
  SELECT DISTINCT link.id, selected.profile_id, auth.uid()
  FROM jsonb_to_recordset(COALESCE(p_responsibles, '[]'::jsonb))
    AS selected(product_id UUID, profile_id UUID)
  JOIN public.cs_cx_registry_office_products link
    ON link.registry_office_id = saved_id
   AND link.product_id = selected.product_id
  ON CONFLICT (registry_office_product_id, profile_id) DO NOTHING;

  RETURN saved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_save_registry_office_v2(
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_registry_office_v2(
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, JSONB
) TO authenticated;

COMMENT ON TABLE public.cs_cx_contact_products IS
  'Produtos associados a cada contato; product_id em cs_cx_contacts permanece como produto principal.';
COMMENT ON TABLE public.cs_cx_registry_office_product_responsibles IS
  'Responsaveis do HUB por produto implantado em cada cartorio.';

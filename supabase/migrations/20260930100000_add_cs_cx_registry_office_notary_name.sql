ALTER TABLE public.cs_cx_registry_offices
  ADD COLUMN IF NOT EXISTS notary_name TEXT;

CREATE OR REPLACE FUNCTION public.cs_cx_save_registry_office_v5(
  p_id UUID,
  p_name TEXT,
  p_sap_code TEXT,
  p_contact_details TEXT,
  p_notes TEXT,
  p_active BOOLEAN,
  p_products JSONB,
  p_responsibles JSONB,
  p_responsible_profile_ids UUID[],
  p_notary_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  saved_id UUID;
  primary_responsible_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  SELECT selected.profile_id
  INTO primary_responsible_id
  FROM unnest(COALESCE(p_responsible_profile_ids, ARRAY[]::UUID[]))
    WITH ORDINALITY AS selected(profile_id, position)
  WHERE selected.profile_id IS NOT NULL
  ORDER BY selected.position
  LIMIT 1;

  IF p_id IS NULL THEN
    IF NOT public.has_permission(auth.uid(), 'cs_cx_cartorios', 'create') THEN
      RAISE EXCEPTION 'Sem permissao para criar cartorios';
    END IF;

    INSERT INTO public.cs_cx_registry_offices (
      name,
      notary_name,
      sap_code,
      contact_details,
      notes,
      active,
      analyst_profile_id,
      origin,
      source_present
    ) VALUES (
      trim(p_name),
      NULLIF(trim(p_notary_name), ''),
      NULLIF(trim(p_sap_code), ''),
      NULLIF(trim(p_contact_details), ''),
      NULLIF(trim(p_notes), ''),
      p_active,
      primary_responsible_id,
      'hub',
      true
    )
    RETURNING id INTO saved_id;
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM public.cs_cx_registry_offices office
      WHERE office.id = p_id
        AND public.cs_cx_can_manage_office_record(
          'cs_cx_cartorios',
          'edit',
          office.created_by,
          office.id
        )
    ) THEN
      RAISE EXCEPTION 'Sem permissao para editar cartorios';
    END IF;

    UPDATE public.cs_cx_registry_offices
    SET name = trim(p_name),
        notary_name = NULLIF(trim(p_notary_name), ''),
        sap_code = NULLIF(trim(p_sap_code), ''),
        contact_details = NULLIF(trim(p_contact_details), ''),
        notes = NULLIF(trim(p_notes), ''),
        active = p_active,
        analyst_profile_id = primary_responsible_id,
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

REVOKE ALL ON FUNCTION public.cs_cx_save_registry_office_v5(
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, JSONB, UUID[], TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_registry_office_v5(
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, JSONB, UUID[], TEXT
) TO authenticated;

INSERT INTO public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
)
SELECT
  'changelog',
  'release_improvement',
  'cs_cx_cartorios',
  'Nome do tabelião ou tabeliã nos cartórios CS/CX',
  'O cadastro de cartórios CS/CX agora permite salvar e atualizar o nome do tabelião ou tabeliã responsável.',
  '/cs-cx/cartorios'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'cs_cx_cartorios'
    AND title = 'Nome do tabelião ou tabeliã nos cartórios CS/CX'
    AND action_url = '/cs-cx/cartorios'
);

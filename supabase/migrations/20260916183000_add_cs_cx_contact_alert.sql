ALTER TABLE public.cs_cx_contacts
  ADD COLUMN IF NOT EXISTS is_alert BOOLEAN NOT NULL DEFAULT false;

-- Remove both signatures before recreating the RPC so PostgREST never sees
-- ambiguous overloads when the optional alert argument is omitted.
DROP FUNCTION IF EXISTS public.cs_cx_save_contact(
  UUID, DATE, TEXT, TEXT, UUID[], TEXT, TEXT, UUID, TEXT, BOOLEAN
);
DROP FUNCTION IF EXISTS public.cs_cx_save_contact(
  UUID, DATE, TEXT, TEXT, UUID[], TEXT, TEXT, UUID, TEXT
);

CREATE OR REPLACE FUNCTION public.cs_cx_save_contact(
  p_id UUID,
  p_contact_date DATE,
  p_notes TEXT,
  p_pending_items TEXT,
  p_product_ids UUID[],
  p_contact_person TEXT,
  p_contact_details TEXT,
  p_registry_office_id UUID,
  p_ticket_number TEXT,
  p_is_alert BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
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
       origin, source_present, is_alert)
    VALUES
      (p_contact_date, NULLIF(trim(p_notes), ''), NULLIF(trim(p_pending_items), ''),
       p_product_ids[1], trim(p_contact_person), NULLIF(trim(p_contact_details), ''),
       p_registry_office_id, NULLIF(trim(p_ticket_number), ''), auth.uid(),
       'hub', true, COALESCE(p_is_alert, false))
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
        is_alert = COALESCE(p_is_alert, false),
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
  UUID, DATE, TEXT, TEXT, UUID[], TEXT, TEXT, UUID, TEXT, BOOLEAN
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_contact(
  UUID, DATE, TEXT, TEXT, UUID[], TEXT, TEXT, UUID, TEXT, BOOLEAN
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
  'cs_cx_contatos',
  'Alerta persistente nos contatos CS/CX',
  'Os contatos do CS/CX agora podem manter um alerta salvo para destacar acompanhamentos importantes.',
  '/cs-cx/contatos'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'cs_cx_contatos'
    AND title = 'Alerta persistente nos contatos CS/CX'
    AND action_url = '/cs-cx/contatos'
);

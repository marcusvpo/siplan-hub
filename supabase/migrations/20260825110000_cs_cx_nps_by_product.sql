-- Segmenta convites e respostas NPS pelo produto avaliado.
-- Colunas permanecem anuláveis para preservar pesquisas legadas sem produto.

ALTER TABLE public.cs_cx_nps_invitations
  ADD COLUMN IF NOT EXISTS product_id UUID
    REFERENCES public.cs_cx_products(id) ON DELETE RESTRICT;

ALTER TABLE public.cs_cx_nps_responses
  ADD COLUMN IF NOT EXISTS product_id UUID
    REFERENCES public.cs_cx_products(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_cs_cx_nps_invitations_product_created
  ON public.cs_cx_nps_invitations(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cs_cx_nps_responses_product_date
  ON public.cs_cx_nps_responses(product_id, responded_at DESC);

UPDATE public.cs_cx_nps_responses response
SET product_id = invitation.product_id
FROM public.cs_cx_nps_invitations invitation
WHERE response.invitation_id = invitation.id
  AND response.product_id IS NULL
  AND invitation.product_id IS NOT NULL;

DO $$
DECLARE
  orion_tn_id UUID;
BEGIN
  SELECT product.id
  INTO orion_tn_id
  FROM public.cs_cx_products product
  WHERE lower(regexp_replace(product.name, '[^a-zA-Z0-9]', '', 'g')) = 'oriontn'
     OR lower(
       regexp_replace(COALESCE(product.product_code, ''), '[^a-zA-Z0-9]', '', 'g')
     ) = 'oriontn'
  ORDER BY product.active DESC, product.source_present DESC
  LIMIT 1;

  IF orion_tn_id IS NULL THEN
    RAISE EXCEPTION 'Produto OrionTN não encontrado para classificar o histórico de NPS';
  END IF;

  UPDATE public.cs_cx_nps_invitations
  SET product_id = orion_tn_id
  WHERE product_id IS NULL;

  UPDATE public.cs_cx_nps_responses
  SET product_id = orion_tn_id
  WHERE product_id IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_set_nps_response_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.product_id IS NULL AND NEW.invitation_id IS NOT NULL THEN
    SELECT invitation.product_id
    INTO NEW.product_id
    FROM public.cs_cx_nps_invitations invitation
    WHERE invitation.id = NEW.invitation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_cs_cx_nps_response_product
  ON public.cs_cx_nps_responses;
CREATE TRIGGER set_cs_cx_nps_response_product
  BEFORE INSERT OR UPDATE OF invitation_id ON public.cs_cx_nps_responses
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_set_nps_response_product();

DROP FUNCTION IF EXISTS public.cs_cx_create_nps_invitation(
  UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.cs_cx_create_nps_invitation(
  p_questionnaire_id UUID,
  p_registry_office_id UUID,
  p_product_id UUID,
  p_contact_id UUID,
  p_recipient_name TEXT,
  p_recipient_email TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  questionnaire public.cs_cx_nps_questionnaires%ROWTYPE;
  invitation public.cs_cx_nps_invitations%ROWTYPE;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'cs_cx_nps', 'create') THEN
    RAISE EXCEPTION 'Permissão insuficiente para solicitar NPS';
  END IF;
  IF NULLIF(trim(p_recipient_name), '') IS NULL OR p_expires_at <= now() THEN
    RAISE EXCEPTION 'Destinatário ou validade inválida';
  END IF;

  SELECT * INTO questionnaire
  FROM public.cs_cx_nps_questionnaires
  WHERE id = p_questionnaire_id AND is_active;
  IF questionnaire.id IS NULL THEN
    RAISE EXCEPTION 'Questionário ativo não encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.cs_cx_registry_offices office
    WHERE office.id = p_registry_office_id
      AND office.source_present
      AND office.active
  ) THEN
    RAISE EXCEPTION 'Cartório ativo não encontrado';
  END IF;

  IF p_product_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.cs_cx_registry_office_products office_product
    JOIN public.cs_cx_products product
      ON product.id = office_product.product_id
    WHERE office_product.registry_office_id = p_registry_office_id
      AND office_product.product_id = p_product_id
      AND office_product.source_present
      AND product.source_present
      AND product.active
  ) THEN
    RAISE EXCEPTION 'Produto não está vinculado ao cartório selecionado';
  END IF;

  IF p_contact_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.cs_cx_contacts contact
    WHERE contact.id = p_contact_id
      AND contact.registry_office_id = p_registry_office_id
      AND contact.source_present
  ) THEN
    RAISE EXCEPTION 'Contato não pertence ao cartório selecionado';
  END IF;

  INSERT INTO public.cs_cx_nps_invitations (
    questionnaire_id, registry_office_id, product_id, contact_id,
    recipient_name, recipient_email, questionnaire_snapshot, expires_at,
    created_by
  ) VALUES (
    questionnaire.id, p_registry_office_id, p_product_id, p_contact_id,
    trim(p_recipient_name), NULLIF(trim(p_recipient_email), ''),
    jsonb_build_object(
      'title', questionnaire.title,
      'description', questionnaire.description,
      'questions', questionnaire.questions,
      'theme', questionnaire.theme
    ),
    p_expires_at, auth.uid()
  ) RETURNING * INTO invitation;

  RETURN to_jsonb(invitation);
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_create_nps_invitation(
  UUID, UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cs_cx_create_nps_invitation(
  UUID, UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ
) TO authenticated;

CREATE OR REPLACE FUNCTION public.cs_cx_get_public_nps_invitation(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'status', CASE
      WHEN invitation.status = 'PENDENTE' AND invitation.expires_at <= now()
        THEN 'EXPIRADO'
      ELSE invitation.status
    END,
    'office_name', office.name,
    'product_id', invitation.product_id,
    'product_name', product.name,
    'recipient_name', invitation.recipient_name,
    'expires_at', invitation.expires_at,
    'questionnaire', invitation.questionnaire_snapshot
  ) INTO result
  FROM public.cs_cx_nps_invitations invitation
  JOIN public.cs_cx_registry_offices office
    ON office.id = invitation.registry_office_id
  LEFT JOIN public.cs_cx_products product
    ON product.id = invitation.product_id
  WHERE invitation.public_token = p_token;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_get_public_nps_invitation(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_get_public_nps_invitation(UUID)
  TO service_role;

CREATE OR REPLACE FUNCTION public.cs_cx_update_nps_response_product(
  p_response_id UUID,
  p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  response public.cs_cx_nps_responses%ROWTYPE;
  updated_response public.cs_cx_nps_responses%ROWTYPE;
BEGIN
  SELECT * INTO response
  FROM public.cs_cx_nps_responses
  WHERE id = p_response_id
  FOR UPDATE;

  IF response.id IS NULL THEN
    RAISE EXCEPTION 'Resposta NPS não encontrada';
  END IF;
  IF NOT public.cs_cx_can_manage_owned(
    'cs_cx_nps', 'edit', response.owner_profile_id
  ) THEN
    RAISE EXCEPTION 'Permissão insuficiente para corrigir o produto da NPS';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.cs_cx_registry_office_products office_product
    JOIN public.cs_cx_products product
      ON product.id = office_product.product_id
    WHERE office_product.registry_office_id = response.registry_office_id
      AND office_product.product_id = p_product_id
      AND office_product.source_present
      AND product.source_present
      AND product.active
  ) THEN
    RAISE EXCEPTION 'Produto não está vinculado ao cartório desta avaliação';
  END IF;

  UPDATE public.cs_cx_nps_responses
  SET product_id = p_product_id
  WHERE id = response.id
  RETURNING * INTO updated_response;

  IF response.invitation_id IS NOT NULL THEN
    UPDATE public.cs_cx_nps_invitations
    SET product_id = p_product_id
    WHERE id = response.invitation_id;
  END IF;

  RETURN to_jsonb(updated_response);
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_update_nps_response_product(UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cs_cx_update_nps_response_product(UUID, UUID)
  TO authenticated;

COMMENT ON COLUMN public.cs_cx_nps_invitations.product_id IS
  'Produto específico que o convite solicita ao cliente avaliar.';
COMMENT ON COLUMN public.cs_cx_nps_responses.product_id IS
  'Produto avaliado, herdado do convite público de NPS.';
COMMENT ON FUNCTION public.cs_cx_update_nps_response_product(UUID, UUID) IS
  'Corrige somente o produto da avaliação e mantém o convite associado consistente.';

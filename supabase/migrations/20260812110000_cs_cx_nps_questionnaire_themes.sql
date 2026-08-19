-- Identidade visual individual dos questionários e imagens públicas imutáveis.

ALTER TABLE public.cs_cx_nps_questionnaires
  ADD COLUMN IF NOT EXISTS theme JSONB NOT NULL DEFAULT jsonb_build_object(
    'primary_color', '#E11D48',
    'background_color', '#F8FAFC',
    'background_image_path', NULL,
    'background_overlay', 72
  );

ALTER TABLE public.cs_cx_nps_questionnaires
  DROP CONSTRAINT IF EXISTS cs_cx_nps_questionnaires_theme_valid;
ALTER TABLE public.cs_cx_nps_questionnaires
  ADD CONSTRAINT cs_cx_nps_questionnaires_theme_valid CHECK (
    jsonb_typeof(theme) = 'object'
    AND theme->>'primary_color' ~ '^#[0-9A-Fa-f]{6}$'
    AND theme->>'background_color' ~ '^#[0-9A-Fa-f]{6}$'
    AND (
      theme->>'background_image_path' IS NULL
      OR theme->>'background_image_path' ~ '^themes/[0-9A-Fa-f-]{36}\.(jpg|png|webp)$'
    )
    AND (theme->>'background_overlay')::INTEGER BETWEEN 0 AND 90
  );

INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) VALUES (
  'cs-cx-nps-assets',
  'cs-cx-nps-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS cs_cx_nps_assets_public_read ON storage.objects;
DROP POLICY IF EXISTS cs_cx_nps_assets_insert ON storage.objects;

CREATE POLICY cs_cx_nps_assets_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'cs-cx-nps-assets');

CREATE POLICY cs_cx_nps_assets_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cs-cx-nps-assets'
    AND (storage.foldername(name))[1] = 'themes'
    AND (
      public.has_permission(auth.uid(), 'cs_cx_nps', 'create')
      OR public.has_permission(auth.uid(), 'cs_cx_nps', 'edit')
    )
  );

CREATE OR REPLACE FUNCTION public.cs_cx_create_nps_invitation(
  p_questionnaire_id UUID,
  p_registry_office_id UUID,
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

  SELECT * INTO questionnaire FROM public.cs_cx_nps_questionnaires
  WHERE id = p_questionnaire_id AND is_active;
  IF questionnaire.id IS NULL THEN RAISE EXCEPTION 'Questionário ativo não encontrado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.cs_cx_registry_offices
    WHERE id = p_registry_office_id AND source_present AND active
  ) THEN RAISE EXCEPTION 'Cartório ativo não encontrado'; END IF;
  IF p_contact_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cs_cx_contacts
    WHERE id = p_contact_id AND registry_office_id = p_registry_office_id AND source_present
  ) THEN RAISE EXCEPTION 'Contato não pertence ao cartório selecionado'; END IF;

  INSERT INTO public.cs_cx_nps_invitations (
    questionnaire_id, registry_office_id, contact_id, recipient_name,
    recipient_email, questionnaire_snapshot, expires_at, created_by
  ) VALUES (
    questionnaire.id, p_registry_office_id, p_contact_id, trim(p_recipient_name),
    NULLIF(trim(p_recipient_email), ''),
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

REVOKE ALL ON FUNCTION public.cs_cx_create_nps_invitation(UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cs_cx_create_nps_invitation(UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ)
  TO authenticated;

COMMENT ON COLUMN public.cs_cx_nps_questionnaires.theme IS
  'Tema visual versionado no snapshot de cada convite público.';
COMMENT ON POLICY cs_cx_nps_assets_insert ON storage.objects IS
  'Imagens são append-only para não quebrar a aparência de convites já enviados.';

-- Rastreia a abertura dos links públicos de NPS sem armazenar endereço IP.
-- A localização é aproximada e depende dos cabeçalhos fornecidos pela rede.

ALTER TABLE public.cs_cx_nps_invitations
  ADD COLUMN IF NOT EXISTS first_accessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_access_city TEXT,
  ADD COLUMN IF NOT EXISTS last_access_region TEXT,
  ADD COLUMN IF NOT EXISTS last_access_country_code TEXT,
  ADD COLUMN IF NOT EXISTS last_access_timezone TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cs_cx_nps_invitations_access_count_valid'
      AND conrelid = 'public.cs_cx_nps_invitations'::regclass
  ) THEN
    ALTER TABLE public.cs_cx_nps_invitations
      ADD CONSTRAINT cs_cx_nps_invitations_access_count_valid
      CHECK (access_count >= 0);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.cs_cx_nps_access_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL
    REFERENCES public.cs_cx_nps_invitations(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  city TEXT,
  region TEXT,
  country_code TEXT,
  timezone TEXT,
  CONSTRAINT cs_cx_nps_access_events_country_code_valid
    CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$')
);

CREATE INDEX IF NOT EXISTS idx_cs_cx_nps_access_events_invitation_date
  ON public.cs_cx_nps_access_events(invitation_id, accessed_at DESC);

ALTER TABLE public.cs_cx_nps_access_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cs_cx_nps_access_events_read
  ON public.cs_cx_nps_access_events;
CREATE POLICY cs_cx_nps_access_events_read
  ON public.cs_cx_nps_access_events
  FOR SELECT
  TO authenticated
  USING (
    public.has_permission(auth.uid(), 'cs_cx_nps', 'view')
    AND EXISTS (
      SELECT 1
      FROM public.cs_cx_nps_invitations invitation
      WHERE invitation.id = invitation_id
        AND public.cs_cx_can_view_office_record(
          'cs_cx_nps',
          invitation.created_by,
          invitation.registry_office_id
        )
    )
  );

REVOKE ALL ON TABLE public.cs_cx_nps_access_events
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.cs_cx_nps_access_events TO authenticated;

DROP FUNCTION IF EXISTS public.cs_cx_get_public_nps_invitation(UUID);

CREATE OR REPLACE FUNCTION public.cs_cx_get_public_nps_invitation(
  p_token UUID,
  p_country_code TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation public.cs_cx_nps_invitations%ROWTYPE;
  accessed_at TIMESTAMPTZ := now();
  normalized_country_code TEXT;
  normalized_region TEXT;
  normalized_city TEXT;
  normalized_timezone TEXT;
  result JSONB;
BEGIN
  SELECT * INTO invitation
  FROM public.cs_cx_nps_invitations
  WHERE public_token = p_token
  FOR UPDATE;

  IF invitation.id IS NULL THEN
    RETURN NULL;
  END IF;

  normalized_country_code := CASE
    WHEN upper(trim(COALESCE(p_country_code, ''))) ~ '^[A-Z]{2}$'
      THEN upper(trim(p_country_code))
    ELSE NULL
  END;
  normalized_region := NULLIF(left(trim(COALESCE(p_region, '')), 120), '');
  normalized_city := NULLIF(left(trim(COALESCE(p_city, '')), 120), '');
  normalized_timezone := NULLIF(left(trim(COALESCE(p_timezone, '')), 120), '');

  INSERT INTO public.cs_cx_nps_access_events (
    invitation_id,
    accessed_at,
    city,
    region,
    country_code,
    timezone
  ) VALUES (
    invitation.id,
    accessed_at,
    normalized_city,
    normalized_region,
    normalized_country_code,
    normalized_timezone
  );

  UPDATE public.cs_cx_nps_invitations
  SET first_accessed_at = COALESCE(first_accessed_at, accessed_at),
      last_accessed_at = accessed_at,
      access_count = access_count + 1,
      last_access_city = normalized_city,
      last_access_region = normalized_region,
      last_access_country_code = normalized_country_code,
      last_access_timezone = normalized_timezone
  WHERE id = invitation.id;

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
  FROM public.cs_cx_registry_offices office
  LEFT JOIN public.cs_cx_products product
    ON product.id = invitation.product_id
  WHERE office.id = invitation.registry_office_id;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_get_public_nps_invitation(
  UUID, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_get_public_nps_invitation(
  UUID, TEXT, TEXT, TEXT, TEXT
) TO service_role;

COMMENT ON TABLE public.cs_cx_nps_access_events IS
  'Aberturas de links públicos de NPS, com data/hora e localização aproximada sem endereço IP.';
COMMENT ON COLUMN public.cs_cx_nps_access_events.country_code IS
  'País aproximado informado pela infraestrutura de rede; pode permanecer vazio.';
COMMENT ON COLUMN public.cs_cx_nps_invitations.access_count IS
  'Quantidade de carregamentos válidos do link; não representa visitantes únicos.';

INSERT INTO public.notifications (
  user_id,
  type,
  category,
  priority,
  permission_resource,
  title,
  message,
  action_url
) VALUES (
  NULL,
  'release_improvement',
  'changelog',
  'normal',
  'cs_cx_nps',
  'Acompanhamento de acesso aos links de NPS',
  'A aba Solicitações do NPS agora informa se o link foi aberto e apresenta data, hora e localização aproximada dos acessos, quando disponível.',
  '/cs-cx/nps'
);

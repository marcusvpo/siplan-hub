-- Questionários NPS nativos, convites públicos de uso único e submissão transacional.

CREATE TABLE public.cs_cx_nps_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  description TEXT,
  questions JSONB NOT NULL CHECK (jsonb_typeof(questions) = 'array' AND jsonb_array_length(questions) > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cs_cx_nps_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  questionnaire_id UUID NOT NULL REFERENCES public.cs_cx_nps_questionnaires(id) ON DELETE RESTRICT,
  registry_office_id UUID NOT NULL REFERENCES public.cs_cx_registry_offices(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.cs_cx_contacts(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL CHECK (length(trim(recipient_name)) BETWEEN 1 AND 300),
  recipient_email TEXT,
  questionnaire_snapshot JSONB NOT NULL CHECK (jsonb_typeof(questionnaire_snapshot) = 'object'),
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'RESPONDIDO', 'CANCELADO')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  responded_at TIMESTAMPTZ,
  response_id UUID REFERENCES public.cs_cx_nps_responses(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cs_cx_nps_responses
  ADD COLUMN IF NOT EXISTS invitation_id UUID UNIQUE REFERENCES public.cs_cx_nps_invitations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS questionnaire_id UUID REFERENCES public.cs_cx_nps_questionnaires(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS questionnaire_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX idx_cs_cx_nps_questionnaires_default
  ON public.cs_cx_nps_questionnaires(is_default) WHERE is_default;
CREATE INDEX idx_cs_cx_nps_invitations_office_created
  ON public.cs_cx_nps_invitations(registry_office_id, created_at DESC);
CREATE INDEX idx_cs_cx_nps_invitations_status_expires
  ON public.cs_cx_nps_invitations(status, expires_at);

ALTER TABLE public.cs_cx_nps_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_nps_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_cx_nps_questionnaires_read ON public.cs_cx_nps_questionnaires
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'cs_cx_nps', 'view'));
CREATE POLICY cs_cx_nps_questionnaires_create ON public.cs_cx_nps_questionnaires
  FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_nps', 'create'));
CREATE POLICY cs_cx_nps_questionnaires_edit ON public.cs_cx_nps_questionnaires
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_nps', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_nps', 'edit'));
CREATE POLICY cs_cx_nps_questionnaires_delete ON public.cs_cx_nps_questionnaires
  FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'cs_cx_nps', 'delete'));

CREATE POLICY cs_cx_nps_invitations_read ON public.cs_cx_nps_invitations
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'cs_cx_nps', 'view'));
CREATE POLICY cs_cx_nps_invitations_create ON public.cs_cx_nps_invitations
  FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_nps', 'create'));
CREATE POLICY cs_cx_nps_invitations_edit ON public.cs_cx_nps_invitations
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_nps', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_nps', 'edit'));
CREATE POLICY cs_cx_nps_invitations_delete ON public.cs_cx_nps_invitations
  FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'cs_cx_nps', 'delete'));

CREATE TRIGGER update_cs_cx_nps_questionnaires_updated_at
  BEFORE UPDATE ON public.cs_cx_nps_questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_update_updated_at();
CREATE TRIGGER update_cs_cx_nps_invitations_updated_at
  BEFORE UPDATE ON public.cs_cx_nps_invitations
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_update_updated_at();

CREATE OR REPLACE FUNCTION public.cs_cx_keep_single_default_nps_questionnaire()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.cs_cx_nps_questionnaires SET is_default = false WHERE id <> NEW.id AND is_default;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER keep_single_default_cs_cx_nps_questionnaire
  BEFORE INSERT OR UPDATE OF is_default ON public.cs_cx_nps_questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_keep_single_default_nps_questionnaire();

INSERT INTO public.cs_cx_nps_questionnaires (title, description, questions, is_active, is_default)
SELECT
  'Pesquisa de satisfação Siplan',
  'Sua opinião nos ajuda a melhorar continuamente nossos produtos e atendimento.',
  '[
    {"id":"score","type":"nps","semantic_key":"score","title":"Em uma escala de 0 a 10, o quanto você recomendaria a Siplan?","required":true},
    {"id":"score_reason","type":"textarea","semantic_key":"score_reason","title":"Qual é o principal motivo da sua nota?","required":true},
    {"id":"improvement_suggestion","type":"textarea","semantic_key":"improvement_suggestion","title":"O que poderíamos fazer para melhorar sua experiência?","required":false}
  ]'::jsonb,
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.cs_cx_nps_questionnaires);

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
    jsonb_build_object('title', questionnaire.title, 'description', questionnaire.description, 'questions', questionnaire.questions),
    p_expires_at, auth.uid()
  ) RETURNING * INTO invitation;

  RETURN to_jsonb(invitation);
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_create_nps_invitation(UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cs_cx_create_nps_invitation(UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

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
      WHEN invitation.status = 'PENDENTE' AND invitation.expires_at <= now() THEN 'EXPIRADO'
      ELSE invitation.status
    END,
    'office_name', office.name,
    'recipient_name', invitation.recipient_name,
    'expires_at', invitation.expires_at,
    'questionnaire', invitation.questionnaire_snapshot
  ) INTO result
  FROM public.cs_cx_nps_invitations invitation
  JOIN public.cs_cx_registry_offices office ON office.id = invitation.registry_office_id
  WHERE invitation.public_token = p_token;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_submit_public_nps(
  p_token UUID,
  p_respondent_name TEXT,
  p_answers JSONB,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation public.cs_cx_nps_invitations%ROWTYPE;
  question JSONB;
  answer JSONB;
  score INTEGER;
  score_reason TEXT;
  improvement TEXT;
  created_response_id UUID;
BEGIN
  IF NULLIF(trim(p_respondent_name), '') IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    RAISE EXCEPTION 'Resposta pública inválida';
  END IF;

  SELECT * INTO invitation FROM public.cs_cx_nps_invitations
  WHERE public_token = p_token FOR UPDATE;
  IF invitation.id IS NULL THEN RAISE EXCEPTION 'Convite NPS não encontrado'; END IF;
  IF invitation.status = 'RESPONDIDO' THEN
    RETURN jsonb_build_object('id', invitation.response_id, 'duplicate', true);
  END IF;
  IF invitation.status = 'CANCELADO' THEN RAISE EXCEPTION 'Convite NPS cancelado'; END IF;
  IF invitation.expires_at <= now() THEN RAISE EXCEPTION 'Convite NPS expirado'; END IF;

  FOR question IN SELECT value FROM jsonb_array_elements(invitation.questionnaire_snapshot->'questions') LOOP
    answer := p_answers -> (question->>'id');
    IF COALESCE((question->>'required')::boolean, false) AND (
      answer IS NULL OR answer = 'null'::jsonb OR answer = '""'::jsonb OR answer = '[]'::jsonb
    ) THEN RAISE EXCEPTION 'Pergunta obrigatória sem resposta: %', question->>'title'; END IF;
    IF question->>'semantic_key' = 'score' THEN
      BEGIN score := (p_answers->>(question->>'id'))::integer;
      EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Nota NPS inválida'; END;
    ELSIF question->>'semantic_key' = 'score_reason' THEN
      score_reason := NULLIF(trim(p_answers->>(question->>'id')), '');
    ELSIF question->>'semantic_key' = 'improvement_suggestion' THEN
      improvement := NULLIF(trim(p_answers->>(question->>'id')), '');
    END IF;
  END LOOP;
  IF score IS NULL OR score NOT BETWEEN 0 AND 10 THEN RAISE EXCEPTION 'Nota NPS inválida'; END IF;

  INSERT INTO public.cs_cx_nps_responses (
    registry_office_id, responded_at, respondent_name, respondent_office,
    score, score_reason, improvement_suggestion, classification, origin,
    source_present, invitation_id, questionnaire_id, questionnaire_snapshot, answers
  ) SELECT
    invitation.registry_office_id, now(), left(trim(p_respondent_name), 300), office.name,
    score, left(score_reason, 10000), left(improvement, 10000),
    CASE WHEN score >= 9 THEN 'PROMOTOR' WHEN score >= 7 THEN 'NEUTRO' ELSE 'DETRATOR' END,
    'hub', true, invitation.id, invitation.questionnaire_id,
    invitation.questionnaire_snapshot, p_answers
  FROM public.cs_cx_registry_offices office WHERE office.id = invitation.registry_office_id
  RETURNING id INTO created_response_id;

  UPDATE public.cs_cx_nps_invitations
  SET status = 'RESPONDIDO', responded_at = now(), response_id = created_response_id
  WHERE id = invitation.id;

  INSERT INTO public.cs_cx_audit_logs (
    source_table, action, entity_type, entity_id, new_data, occurred_at,
    ip_address, user_agent, import_details, origin, source_present
  ) VALUES (
    'cs_cx_nps_responses', 'PUBLIC_FORM_POST', 'resposta_nps', created_response_id,
    jsonb_build_object('registry_office_id', invitation.registry_office_id, 'score', score, 'invitation_id', invitation.id),
    now(), p_ip_address, left(p_user_agent, 1000), 'Recebido pelo formulário público nativo.', 'hub', true
  );

  RETURN jsonb_build_object('id', created_response_id, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_get_public_nps_invitation(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cs_cx_submit_public_nps(UUID, TEXT, JSONB, INET, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_get_public_nps_invitation(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.cs_cx_submit_public_nps(UUID, TEXT, JSONB, INET, TEXT) TO service_role;

COMMENT ON TABLE public.cs_cx_nps_invitations IS
  'Links públicos individuais de NPS; o snapshot preserva a versão enviada ao cliente.';

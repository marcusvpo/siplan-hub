-- Recepção transacional e auditada de NPS vindo de integrações externas.

CREATE OR REPLACE FUNCTION public.cs_cx_receive_nps_webhook(
  p_responded_at TIMESTAMPTZ,
  p_respondent_name TEXT,
  p_office_name TEXT,
  p_score INTEGER,
  p_score_reason TEXT DEFAULT NULL,
  p_improvement_suggestion TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  office_id UUID;
  office_name TEXT;
  first_word TEXT;
  response_id UUID;
  response_reason TEXT := NULLIF(trim(p_score_reason), '');
BEGIN
  IF p_responded_at IS NULL
    OR NULLIF(trim(p_respondent_name), '') IS NULL
    OR NULLIF(trim(p_office_name), '') IS NULL
    OR p_score IS NULL
    OR p_score NOT BETWEEN 0 AND 10
  THEN
    RAISE EXCEPTION 'Resposta NPS inválida';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('cs-cx-nps-office|' || lower(trim(p_office_name)), 0));

  SELECT office.id, office.name INTO office_id, office_name
  FROM public.cs_cx_registry_offices office
  WHERE office.source_present
    AND lower(trim(office.name)) = lower(trim(p_office_name))
  ORDER BY office.active DESC, office.created_at NULLS LAST
  LIMIT 1;

  IF office_id IS NULL THEN
    SELECT office.id, office.name INTO office_id, office_name
    FROM public.cs_cx_registry_offices office
    WHERE office.source_present
      AND (
        position(lower(trim(p_office_name)) in lower(office.name)) > 0
        OR position(lower(office.name) in lower(trim(p_office_name))) > 0
      )
    ORDER BY office.active DESC, length(office.name)
    LIMIT 1;
  END IF;

  IF office_id IS NULL THEN
    SELECT token INTO first_word
    FROM regexp_split_to_table(trim(p_office_name), E'\\s+') AS words(token)
    WHERE length(token) > 2
    LIMIT 1;
    IF first_word IS NOT NULL THEN
      SELECT office.id, office.name INTO office_id, office_name
      FROM public.cs_cx_registry_offices office
      WHERE office.source_present AND position(lower(first_word) in lower(office.name)) > 0
      ORDER BY office.active DESC, length(office.name)
      LIMIT 1;
    END IF;
  END IF;

  IF office_id IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('cs-cx-nps-pending-office', 0));
    SELECT office.id, office.name INTO office_id, office_name
    FROM public.cs_cx_registry_offices office
    WHERE lower(office.name) = lower('PENDENTE IDENTIFICAÇÃO')
    LIMIT 1;
    IF office_id IS NULL THEN
      INSERT INTO public.cs_cx_registry_offices (
        name, sap_code, active, notes, created_at, origin, source_present
      ) VALUES (
        'PENDENTE IDENTIFICAÇÃO', 'PENDENTE', true,
        'Cartório temporário para NPS com nomes não identificados automaticamente.',
        now(), 'hub', true
      ) RETURNING id, name INTO office_id, office_name;
    END IF;
    response_reason := concat_ws(' ', '[NOME ORIGINAL: ' || trim(p_office_name) || ']', response_reason);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    office_id::text || '|' || lower(trim(p_respondent_name)) || '|' ||
      (p_responded_at AT TIME ZONE 'America/Sao_Paulo')::date::text,
    0
  ));

  SELECT response.id INTO response_id
  FROM public.cs_cx_nps_responses response
  WHERE response.registry_office_id = office_id
    AND lower(trim(response.respondent_name)) = lower(trim(p_respondent_name))
    AND (response.responded_at AT TIME ZONE 'America/Sao_Paulo')::date =
        (p_responded_at AT TIME ZONE 'America/Sao_Paulo')::date
    AND response.source_present
  LIMIT 1;

  IF response_id IS NOT NULL THEN
    RETURN jsonb_build_object('id', response_id, 'duplicate', true, 'registry_office', office_name);
  END IF;

  INSERT INTO public.cs_cx_nps_responses (
    registry_office_id, responded_at, respondent_name, respondent_office,
    score, score_reason, improvement_suggestion, classification, origin, source_present
  ) VALUES (
    office_id, p_responded_at, trim(p_respondent_name), office_name,
    p_score, response_reason, NULLIF(trim(p_improvement_suggestion), ''),
    CASE WHEN p_score >= 9 THEN 'PROMOTOR' WHEN p_score >= 7 THEN 'NEUTRO' ELSE 'DETRATOR' END,
    'hub', true
  ) RETURNING id INTO response_id;

  INSERT INTO public.cs_cx_audit_logs (
    source_table, action, entity_type, entity_id, new_data, occurred_at,
    ip_address, user_agent, import_details, origin, source_present
  ) VALUES (
    'cs_cx_nps_responses', 'WEBHOOK_POST', 'resposta_nps', response_id,
    jsonb_build_object('registry_office_id', office_id, 'score', p_score), now(),
    p_ip_address, left(p_user_agent, 1000), 'Recebido via webhook. ' || trim(p_respondent_name),
    'hub', true
  );

  RETURN jsonb_build_object('id', response_id, 'duplicate', false, 'registry_office', office_name);
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_receive_nps_webhook(
  TIMESTAMPTZ, TEXT, TEXT, INTEGER, TEXT, TEXT, INET, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_receive_nps_webhook(
  TIMESTAMPTZ, TEXT, TEXT, INTEGER, TEXT, TEXT, INET, TEXT
) TO service_role;

COMMENT ON FUNCTION public.cs_cx_receive_nps_webhook(
  TIMESTAMPTZ, TEXT, TEXT, INTEGER, TEXT, TEXT, INET, TEXT
) IS 'Recebe NPS externo após autenticação da Edge Function, resolve cartório, deduplica e audita atomicamente.';

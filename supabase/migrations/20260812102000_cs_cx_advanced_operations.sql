-- Operações avançadas de Visitas e NPS.

DROP POLICY IF EXISTS cs_cx_storage_read ON storage.objects;
DROP POLICY IF EXISTS cs_cx_storage_insert ON storage.objects;
DROP POLICY IF EXISTS cs_cx_storage_update ON storage.objects;
DROP POLICY IF EXISTS cs_cx_storage_delete ON storage.objects;
DROP POLICY IF EXISTS cs_cx_visit_storage_read ON storage.objects;
DROP POLICY IF EXISTS cs_cx_visit_storage_insert ON storage.objects;
DROP POLICY IF EXISTS cs_cx_visit_storage_update ON storage.objects;
DROP POLICY IF EXISTS cs_cx_visit_storage_delete ON storage.objects;

DROP POLICY IF EXISTS cs_cx_visit_checklist_write ON public.cs_cx_visit_checklist_items;
DROP POLICY IF EXISTS cs_cx_visit_pending_write ON public.cs_cx_visit_pending_items;
DROP POLICY IF EXISTS cs_cx_visit_attachments_write ON public.cs_cx_visit_attachments;

CREATE POLICY cs_cx_visit_checklist_edit ON public.cs_cx_visit_checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'));
CREATE POLICY cs_cx_visit_checklist_update ON public.cs_cx_visit_checklist_items
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'));
CREATE POLICY cs_cx_visit_checklist_delete ON public.cs_cx_visit_checklist_items
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'delete'));

CREATE POLICY cs_cx_visit_pending_edit ON public.cs_cx_visit_pending_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'));
CREATE POLICY cs_cx_visit_pending_update ON public.cs_cx_visit_pending_items
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'));
CREATE POLICY cs_cx_visit_pending_delete ON public.cs_cx_visit_pending_items
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'delete'));

CREATE POLICY cs_cx_visit_attachments_edit ON public.cs_cx_visit_attachments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'));
CREATE POLICY cs_cx_visit_attachments_update ON public.cs_cx_visit_attachments
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'));
CREATE POLICY cs_cx_visit_attachments_delete ON public.cs_cx_visit_attachments
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_visitas', 'delete'));

CREATE POLICY cs_cx_storage_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cs-cx-attachments'
    AND (
      (name LIKE 'requests/%' AND public.has_permission(auth.uid(), 'cs_cx_registros', 'view'))
      OR (name LIKE 'visits/%' AND public.has_permission(auth.uid(), 'cs_cx_visitas', 'view'))
    )
  );
CREATE POLICY cs_cx_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cs-cx-attachments'
    AND (
      (name LIKE 'requests/%' AND public.has_permission(auth.uid(), 'cs_cx_registros', 'create'))
      OR (name LIKE 'visits/%' AND public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'))
    )
  );
CREATE POLICY cs_cx_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cs-cx-attachments'
    AND (
      (name LIKE 'requests/%' AND public.has_permission(auth.uid(), 'cs_cx_registros', 'edit'))
      OR (name LIKE 'visits/%' AND public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'))
    )
  )
  WITH CHECK (
    bucket_id = 'cs-cx-attachments'
    AND (
      (name LIKE 'requests/%' AND public.has_permission(auth.uid(), 'cs_cx_registros', 'edit'))
      OR (name LIKE 'visits/%' AND public.has_permission(auth.uid(), 'cs_cx_visitas', 'edit'))
    )
  );
CREATE POLICY cs_cx_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cs-cx-attachments'
    AND (
      (name LIKE 'requests/%' AND public.has_permission(auth.uid(), 'cs_cx_registros', 'delete'))
      OR (name LIKE 'visits/%' AND public.has_permission(auth.uid(), 'cs_cx_visitas', 'delete'))
    )
  );

CREATE TRIGGER audit_cs_cx_visit_checklist
  AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_visit_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('item_checklist_visita');
CREATE TRIGGER audit_cs_cx_visit_pending
  AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_visit_pending_items
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('pendencia_visita');
CREATE TRIGGER audit_cs_cx_visit_attachments
  AFTER INSERT OR UPDATE OR DELETE ON public.cs_cx_visit_attachments
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_capture_native_audit('anexo_visita');

CREATE OR REPLACE FUNCTION public.cs_cx_generate_visit_request(p_pending_item_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  pending_row public.cs_cx_visit_pending_items%ROWTYPE;
  visit_row public.cs_cx_visits%ROWTYPE;
  visitor_name TEXT;
  generated_request_id UUID;
BEGIN
  SELECT * INTO pending_row
  FROM public.cs_cx_visit_pending_items
  WHERE id = p_pending_item_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Pendência não encontrada'; END IF;
  IF pending_row.request_id IS NOT NULL THEN RETURN pending_row.request_id; END IF;

  SELECT * INTO visit_row FROM public.cs_cx_visits WHERE id = pending_row.visit_id;
  SELECT COALESCE(full_name, 'Usuário do HUB') INTO visitor_name
  FROM public.profiles WHERE id = visit_row.visitor_profile_id;
  visitor_name := COALESCE(visitor_name, 'Usuário do HUB');

  INSERT INTO public.cs_cx_requests (
    ticket_number, description, module, requester, responsible,
    requested_on, status, notes, registry_office_id, author_profile_id,
    origin, source_present
  ) VALUES (
    'VISITA-' || left(visit_row.id::text, 8) || '-' || left(pending_row.id::text, 8),
    'Pendência identificada na visita: ' || pending_row.title || E'\n\n' ||
      'Descrição: ' || pending_row.description || E'\n' ||
      'Prioridade: ' || pending_row.priority || E'\n' ||
      'Categoria: ' || COALESCE(pending_row.category, 'Não informada') || E'\n' ||
      'Data da visita: ' || to_char(visit_row.visit_date, 'DD/MM/YYYY') || E'\n' ||
      'Visitante: ' || visitor_name,
    'Visitas aos Cartórios', visitor_name, visitor_name,
    current_date, 'Aguardando',
    concat_ws(E'\n\n', NULLIF(pending_row.notes, ''), 'Gerado automaticamente a partir de uma pendência da visita.'),
    visit_row.registry_office_id, auth.uid(), 'hub', true
  ) RETURNING id INTO generated_request_id;

  UPDATE public.cs_cx_visit_pending_items
  SET request_id = generated_request_id
  WHERE id = p_pending_item_id;

  RETURN generated_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_import_nps(
  p_registry_office_id UUID,
  p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  imported_count INTEGER := 0;
  duplicate_count INTEGER := 0;
  response_timestamp TIMESTAMPTZ;
  response_name TEXT;
  response_score INTEGER;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'As respostas devem ser enviadas em uma lista';
  END IF;
  IF jsonb_array_length(p_rows) > 5000 THEN
    RAISE EXCEPTION 'Uma importação pode conter no máximo 5000 respostas';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    response_timestamp := (item->>'responded_at')::timestamptz;
    response_name := trim(item->>'respondent_name');
    response_score := (item->>'score')::integer;

    IF response_timestamp IS NULL
      OR response_name IS NULL
      OR response_name = ''
      OR response_score IS NULL
      OR response_score NOT BETWEEN 0 AND 10
    THEN
      RAISE EXCEPTION 'Resposta NPS inválida';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(
      p_registry_office_id::text || '|' || lower(response_name) || '|' || response_timestamp::text,
      0
    ));

    IF EXISTS (
      SELECT 1 FROM public.cs_cx_nps_responses response
      WHERE response.registry_office_id = p_registry_office_id
        AND lower(response.respondent_name) = lower(response_name)
        AND response.responded_at = response_timestamp
        AND response.source_present
    ) THEN
      duplicate_count := duplicate_count + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.cs_cx_nps_responses (
      registry_office_id, author_profile_id, responded_at, respondent_name,
      respondent_office, score, score_reason, improvement_suggestion,
      classification, origin, source_present
    ) VALUES (
      p_registry_office_id, auth.uid(), response_timestamp, response_name,
      COALESCE(NULLIF(trim(item->>'respondent_office'), ''), response_name),
      response_score, NULLIF(trim(item->>'score_reason'), ''),
      NULLIF(trim(item->>'improvement_suggestion'), ''),
      CASE WHEN response_score >= 9 THEN 'PROMOTOR'
           WHEN response_score >= 7 THEN 'NEUTRO' ELSE 'DETRATOR' END,
      'hub', true
    );
    imported_count := imported_count + 1;
  END LOOP;

  RETURN jsonb_build_object('imported', imported_count, 'duplicates', duplicate_count);
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_generate_visit_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_cx_generate_visit_request(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.cs_cx_import_nps(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_cx_import_nps(UUID, JSONB) TO authenticated;

COMMENT ON FUNCTION public.cs_cx_generate_visit_request(UUID) IS
  'Cria uma solicitação a partir de uma pendência de visita e vincula ambas atomicamente.';
COMMENT ON FUNCTION public.cs_cx_import_nps(UUID, JSONB) IS
  'Importa respostas NPS validadas, ignorando duplicatas por cartório, respondente e instante.';

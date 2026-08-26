-- Preserva a trilha cronologica dos status das solicitacoes do CS/CX.

CREATE TABLE IF NOT EXISTS public.cs_cx_request_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.cs_cx_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (NULLIF(trim(status), '') IS NOT NULL),
  author_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_cx_request_status_history_request
  ON public.cs_cx_request_status_history(request_id, occurred_at, id);

ALTER TABLE public.cs_cx_request_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cs_cx_request_status_history_read
  ON public.cs_cx_request_status_history;
CREATE POLICY cs_cx_request_status_history_read
  ON public.cs_cx_request_status_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cs_cx_requests request
      WHERE request.id = request_id
        AND public.cs_cx_can_view_owned(
          'cs_cx_registros',
          request.author_profile_id
        )
    )
  );

DROP POLICY IF EXISTS cs_cx_request_status_history_create
  ON public.cs_cx_request_status_history;
CREATE POLICY cs_cx_request_status_history_create
  ON public.cs_cx_request_status_history FOR INSERT TO authenticated
  WITH CHECK (
    author_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.cs_cx_requests request
      WHERE request.id = request_id
        AND (
          public.cs_cx_can_manage_owned(
            'cs_cx_registros',
            'edit',
            request.author_profile_id
          )
          OR (
            public.has_permission(auth.uid(), 'cs_cx_registros', 'create')
            AND request.author_profile_id = auth.uid()
          )
        )
    )
  );

-- O status vigente vira o primeiro item do historico dos registros existentes.
INSERT INTO public.cs_cx_request_status_history (
  request_id,
  status,
  author_profile_id,
  occurred_at,
  origin,
  created_at
)
SELECT
  request.id,
  trim(request.status),
  request.author_profile_id,
  COALESCE(request.updated_at, request.created_at, now()),
  request.origin,
  COALESCE(request.created_at, now())
FROM public.cs_cx_requests request
WHERE NULLIF(trim(request.status), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.cs_cx_request_status_history history
    WHERE history.request_id = request.id
  );

CREATE OR REPLACE FUNCTION public.cs_cx_save_request_v2(
  p_id UUID,
  p_ticket_number TEXT,
  p_description TEXT,
  p_module TEXT,
  p_requester TEXT,
  p_responsible TEXT,
  p_requested_on DATE,
  p_expected_delivery_on DATE,
  p_delivered_on DATE,
  p_status TEXT,
  p_registry_office_id UUID,
  p_new_observation TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  saved_id UUID;
  previous_status TEXT;
  normalized_observation TEXT := NULLIF(trim(p_new_observation), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;
  IF NULLIF(trim(p_description), '') IS NULL THEN
    RAISE EXCEPTION 'Informe a descricao da solicitacao';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.cs_cx_request_statuses status_entry
    WHERE status_entry.name = p_status AND status_entry.active
  ) THEN
    RAISE EXCEPTION 'Status de solicitacao invalido ou inativo';
  END IF;

  IF p_id IS NULL THEN
    IF NOT public.has_permission(auth.uid(), 'cs_cx_registros', 'create') THEN
      RAISE EXCEPTION 'Sem permissao para criar solicitacoes';
    END IF;

    INSERT INTO public.cs_cx_requests (
      ticket_number, description, module, requester, responsible, requested_on,
      expected_delivery_on, delivered_on, status, notes, registry_office_id,
      author_profile_id, origin, source_present
    ) VALUES (
      NULLIF(trim(p_ticket_number), ''), trim(p_description),
      NULLIF(trim(p_module), ''), NULLIF(trim(p_requester), ''),
      NULLIF(trim(p_responsible), ''), p_requested_on,
      p_expected_delivery_on, p_delivered_on, p_status,
      normalized_observation, p_registry_office_id, auth.uid(), 'hub', true
    )
    RETURNING id INTO saved_id;
  ELSE
    IF NOT public.has_permission(auth.uid(), 'cs_cx_registros', 'edit') THEN
      RAISE EXCEPTION 'Sem permissao para editar solicitacoes';
    END IF;

    SELECT request.status
    INTO previous_status
    FROM public.cs_cx_requests request
    WHERE request.id = p_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Solicitacao nao encontrada';
    END IF;

    UPDATE public.cs_cx_requests
    SET ticket_number = NULLIF(trim(p_ticket_number), ''),
        description = trim(p_description),
        module = NULLIF(trim(p_module), ''),
        requester = NULLIF(trim(p_requester), ''),
        responsible = NULLIF(trim(p_responsible), ''),
        requested_on = p_requested_on,
        expected_delivery_on = p_expected_delivery_on,
        delivered_on = p_delivered_on,
        status = p_status,
        registry_office_id = p_registry_office_id,
        updated_at = now()
    WHERE id = p_id
    RETURNING id INTO saved_id;

    IF saved_id IS NULL THEN
      RAISE EXCEPTION 'Solicitacao nao encontrada';
    END IF;
  END IF;

  IF p_id IS NULL OR previous_status IS DISTINCT FROM p_status THEN
    INSERT INTO public.cs_cx_request_status_history (
      request_id, status, author_profile_id, origin
    ) VALUES (
      saved_id, p_status, auth.uid(), 'hub'
    );
  END IF;

  IF normalized_observation IS NOT NULL THEN
    INSERT INTO public.cs_cx_request_updates (
      request_id, observation, author_profile_id, origin
    ) VALUES (
      saved_id, normalized_observation, auth.uid(), 'hub'
    );
  END IF;

  RETURN saved_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_update_request_status(
  p_id UUID,
  p_status TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  previous_status TEXT;
  saved_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;
  IF NOT public.has_permission(auth.uid(), 'cs_cx_registros', 'edit') THEN
    RAISE EXCEPTION 'Sem permissao para editar solicitacoes';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.cs_cx_request_statuses status_entry
    WHERE status_entry.name = p_status AND status_entry.active
  ) THEN
    RAISE EXCEPTION 'Status de solicitacao invalido ou inativo';
  END IF;

  SELECT request.status
  INTO previous_status
  FROM public.cs_cx_requests request
  WHERE request.id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitacao nao encontrada';
  END IF;

  IF previous_status IS NOT DISTINCT FROM p_status THEN
    RETURN p_id;
  END IF;

  UPDATE public.cs_cx_requests
  SET status = p_status,
      updated_at = now()
  WHERE id = p_id
  RETURNING id INTO saved_id;

  IF saved_id IS NULL THEN
    RAISE EXCEPTION 'Solicitacao nao encontrada';
  END IF;

  INSERT INTO public.cs_cx_request_status_history (
    request_id, status, author_profile_id, origin
  ) VALUES (
    saved_id, p_status, auth.uid(), 'hub'
  );

  RETURN saved_id;
END;
$$;

REVOKE ALL ON TABLE public.cs_cx_request_status_history FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.cs_cx_request_status_history TO authenticated;

REVOKE ALL ON FUNCTION public.cs_cx_save_request_v2(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, UUID, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_request_v2(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, UUID, TEXT
) TO authenticated;

REVOKE ALL ON FUNCTION public.cs_cx_update_request_status(UUID, TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_cx_update_request_status(UUID, TEXT)
  TO authenticated;

COMMENT ON TABLE public.cs_cx_request_status_history IS
  'Historico cronologico e imutavel dos status assumidos por cada solicitacao.';

NOTIFY pgrst, 'reload schema';

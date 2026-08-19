-- Ajustes solicitados na homologacao operacional do modulo CS/CX.
-- Mantem os campos legados e adiciona catalogo de status e observacoes imutaveis.

CREATE TABLE IF NOT EXISTS public.cs_cx_request_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (NULLIF(trim(name), '') IS NOT NULL),
  color TEXT NOT NULL DEFAULT 'slate',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cs_cx_request_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.cs_cx_requests(id) ON DELETE CASCADE,
  observation TEXT NOT NULL CHECK (NULLIF(trim(observation), '') IS NOT NULL),
  author_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('legacy', 'hub')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_cx_request_statuses_order
  ON public.cs_cx_request_statuses(active DESC, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_cs_cx_request_updates_request
  ON public.cs_cx_request_updates(request_id, occurred_at DESC);

ALTER TABLE public.cs_cx_request_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_request_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cs_cx_request_statuses_read ON public.cs_cx_request_statuses;
CREATE POLICY cs_cx_request_statuses_read
  ON public.cs_cx_request_statuses FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'cs_cx_registros', 'view')
    OR public.has_permission(auth.uid(), 'cs_cx_admin', 'view')
  );

DROP POLICY IF EXISTS cs_cx_request_statuses_manage ON public.cs_cx_request_statuses;
CREATE POLICY cs_cx_request_statuses_manage
  ON public.cs_cx_request_statuses FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'));

DROP POLICY IF EXISTS cs_cx_request_updates_read ON public.cs_cx_request_updates;
CREATE POLICY cs_cx_request_updates_read
  ON public.cs_cx_request_updates FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_registros', 'view'));

DROP POLICY IF EXISTS cs_cx_request_updates_create ON public.cs_cx_request_updates;
CREATE POLICY cs_cx_request_updates_create
  ON public.cs_cx_request_updates FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'cs_cx_registros', 'create')
    OR public.has_permission(auth.uid(), 'cs_cx_registros', 'edit')
  );

DROP POLICY IF EXISTS cs_cx_request_updates_delete ON public.cs_cx_request_updates;
CREATE POLICY cs_cx_request_updates_delete
  ON public.cs_cx_request_updates FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_registros', 'delete'));

INSERT INTO public.cs_cx_request_statuses
  (name, color, sort_order, active, is_system)
VALUES
  ('Aguardando', 'amber', 10, true, true),
  ('Projeto', 'violet', 20, true, true),
  ('Desenvolvimento', 'blue', 30, true, true),
  ('Em andamento', 'cyan', 40, true, true),
  ('Sustentação', 'orange', 50, true, false),
  ('FastTrack', 'fuchsia', 60, true, false),
  ('Finalizado', 'emerald', 70, true, true),
  ('Negado', 'red', 80, true, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.cs_cx_request_statuses
  (name, color, sort_order, active, is_system)
SELECT DISTINCT trim(request.status), 'slate', 100, true, false
FROM public.cs_cx_requests request
WHERE NULLIF(trim(request.status), '') IS NOT NULL
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.cs_cx_request_updates
  (request_id, observation, author_profile_id, occurred_at, origin, created_at)
SELECT request.id, trim(request.notes), request.author_profile_id,
       COALESCE(request.updated_at, request.created_at, now()), request.origin,
       COALESCE(request.created_at, now())
FROM public.cs_cx_requests request
WHERE NULLIF(trim(request.notes), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.cs_cx_request_updates update_entry
    WHERE update_entry.request_id = request.id
      AND update_entry.observation = trim(request.notes)
      AND update_entry.origin = request.origin
  );

DROP FUNCTION IF EXISTS public.cs_cx_set_routine_item(UUID, BOOLEAN, TEXT);
CREATE FUNCTION public.cs_cx_set_routine_item(
  p_config_id UUID,
  p_active BOOLEAN,
  p_analysis_notes TEXT DEFAULT NULL,
  p_analyzed_at TIMESTAMPTZ DEFAULT now()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  old_row public.cs_cx_office_routine_items%ROWTYPE;
  analysis_time TIMESTAMPTZ := COALESCE(p_analyzed_at, now());
BEGIN
  SELECT * INTO old_row
  FROM public.cs_cx_office_routine_items
  WHERE id = p_config_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item de rotina nao encontrado';
  END IF;

  UPDATE public.cs_cx_office_routine_items
  SET active = p_active,
      analysis_notes = NULLIF(trim(p_analysis_notes), ''),
      configured_by = auth.uid(),
      configured_at = now(),
      analyzed_at = analysis_time
  WHERE id = p_config_id;

  INSERT INTO public.cs_cx_routine_history (
    office_routine_id, model_item_id, action, previous_status, new_status,
    notes, actor_profile_id, occurred_at, origin, source_present
  ) VALUES (
    old_row.office_routine_id,
    old_row.model_item_id,
    CASE WHEN p_active IS TRUE THEN 'ATIVADO'
         WHEN p_active IS FALSE THEN 'DESATIVADO'
         ELSE 'ANALISADO' END,
    old_row.active,
    p_active,
    NULLIF(trim(p_analysis_notes), ''),
    auth.uid(),
    analysis_time,
    'hub',
    true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_set_routine_item(UUID, BOOLEAN, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_cx_set_routine_item(UUID, BOOLEAN, TEXT, TIMESTAMPTZ) TO authenticated;

CREATE OR REPLACE FUNCTION public.cs_cx_save_registry_office_v3(
  p_id UUID,
  p_name TEXT,
  p_sap_code TEXT DEFAULT NULL,
  p_contact_details TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_active BOOLEAN DEFAULT true,
  p_products JSONB DEFAULT '[]'::jsonb,
  p_responsibles JSONB DEFAULT '[]'::jsonb,
  p_analyst_profile_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved_id UUID;
BEGIN
  saved_id := public.cs_cx_save_registry_office_v2(
    p_id, p_name, p_sap_code, p_contact_details, p_notes, p_active,
    p_products, p_responsibles
  );

  UPDATE public.cs_cx_registry_offices
  SET analyst_profile_id = p_analyst_profile_id,
      updated_at = now()
  WHERE id = saved_id;

  RETURN saved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_save_registry_office_v3(
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, JSONB, UUID
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_registry_office_v3(
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, JSONB, UUID
) TO authenticated;

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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved_id UUID;
  normalized_observation TEXT := NULLIF(trim(p_new_observation), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;
  IF NULLIF(trim(p_description), '') IS NULL THEN
    RAISE EXCEPTION 'Informe a descricao da solicitacao';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.cs_cx_request_statuses status_entry
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
      NULLIF(trim(p_ticket_number), ''), trim(p_description), NULLIF(trim(p_module), ''),
      NULLIF(trim(p_requester), ''), NULLIF(trim(p_responsible), ''), p_requested_on,
      p_expected_delivery_on, p_delivered_on, p_status, normalized_observation,
      p_registry_office_id, auth.uid(), 'hub', true
    ) RETURNING id INTO saved_id;
  ELSE
    IF NOT public.has_permission(auth.uid(), 'cs_cx_registros', 'edit') THEN
      RAISE EXCEPTION 'Sem permissao para editar solicitacoes';
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

  IF normalized_observation IS NOT NULL THEN
    INSERT INTO public.cs_cx_request_updates
      (request_id, observation, author_profile_id, origin)
    VALUES (saved_id, normalized_observation, auth.uid(), 'hub');
  END IF;

  RETURN saved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_save_request_v2(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, UUID, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_request_v2(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, UUID, TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION public.cs_cx_save_request_status(
  p_id UUID,
  p_name TEXT,
  p_color TEXT DEFAULT 'slate',
  p_active BOOLEAN DEFAULT true,
  p_sort_order INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved_id UUID;
  previous_name TEXT;
  normalized_name TEXT := NULLIF(trim(p_name), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'manage') THEN
    RAISE EXCEPTION 'Sem permissao para gerenciar status';
  END IF;
  IF normalized_name IS NULL THEN
    RAISE EXCEPTION 'Informe o nome do status';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.cs_cx_request_statuses
      (name, color, active, sort_order, created_by)
    VALUES (normalized_name, p_color, p_active, p_sort_order, auth.uid())
    RETURNING id INTO saved_id;
  ELSE
    SELECT name INTO previous_name
    FROM public.cs_cx_request_statuses
    WHERE id = p_id FOR UPDATE;
    IF previous_name IS NULL THEN
      RAISE EXCEPTION 'Status nao encontrado';
    END IF;

    UPDATE public.cs_cx_requests SET status = normalized_name
    WHERE status = previous_name AND previous_name <> normalized_name;

    UPDATE public.cs_cx_request_statuses
    SET name = normalized_name,
        color = p_color,
        active = p_active,
        sort_order = p_sort_order,
        updated_at = now()
    WHERE id = p_id
    RETURNING id INTO saved_id;
  END IF;
  RETURN saved_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_delete_request_status(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_name TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'manage') THEN
    RAISE EXCEPTION 'Sem permissao para gerenciar status';
  END IF;
  SELECT name INTO status_name FROM public.cs_cx_request_statuses WHERE id = p_id;
  IF status_name IS NULL THEN RAISE EXCEPTION 'Status nao encontrado'; END IF;
  IF EXISTS (SELECT 1 FROM public.cs_cx_requests WHERE status = status_name) THEN
    RAISE EXCEPTION 'O status esta em uso e nao pode ser excluido; inative-o';
  END IF;
  DELETE FROM public.cs_cx_request_statuses WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_save_request_status(UUID, TEXT, TEXT, BOOLEAN, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_request_status(UUID, TEXT, TEXT, BOOLEAN, INTEGER) TO authenticated;
REVOKE ALL ON FUNCTION public.cs_cx_delete_request_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_cx_delete_request_status(UUID) TO authenticated;

GRANT SELECT ON public.cs_cx_request_statuses TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.cs_cx_request_updates TO authenticated;

COMMENT ON TABLE public.cs_cx_request_statuses IS
  'Catalogo administravel de status exibidos no fluxo de solicitacoes.';
COMMENT ON TABLE public.cs_cx_request_updates IS
  'Observacoes separadas e cronologicas de cada solicitacao; nao sao sobrescritas na edicao.';

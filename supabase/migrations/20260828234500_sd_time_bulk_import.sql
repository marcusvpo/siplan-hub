-- Importação gerencial semanal das horas dos grupos do SD no Ellevo/0800.

CREATE TABLE IF NOT EXISTS public.sd_time_bulk_import_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  worker_id TEXT,
  attempts SMALLINT NOT NULL DEFAULT 0,
  analyst_count INTEGER NOT NULL DEFAULT 0,
  matched_user_count INTEGER NOT NULL DEFAULT 0,
  unmatched_analyst_count INTEGER NOT NULL DEFAULT 0,
  available_count INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CONSTRAINT sd_time_bulk_import_requests_status_check
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT sd_time_bulk_import_requests_week_check
    CHECK (end_date = start_date + 6),
  CONSTRAINT sd_time_bulk_import_requests_counts_check
    CHECK (
      attempts >= 0
      AND analyst_count >= 0
      AND matched_user_count >= 0
      AND unmatched_analyst_count >= 0
      AND available_count >= 0
      AND imported_count >= 0
      AND skipped_count >= 0
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sd_time_bulk_import_requests_active
  ON public.sd_time_bulk_import_requests (requested_by, start_date)
  WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_sd_time_bulk_import_requests_pending
  ON public.sd_time_bulk_import_requests (requested_at)
  WHERE status = 'pending';

ALTER TABLE public.sd_time_bulk_import_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read requested SD bulk time imports" ON public.sd_time_bulk_import_requests;
CREATE POLICY "Read requested SD bulk time imports"
  ON public.sd_time_bulk_import_requests FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    AND public.has_permission(auth.uid(), 'sd_time_management', 'view')
  );

REVOKE ALL ON public.sd_time_bulk_import_requests FROM authenticated;
GRANT SELECT ON public.sd_time_bulk_import_requests TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'sd_time_bulk_import_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sd_time_bulk_import_requests;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_sd_time_bulk_import(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(auth.uid(), 'sd_time_management', 'view') THEN
    RAISE EXCEPTION 'Sem permissão para importar as horas da equipe.' USING ERRCODE = '42501';
  END IF;
  IF p_start_date IS NULL
     OR p_end_date IS NULL
     OR p_end_date <> p_start_date + 6
     OR p_start_date < current_date - 366
     OR p_end_date > current_date + 7 THEN
    RAISE EXCEPTION 'Semana de importação inválida.';
  END IF;

  SELECT request.id INTO v_request_id
  FROM public.sd_time_bulk_import_requests request
  WHERE request.requested_by = auth.uid()
    AND request.start_date = p_start_date
    AND request.status IN ('pending', 'processing')
  ORDER BY request.requested_at DESC
  LIMIT 1;

  IF v_request_id IS NOT NULL THEN
    RETURN v_request_id;
  END IF;

  INSERT INTO public.sd_time_bulk_import_requests (requested_by, start_date, end_date)
  VALUES (auth.uid(), p_start_date, p_end_date)
  RETURNING id INTO v_request_id;
  RETURN v_request_id;
EXCEPTION
  WHEN unique_violation THEN
    SELECT request.id INTO v_request_id
    FROM public.sd_time_bulk_import_requests request
    WHERE request.requested_by = auth.uid()
      AND request.start_date = p_start_date
      AND request.status IN ('pending', 'processing')
    ORDER BY request.requested_at DESC
    LIMIT 1;
    RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_sd_time_bulk_import_request(p_worker_id TEXT)
RETURNS public.sd_time_bulk_import_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.sd_time_bulk_import_requests;
BEGIN
  UPDATE public.sd_time_bulk_import_requests
  SET status = 'pending', worker_id = NULL, started_at = NULL, error_message = NULL
  WHERE status = 'processing'
    AND started_at < now() - interval '10 minutes'
    AND attempts < 3;

  UPDATE public.sd_time_bulk_import_requests
  SET status = 'failed',
      error_message = coalesce(error_message, 'Importação interrompida após três tentativas.'),
      completed_at = now()
  WHERE status = 'processing'
    AND started_at < now() - interval '10 minutes'
    AND attempts >= 3;

  UPDATE public.sd_time_bulk_import_requests
  SET status = 'processing',
      worker_id = left(coalesce(p_worker_id, 'worker'), 120),
      attempts = attempts + 1,
      started_at = now(),
      completed_at = NULL,
      error_message = NULL
  WHERE id = (
    SELECT id
    FROM public.sd_time_bulk_import_requests
    WHERE status = 'pending'
    ORDER BY requested_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING * INTO v_request;

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_sd_time_bulk_import(
  p_request_id UUID,
  p_items JSONB,
  p_analyst_count INTEGER,
  p_matched_user_count INTEGER,
  p_unmatched_analyst_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.sd_time_bulk_import_requests;
  v_item JSONB;
  v_entry_id UUID;
  v_available INTEGER := 0;
  v_imported INTEGER := 0;
  v_work_date DATE;
  v_user_id UUID;
BEGIN
  SELECT * INTO v_request
  FROM public.sd_time_bulk_import_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL OR v_request.status <> 'processing' THEN
    RAISE EXCEPTION 'Pedido de importação geral não encontrado ou fora de processamento.';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) > 10000 THEN
    RAISE EXCEPTION 'Conteúdo da importação geral inválido.';
  END IF;
  IF p_analyst_count < 0
     OR p_matched_user_count < 0
     OR p_unmatched_analyst_count < 0
     OR p_matched_user_count + p_unmatched_analyst_count <> p_analyst_count THEN
    RAISE EXCEPTION 'Contadores da importação geral inválidos.';
  END IF;

  v_available := jsonb_array_length(p_items);
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_work_date := (v_item->>'work_date')::date;
      v_user_id := (v_item->>'user_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'O 0800 retornou usuário ou data inválidos.';
    END;

    IF v_work_date < v_request.start_date
       OR v_work_date > v_request.end_date
       OR coalesce(v_item->>'external_id', '') = ''
       OR coalesce(v_item->>'title', '') = ''
       OR coalesce(v_item->>'start', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       OR coalesce(v_item->>'end', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       OR (v_item->>'end')::time <= (v_item->>'start')::time THEN
      RAISE EXCEPTION 'O 0800 retornou um lançamento inválido.';
    END IF;

    v_entry_id := NULL;
    INSERT INTO public.sd_time_entries (
      user_id, work_date, title, description, source,
      source_external_id, source_metadata, imported_at
    ) VALUES (
      v_user_id,
      v_work_date,
      left(btrim(v_item->>'title'), 120),
      nullif(left(btrim(coalesce(v_item->>'description', '')), 20000), ''),
      'ellevo_0800',
      v_item->>'external_id',
      coalesce(v_item->'metadata', '{}'::jsonb),
      now()
    )
    ON CONFLICT (source, source_external_id) WHERE source_external_id IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_entry_id;

    IF v_entry_id IS NOT NULL THEN
      INSERT INTO public.sd_time_intervals (entry_id, started_at, ended_at, position)
      VALUES (v_entry_id, (v_item->>'start')::time, (v_item->>'end')::time, 0);
      v_imported := v_imported + 1;
    END IF;
  END LOOP;

  UPDATE public.sd_time_bulk_import_requests
  SET status = 'completed',
      analyst_count = p_analyst_count,
      matched_user_count = p_matched_user_count,
      unmatched_analyst_count = p_unmatched_analyst_count,
      available_count = v_available,
      imported_count = v_imported,
      skipped_count = v_available - v_imported,
      error_message = NULL,
      completed_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'analyst_count', p_analyst_count,
    'matched_user_count', p_matched_user_count,
    'unmatched_analyst_count', p_unmatched_analyst_count,
    'available_count', v_available,
    'imported_count', v_imported,
    'skipped_count', v_available - v_imported
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_sd_time_bulk_import(DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_sd_time_bulk_import_request(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_sd_time_bulk_import(UUID, JSONB, INTEGER, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_sd_time_bulk_import(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_sd_time_bulk_import_request(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_sd_time_bulk_import(UUID, JSONB, INTEGER, INTEGER, INTEGER) TO service_role;

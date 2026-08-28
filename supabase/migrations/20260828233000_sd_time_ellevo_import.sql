-- Importação idempotente dos tempos do Ellevo/0800 para os lançamentos pessoais do SD.

ALTER TABLE public.sd_time_entries
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,
  ADD COLUMN IF NOT EXISTS source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

ALTER TABLE public.sd_time_entries
  DROP CONSTRAINT IF EXISTS sd_time_entries_source_check;
ALTER TABLE public.sd_time_entries
  ADD CONSTRAINT sd_time_entries_source_check
  CHECK (source IN ('manual', 'ellevo_0800'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_sd_time_entries_external_source
  ON public.sd_time_entries (source, source_external_id)
  WHERE source_external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sd_time_import_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  worker_id TEXT,
  attempts SMALLINT NOT NULL DEFAULT 0,
  available_count INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CONSTRAINT sd_time_import_requests_status_check
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT sd_time_import_requests_counts_check
    CHECK (attempts >= 0 AND available_count >= 0 AND imported_count >= 0 AND skipped_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sd_time_import_requests_active
  ON public.sd_time_import_requests (user_id, work_date)
  WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_sd_time_import_requests_pending
  ON public.sd_time_import_requests (requested_at)
  WHERE status = 'pending';

ALTER TABLE public.sd_time_import_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own SD time import requests" ON public.sd_time_import_requests;
CREATE POLICY "Read own SD time import requests"
  ON public.sd_time_import_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.sd_time_import_requests FROM authenticated;
GRANT SELECT ON public.sd_time_import_requests TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'sd_time_import_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sd_time_import_requests;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_sd_time_import(p_work_date DATE)
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

  IF NOT public.has_permission(auth.uid(), 'sd_time_entries', 'create') THEN
    RAISE EXCEPTION 'Sem permissão para importar lançamentos de horas.' USING ERRCODE = '42501';
  END IF;

  IF p_work_date IS NULL OR p_work_date < current_date - 366 OR p_work_date > current_date + 1 THEN
    RAISE EXCEPTION 'Data de importação inválida.';
  END IF;

  SELECT request.id INTO v_request_id
  FROM public.sd_time_import_requests request
  WHERE request.user_id = auth.uid()
    AND request.work_date = p_work_date
    AND request.status IN ('pending', 'processing')
  ORDER BY request.requested_at DESC
  LIMIT 1;

  IF v_request_id IS NOT NULL THEN
    RETURN v_request_id;
  END IF;

  INSERT INTO public.sd_time_import_requests (user_id, work_date)
  VALUES (auth.uid(), p_work_date)
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
EXCEPTION
  WHEN unique_violation THEN
    SELECT request.id INTO v_request_id
    FROM public.sd_time_import_requests request
    WHERE request.user_id = auth.uid()
      AND request.work_date = p_work_date
      AND request.status IN ('pending', 'processing')
    ORDER BY request.requested_at DESC
    LIMIT 1;
    RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_sd_time_import_request(p_worker_id TEXT)
RETURNS public.sd_time_import_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.sd_time_import_requests;
BEGIN
  UPDATE public.sd_time_import_requests
  SET status = 'pending',
      worker_id = NULL,
      started_at = NULL,
      error_message = NULL
  WHERE status = 'processing'
    AND started_at < now() - interval '10 minutes'
    AND attempts < 3;

  UPDATE public.sd_time_import_requests
  SET status = 'failed',
      error_message = coalesce(error_message, 'Importação interrompida após três tentativas.'),
      completed_at = now()
  WHERE status = 'processing'
    AND started_at < now() - interval '10 minutes'
    AND attempts >= 3;

  UPDATE public.sd_time_import_requests
  SET status = 'processing',
      worker_id = left(coalesce(p_worker_id, 'worker'), 120),
      attempts = attempts + 1,
      started_at = now(),
      completed_at = NULL,
      error_message = NULL
  WHERE id = (
    SELECT id
    FROM public.sd_time_import_requests
    WHERE status = 'pending'
    ORDER BY requested_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING * INTO v_request;

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_sd_time_import(
  p_request_id UUID,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.sd_time_import_requests;
  v_item JSONB;
  v_entry_id UUID;
  v_available INTEGER := 0;
  v_imported INTEGER := 0;
BEGIN
  SELECT * INTO v_request
  FROM public.sd_time_import_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL OR v_request.status <> 'processing' THEN
    RAISE EXCEPTION 'Pedido de importação não encontrado ou fora de processamento.';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) > 500 THEN
    RAISE EXCEPTION 'Conteúdo da importação inválido.';
  END IF;

  v_available := jsonb_array_length(p_items);
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF coalesce(v_item->>'external_id', '') = ''
       OR coalesce(v_item->>'title', '') = ''
       OR coalesce(v_item->>'start', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       OR coalesce(v_item->>'end', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       OR (v_item->>'end')::time <= (v_item->>'start')::time THEN
      RAISE EXCEPTION 'O 0800 retornou um lançamento inválido.';
    END IF;

    v_entry_id := NULL;
    INSERT INTO public.sd_time_entries (
      user_id,
      work_date,
      title,
      description,
      source,
      source_external_id,
      source_metadata,
      imported_at
    ) VALUES (
      v_request.user_id,
      v_request.work_date,
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

  UPDATE public.sd_time_import_requests
  SET status = 'completed',
      available_count = v_available,
      imported_count = v_imported,
      skipped_count = v_available - v_imported,
      error_message = NULL,
      completed_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'available_count', v_available,
    'imported_count', v_imported,
    'skipped_count', v_available - v_imported
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_sd_time_import(DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_sd_time_import_request(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_sd_time_import(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_sd_time_import(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_sd_time_import_request(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_sd_time_import(UUID, JSONB) TO service_role;

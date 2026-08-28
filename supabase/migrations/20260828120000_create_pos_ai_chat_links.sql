-- Centralizes public assistant links independently from implementation projects.
-- Existing project UUIDs remain valid link scopes; standalone clients receive a new UUID.

CREATE TABLE IF NOT EXISTS public.pos_ai_chat_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE REFERENCES public.projects(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  system_type TEXT NOT NULL DEFAULT 'Orion TN',
  enabled BOOLEAN NOT NULL DEFAULT true,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pos_ai_chat_links_client_name_length
    CHECK (char_length(btrim(client_name)) BETWEEN 2 AND 160),
  CONSTRAINT pos_ai_chat_links_system_type_length
    CHECK (char_length(btrim(system_type)) BETWEEN 2 AND 80)
);

CREATE INDEX IF NOT EXISTS idx_pos_ai_chat_links_status
  ON public.pos_ai_chat_links (enabled, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_ai_chat_links_client_name
  ON public.pos_ai_chat_links (lower(client_name));

ALTER TABLE public.pos_ai_chat_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage pos ai chat links"
  ON public.pos_ai_chat_links;
CREATE POLICY "Authenticated users can manage pos ai chat links"
  ON public.pos_ai_chat_links
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_pos_ai_chat_links_updated_at
  ON public.pos_ai_chat_links;
CREATE TRIGGER update_pos_ai_chat_links_updated_at
  BEFORE UPDATE ON public.pos_ai_chat_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Preserve all previously configured project links and their public URLs.
INSERT INTO public.pos_ai_chat_links (
  id,
  project_id,
  client_name,
  system_type,
  enabled,
  activated_at,
  disabled_at
)
SELECT
  project.id,
  project.id,
  project.client_name,
  COALESCE(NULLIF(project.system_type, ''), 'Orion TN'),
  CASE
    WHEN project.custom_fields ? 'pos_assistant_enabled'
      THEN COALESCE((project.custom_fields->>'pos_assistant_enabled')::BOOLEAN, false)
    ELSE EXISTS (
      SELECT 1 FROM public.pos_ai_chat_messages message WHERE message.project_id = project.id
    )
  END,
  COALESCE(
    NULLIF(project.custom_fields->>'pos_assistant_activated_at', '')::TIMESTAMPTZ,
    project.created_at,
    now()
  ),
  NULLIF(project.custom_fields->>'pos_assistant_disabled_at', '')::TIMESTAMPTZ
FROM public.projects project
WHERE project.is_deleted = false
  AND (
    project.custom_fields ? 'pos_assistant_enabled'
    OR project.custom_fields ? 'pos_assistant_activated_at'
    OR EXISTS (
      SELECT 1 FROM public.pos_ai_chat_messages message WHERE message.project_id = project.id
    )
  )
  AND (
    project.system_type IN ('Orion TN', 'OrionTN', 'Modelos TN')
    OR COALESCE(project.products, ARRAY[]::TEXT[]) @> ARRAY['Orion TN']::TEXT[]
  )
ON CONFLICT (id) DO NOTHING;

-- project_id is now a chat-link scope. It may reference a project UUID (legacy)
-- or a standalone pos_ai_chat_links UUID, so a single-table foreign key is invalid.
ALTER TABLE public.pos_ai_chat_messages
  DROP CONSTRAINT IF EXISTS pos_ai_chat_messages_project_id_fkey;
ALTER TABLE public.pos_ai_chat_sessions
  DROP CONSTRAINT IF EXISTS pos_ai_chat_sessions_project_id_fkey;
ALTER TABLE public.pos_ai_chat_visitors
  DROP CONSTRAINT IF EXISTS pos_ai_chat_visitors_project_id_fkey;

COMMENT ON COLUMN public.pos_ai_chat_messages.project_id IS
  'Chat link scope UUID. Kept as project_id for backward compatibility.';
COMMENT ON COLUMN public.pos_ai_chat_sessions.project_id IS
  'Chat link scope UUID. Kept as project_id for backward compatibility.';
COMMENT ON COLUMN public.pos_ai_chat_visitors.project_id IS
  'Chat link scope UUID. Kept as project_id for backward compatibility.';

CREATE OR REPLACE FUNCTION public.is_pos_chat_link_enabled(p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT
        link.enabled
        AND (
          link.project_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.projects linked_project
            WHERE linked_project.id = link.project_id
              AND linked_project.is_deleted = false
          )
        )
      FROM public.pos_ai_chat_links link
      WHERE link.id = p_id
    ),
    (
      SELECT
        project.is_deleted = false
        AND project.custom_fields->>'pos_assistant_enabled' = 'true'
      FROM public.projects project
      WHERE project.id = p_id
    ),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_pos_chat_link_enabled(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_pos_assistant_project_info(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.pos_ai_chat_links%ROWTYPE;
  v_project public.projects%ROWTYPE;
BEGIN
  SELECT * INTO v_link
  FROM public.pos_ai_chat_links link
  WHERE link.id = p_id;

  IF FOUND THEN
    IF v_link.project_id IS NOT NULL THEN
      SELECT * INTO v_project
      FROM public.projects project
      WHERE project.id = v_link.project_id
        AND project.is_deleted = false;
    END IF;

    RETURN jsonb_build_object(
      'id', v_link.id,
      'project_id', v_link.project_id,
      'client_name', v_link.client_name,
      'system_type', v_link.system_type,
      'products', COALESCE(v_project.products, ARRAY['Orion TN']::TEXT[]),
      'ticket_number', v_project.ticket_number,
      'pos_assistant_enabled', public.is_pos_chat_link_enabled(v_link.id),
      'pos_assistant_disabled_at', v_link.disabled_at
    );
  END IF;

  -- Backward-compatible fallback for a project link not backfilled yet.
  SELECT * INTO v_project
  FROM public.projects project
  WHERE project.id = p_id
    AND project.is_deleted = false;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_project.id,
    'project_id', v_project.id,
    'client_name', v_project.client_name,
    'system_type', v_project.system_type,
    'products', v_project.products,
    'ticket_number', v_project.ticket_number,
    'pos_assistant_enabled', COALESCE(
      (v_project.custom_fields->>'pos_assistant_enabled')::BOOLEAN,
      false
    ),
    'pos_assistant_disabled_at', v_project.custom_fields->>'pos_assistant_disabled_at'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pos_assistant_project_info(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_pos_chat_visitors(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sector TEXT,
  last_seen_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT visitor.id, visitor.name, visitor.sector, visitor.last_seen_at
  FROM public.pos_ai_chat_visitors visitor
  WHERE visitor.project_id = p_project_id
    AND public.is_pos_chat_link_enabled(p_project_id)
  ORDER BY visitor.last_seen_at DESC, lower(visitor.name) ASC;
$$;

CREATE OR REPLACE FUNCTION public.register_pos_chat_visitor(
  p_project_id UUID,
  p_name TEXT,
  p_sector TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := btrim(regexp_replace(COALESCE(p_name, ''), '\s+', ' ', 'g'));
  v_sector TEXT := btrim(regexp_replace(COALESCE(p_sector, ''), '\s+', ' ', 'g'));
  v_visitor public.pos_ai_chat_visitors%ROWTYPE;
BEGIN
  IF char_length(v_name) NOT BETWEEN 2 AND 80 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe um nome entre 2 e 80 caracteres.');
  END IF;

  IF char_length(v_sector) NOT BETWEEN 2 AND 80 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe um setor entre 2 e 80 caracteres.');
  END IF;

  IF NOT public.is_pos_chat_link_enabled(p_project_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assistente indisponível.');
  END IF;

  SELECT * INTO v_visitor
  FROM public.pos_ai_chat_visitors visitor
  WHERE visitor.project_id = p_project_id
    AND lower(btrim(visitor.name)) = lower(v_name)
    AND lower(btrim(visitor.sector)) = lower(v_sector)
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.pos_ai_chat_visitors
    SET last_seen_at = now()
    WHERE id = v_visitor.id
    RETURNING * INTO v_visitor;
  ELSE
    INSERT INTO public.pos_ai_chat_visitors (project_id, name, sector)
    VALUES (p_project_id, v_name, v_sector)
    RETURNING * INTO v_visitor;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'visitor', jsonb_build_object(
      'id', v_visitor.id,
      'name', v_visitor.name,
      'sector', v_visitor.sector,
      'last_seen_at', v_visitor.last_seen_at
    )
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_visitor
    FROM public.pos_ai_chat_visitors visitor
    WHERE visitor.project_id = p_project_id
      AND lower(btrim(visitor.name)) = lower(v_name)
      AND lower(btrim(visitor.sector)) = lower(v_sector)
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'visitor', jsonb_build_object(
        'id', v_visitor.id,
        'name', v_visitor.name,
        'sector', v_visitor.sector,
        'last_seen_at', v_visitor.last_seen_at
      )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.select_pos_chat_visitor(
  p_project_id UUID,
  p_visitor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor public.pos_ai_chat_visitors%ROWTYPE;
BEGIN
  IF NOT public.is_pos_chat_link_enabled(p_project_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assistente indisponível.');
  END IF;

  UPDATE public.pos_ai_chat_visitors visitor
  SET last_seen_at = now()
  WHERE visitor.id = p_visitor_id
    AND visitor.project_id = p_project_id
  RETURNING * INTO v_visitor;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'visitor', jsonb_build_object(
      'id', v_visitor.id,
      'name', v_visitor.name,
      'sector', v_visitor.sector,
      'last_seen_at', v_visitor.last_seen_at
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pos_chat_visitors(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_pos_chat_visitor(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_pos_chat_visitor(UUID, UUID) TO anon, authenticated;

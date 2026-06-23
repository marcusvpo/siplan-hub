-- SQL migration to update function public.update_project_public_infra
-- Drops old signature and creates new one with workstations/server statuses.

DROP FUNCTION IF EXISTS public.update_project_public_infra(UUID, JSONB, JSONB, INT);

CREATE OR REPLACE FUNCTION public.update_project_public_infra(
  p_id UUID,
  p_workstations JSONB,
  p_servers JSONB,
  p_workstations_count INT,
  p_workstations_status VARCHAR DEFAULT NULL,
  p_server_status VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_record public.projects%ROWTYPE;
BEGIN
  SELECT * INTO project_record FROM public.projects WHERE id = p_id AND is_deleted = false;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE public.projects
  SET 
    infra_workstations = p_workstations,
    infra_servers = p_servers,
    infra_workstations_count = p_workstations_count,
    infra_workstations_status = COALESCE(p_workstations_status, infra_workstations_status),
    infra_server_status = COALESCE(p_server_status, infra_server_status),
    last_update_by = 'Coleta Pública (Técnico)'
  WHERE id = p_id;

  -- Log the event in the project timeline
  INSERT INTO public.timeline_events (
    project_id,
    type,
    author,
    message
  ) VALUES (
    p_id,
    'auto',
    'Técnico (Link Público)',
    'Dados de hardware e estações coletados e enviados pelo técnico do cartório.'
  );

  RETURN TRUE;
END;
$$;

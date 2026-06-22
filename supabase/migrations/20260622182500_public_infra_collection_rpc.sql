-- Migration to add RPCs for public infrastructure data collection by technicians
-- 1. get_project_public_info: retrieves specific client/system details and current hardware specifications via project UUID
-- 2. update_project_public_infra: updates workstations and servers lists for the project and logs the event in the timeline

CREATE OR REPLACE FUNCTION public.get_project_public_info(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_record public.projects%ROWTYPE;
BEGIN
  SELECT * INTO project_record FROM public.projects WHERE id = p_id AND is_deleted = false;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'client_name', project_record.client_name,
    'system_type', project_record.system_type,
    'ticket_number', project_record.ticket_number,
    'infra_servers', project_record.infra_servers,
    'infra_workstations', project_record.infra_workstations,
    'infra_workstations_count', project_record.infra_workstations_count,
    'infra_status', project_record.infra_status,
    'workstations_status', project_record.infra_workstations_status,
    'server_status', project_record.infra_server_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_project_public_infra(
  p_id UUID,
  p_workstations JSONB,
  p_servers JSONB,
  p_workstations_count INT
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

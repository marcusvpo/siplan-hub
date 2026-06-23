-- Migration to add infra_public_link_closed column and update public RPCs
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS infra_public_link_closed BOOLEAN DEFAULT false;

-- Update get_project_public_info to include infra_public_link_closed status
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
    'server_status', project_record.infra_server_status,
    'infra_public_link_closed', COALESCE(project_record.infra_public_link_closed, false)
  );
END;
$$;

-- Update update_project_public_infra function to block updates if link is closed
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
  
  IF NOT FOUND OR COALESCE(project_record.infra_public_link_closed, false) = true THEN
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

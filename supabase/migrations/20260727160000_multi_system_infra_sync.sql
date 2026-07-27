-- Migration to update public infra RPCs to support multi-system detection and automatic cross-project synchronization per client

-- 1. get_project_public_info: returns client system count and distinct systems list alongside project details
CREATE OR REPLACE FUNCTION public.get_project_public_info(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_record public.projects%ROWTYPE;
  v_systems_list JSONB;
  v_system_count INT;
BEGIN
  SELECT * INTO project_record FROM public.projects WHERE id = p_id AND is_deleted = false;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get all active system types and total count for the same client (case insensitive)
  SELECT 
    COALESCE(jsonb_agg(DISTINCT system_type), '[]'::jsonb),
    COUNT(DISTINCT id)
  INTO v_systems_list, v_system_count
  FROM public.projects
  WHERE LOWER(TRIM(client_name)) = LOWER(TRIM(project_record.client_name))
    AND is_deleted = false;

  IF v_system_count IS NULL OR v_system_count < 1 THEN
    v_system_count := 1;
  END IF;

  RETURN jsonb_build_object(
    'client_name', project_record.client_name,
    'system_type', project_record.system_type,
    'systems_list', v_systems_list,
    'system_count', v_system_count,
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

-- 2. update_project_public_infra: updates infra data across ALL active projects of the same client
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
  target_project public.projects%ROWTYPE;
  v_workstations_status VARCHAR;
  v_server_status VARCHAR;
  v_new_infra_status VARCHAR;
  r_project RECORD;
BEGIN
  SELECT * INTO target_project FROM public.projects WHERE id = p_id AND is_deleted = false;
  
  IF NOT FOUND OR COALESCE(target_project.infra_public_link_closed, false) = true THEN
    RETURN FALSE;
  END IF;

  v_workstations_status := COALESCE(p_workstations_status, target_project.infra_workstations_status);
  v_server_status := COALESCE(p_server_status, target_project.infra_server_status);

  -- Determine stage 1 (Infra) overall status:
  -- If either server or workstation status is 'Inadequado', set to 'blocked'
  -- Otherwise, set to 'done' (Finalizado)
  IF v_server_status = 'Inadequado' OR v_workstations_status = 'Inadequado' THEN
    v_new_infra_status := 'blocked';
  ELSE
    v_new_infra_status := 'done';
  END IF;

  -- Loop through all active projects for the same client to update them and add timeline logs
  FOR r_project IN 
    SELECT id FROM public.projects 
    WHERE LOWER(TRIM(client_name)) = LOWER(TRIM(target_project.client_name))
      AND is_deleted = false
  LOOP
    UPDATE public.projects
    SET 
      infra_workstations = p_workstations,
      infra_servers = p_servers,
      infra_workstations_count = p_workstations_count,
      infra_workstations_status = v_workstations_status,
      infra_server_status = v_server_status,
      infra_status = v_new_infra_status,
      infra_end_date = CASE WHEN v_new_infra_status = 'done' THEN COALESCE(infra_end_date, NOW()) ELSE infra_end_date END,
      last_update_by = 'Coleta Pública (Técnico)'
    WHERE id = r_project.id;

    -- Log timeline event for each affected project
    INSERT INTO public.timeline_events (
      project_id,
      type,
      author,
      message
    ) VALUES (
      r_project.id,
      'auto',
      'Técnico (Link Público)',
      CASE 
        WHEN v_new_infra_status = 'blocked' THEN 'Dados de infraestrutura coletados pelo técnico (Sincronização por Cliente). Etapa 1 alterada para Bloqueado devido a inadequações.'
        ELSE 'Dados de infraestrutura coletados pelo técnico (Sincronização por Cliente). Etapa 1 alterada para Finalizado.'
      END
    );
  END LOOP;

  RETURN TRUE;
END;
$$;

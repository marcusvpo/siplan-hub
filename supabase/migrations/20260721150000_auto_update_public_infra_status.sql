-- Migration to automatically set infra_status ('done' or 'blocked') upon public infra submission
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
  v_workstations_status VARCHAR;
  v_server_status VARCHAR;
  v_new_infra_status VARCHAR;
BEGIN
  SELECT * INTO project_record FROM public.projects WHERE id = p_id AND is_deleted = false;
  
  IF NOT FOUND OR COALESCE(project_record.infra_public_link_closed, false) = true THEN
    RETURN FALSE;
  END IF;

  v_workstations_status := COALESCE(p_workstations_status, project_record.infra_workstations_status);
  v_server_status := COALESCE(p_server_status, project_record.infra_server_status);

  -- Determine stage 1 (Infra) overall status:
  -- If either server or workstation status is 'Inadequado', set to 'blocked'
  -- Otherwise, set to 'done' (Finalizado)
  IF v_server_status = 'Inadequado' OR v_workstations_status = 'Inadequado' THEN
    v_new_infra_status := 'blocked';
  ELSE
    v_new_infra_status := 'done';
  END IF;

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
    CASE 
      WHEN v_new_infra_status = 'blocked' THEN 'Dados de infraestrutura coletados pelo técnico. Etapa 1 alterada para Bloqueado devido a inadequações identificadas.'
      ELSE 'Dados de infraestrutura coletados pelo técnico. Etapa 1 alterada para Finalizado.'
    END
  );

  RETURN TRUE;
END;
$$;

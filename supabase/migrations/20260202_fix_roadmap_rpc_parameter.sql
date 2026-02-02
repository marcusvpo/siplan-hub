-- Migration to fix the parameter name of get_roadmap_data RPC to match the frontend call
-- and remove the exception swallowing block for better error visibility.

DROP FUNCTION IF EXISTS public.get_roadmap_data(uuid);

CREATE OR REPLACE FUNCTION public.get_roadmap_data(token_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  roadmap_record public.roadmaps%ROWTYPE;
  project_record public.projects%ROWTYPE;
  result JSONB;
BEGIN
  -- Buscar o roadmap pelo token
  SELECT * INTO roadmap_record FROM public.roadmaps WHERE share_token = token_uuid;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT roadmap_record.is_active THEN
    RETURN NULL;
  END IF;

  -- Incrementar contador de visualizações
  UPDATE public.roadmaps SET view_count = view_count + 1 WHERE id = roadmap_record.id;

  -- Buscar o projeto associado
  SELECT * INTO project_record FROM public.projects WHERE id = roadmap_record.project_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Construir o objeto de retorno
  result := jsonb_build_object(
    'roadmap', jsonb_build_object(
      'id', roadmap_record.id,
      'welcome_message', roadmap_record.welcome_message,
      'custom_theme', roadmap_record.custom_theme,
      'config', roadmap_record.config
    ),
    'project', jsonb_build_object(
      'client_name', project_record.client_name,
      'system_type', project_record.system_type,
      'sold_hours', project_record.sold_hours,
      'overall_progress', project_record.overall_progress,
      'global_status', project_record.global_status,
      'stages', jsonb_build_object(
        'infra', jsonb_build_object('status', project_record.infra_status),
        'adherence', jsonb_build_object('status', project_record.adherence_status),
        'environment', jsonb_build_object('status', project_record.environment_status),
        'conversion', jsonb_build_object('status', project_record.conversion_status),
        'implementation', jsonb_build_object('status', project_record.implementation_status),
        'post', jsonb_build_object('status', project_record.post_status)
      )
    )
  );

  RETURN result;
END;
$$;

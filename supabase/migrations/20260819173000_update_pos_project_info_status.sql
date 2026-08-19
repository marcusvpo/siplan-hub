-- Migration: 20260819173000_update_pos_project_info_status.sql
-- Updates get_pos_assistant_project_info to return pos_assistant_enabled and pos_assistant_disabled_at

CREATE OR REPLACE FUNCTION public.get_pos_assistant_project_info(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_record public.projects%ROWTYPE;
  v_is_enabled BOOLEAN;
  v_disabled_at TEXT;
BEGIN
  SELECT * INTO project_record 
  FROM public.projects 
  WHERE id = p_id AND is_deleted = false;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_is_enabled := COALESCE(
    (project_record.custom_fields->>'pos_assistant_enabled')::BOOLEAN,
    false
  );
  v_disabled_at := project_record.custom_fields->>'pos_assistant_disabled_at';

  RETURN jsonb_build_object(
    'id', project_record.id,
    'client_name', project_record.client_name,
    'system_type', project_record.system_type,
    'products', project_record.products,
    'ticket_number', project_record.ticket_number,
    'post_status', project_record.post_status,
    'post_start_date', project_record.post_start_date,
    'post_end_date', project_record.post_end_date,
    'pos_assistant_enabled', v_is_enabled,
    'pos_assistant_disabled_at', v_disabled_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pos_assistant_project_info(UUID) TO anon, authenticated;

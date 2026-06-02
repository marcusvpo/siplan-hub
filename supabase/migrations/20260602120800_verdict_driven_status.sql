-- Update trigger function to support verdict-driven adherence stage status
CREATE OR REPLACE FUNCTION public.sync_project_form_response_status()
RETURNS TRIGGER AS $$
DECLARE
  stage_status TEXT;
  analysis_complete BOOLEAN;
  target_project_id UUID;
  target_stage TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_project_id := OLD.project_id;
    target_stage := OLD.stage;
    stage_status := 'todo';
    analysis_complete := FALSE;
  ELSE
    target_project_id := NEW.project_id;
    target_stage := NEW.stage;
    IF NEW.status = 'draft' THEN
      stage_status := 'in-progress';
      analysis_complete := FALSE;
    ELSIF NEW.status = 'submitted' THEN
      stage_status := 'waiting_adjustment';
      analysis_complete := FALSE;
    ELSIF NEW.status = 'approved' THEN
      analysis_complete := TRUE;
      -- Determine stage_status based on verdict in NEW.data
      IF NEW.data->>'finalVerdict' = 'Totalmente Aderente' THEN
        stage_status := 'done';
      ELSIF NEW.data->>'finalVerdict' = 'Aderente com Restrições' THEN
        stage_status := 'waiting_adjustment';
      ELSIF NEW.data->>'finalVerdict' = 'Não Aderente / Impeditivo' THEN
        stage_status := 'blocked';
      ELSE
        stage_status := 'done'; -- fallback
      END IF;
    ELSE
      stage_status := 'todo';
      analysis_complete := FALSE;
    END IF;
  END IF;

  -- Update projects table
  IF target_stage = 'adherence' THEN
    UPDATE public.projects
    SET 
      adherence_status = stage_status,
      adherence_analysis_complete = analysis_complete,
      updated_at = now()
    WHERE id = target_project_id;
  ELSIF target_stage = 'conversion' THEN
    -- stage = 'conversion' represents the homologation_checklist
    UPDATE public.projects
    SET 
      conversion_status = stage_status,
      updated_at = now()
    WHERE id = target_project_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

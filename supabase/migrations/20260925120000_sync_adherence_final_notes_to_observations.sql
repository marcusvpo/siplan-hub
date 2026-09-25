-- Migration: 20260925120000_sync_adherence_final_notes_to_observations.sql
-- Sincronizar o campo "Justificativa / Parecer Técnico" (finalNotes) do formulário de aderência
-- para "Observações & Detalhes" (adherence_observations) da etapa 2 de Análise de Aderência no projeto.

-- 1. Atualizar a trigger function para sincronizar adherence_observations ao finalizar
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
    ELSIF NEW.status IN ('approved', 'approved_with_restrictions', 'rejected') THEN
      analysis_complete := TRUE;
      -- Determine stage_status based on status or fallback to verdict in NEW.data
      IF NEW.status = 'approved' OR NEW.data->>'finalVerdict' = 'Totalmente Aderente' THEN
        stage_status := 'done';
      ELSIF NEW.status = 'approved_with_restrictions' OR NEW.data->>'finalVerdict' = 'Aderente com Restrições' THEN
        stage_status := 'waiting_adjustment';
      ELSIF NEW.status = 'rejected' OR NEW.data->>'finalVerdict' = 'Não Aderente / Impeditivo' THEN
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
      adherence_observations = CASE 
        WHEN TG_OP <> 'DELETE' 
             AND NEW.status IN ('approved', 'approved_with_restrictions', 'rejected') 
             AND NEW.data->>'finalNotes' IS NOT NULL 
             AND TRIM(NEW.data->>'finalNotes') <> '' 
        THEN NEW.data->>'finalNotes'
        ELSE adherence_observations 
      END,
      updated_at = now()
    WHERE id = target_project_id;
  ELSIF target_stage = 'conversion' THEN
    UPDATE public.projects
    SET 
      conversion_status = stage_status,
      updated_at = now()
    WHERE id = target_project_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualização retroativa para todos os projetos com aderência finalizada
UPDATE public.projects p
SET 
  adherence_observations = pfr.data->>'finalNotes',
  updated_at = now()
FROM public.project_form_responses pfr
WHERE pfr.project_id = p.id
  AND pfr.stage = 'adherence'
  AND pfr.status IN ('approved', 'approved_with_restrictions', 'rejected')
  AND pfr.data->>'finalNotes' IS NOT NULL
  AND TRIM(pfr.data->>'finalNotes') <> '';

-- 3. Notificação de changelog (Item 12 do checklist AGENTS.md)
INSERT INTO public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url,
  created_at
) VALUES (
  'changelog',
  'release_improvement',
  'projects',
  'Sincronização do Parecer Técnico de Aderência',
  'A justificativa e parecer técnico do formulário de aderência agora é replicada automaticamente para o campo Observações & Detalhes da etapa 2 (Análise de Aderência) no modal do projeto.',
  '/projects',
  now()
);

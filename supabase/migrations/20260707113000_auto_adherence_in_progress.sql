-- Migration to automatically update adherence_status to 'in-progress' when adherence_end_date (Agendado Para) is registered and it is currently 'todo'

CREATE OR REPLACE FUNCTION public.fn_projects_before_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Requisito 2: Se infra_status E adherence_status forem 'done' E pelo menos um mudou para 'done'
  IF NEW.infra_status = 'done' AND NEW.adherence_status = 'done' 
     AND (OLD.infra_status != 'done' OR OLD.adherence_status != 'done') THEN
     
     -- Se conversion_status for 'todo', muda para 'in-progress'
     IF NEW.conversion_status = 'todo' THEN
       NEW.conversion_status := 'in-progress';
       IF NEW.conversion_start_date IS NULL THEN
         NEW.conversion_start_date := NOW();
       END IF;
     END IF;
     
     -- Se environment_status for 'todo', muda para 'in-progress'
     IF NEW.environment_status = 'todo' THEN
       NEW.environment_status := 'in-progress';
       IF NEW.environment_start_date IS NULL THEN
         NEW.environment_start_date := CURRENT_DATE;
       END IF;
     END IF;
  END IF;

  -- Requisito 3 (Parte BEFORE): Se conversion_status mudou para 'in-progress'
  IF NEW.conversion_status = 'in-progress' AND OLD.conversion_status != 'in-progress' THEN
    IF NEW.conversion_sent_at IS NULL THEN
      NEW.conversion_sent_at := CURRENT_DATE;
    END IF;
  END IF;

  -- NOVO REQUISITO: Se a etapa de aderência estiver 'todo' (Não Iniciada) e a data 'Agendado Para' for informada
  IF NEW.adherence_status = 'todo' AND NEW.adherence_end_date IS NOT NULL 
     AND (OLD.adherence_end_date IS NULL OR NEW.adherence_end_date != OLD.adherence_end_date) THEN
    NEW.adherence_status := 'in-progress';
    IF NEW.adherence_start_date IS NULL THEN
      NEW.adherence_start_date := CURRENT_DATE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

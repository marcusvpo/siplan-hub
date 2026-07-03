-- Migration para adicionar automações nas etapas de projetos e fila de conversão

-- 1. Função e Trigger BEFORE INSERT (Etapa 1 e 2 em progresso por padrão)
CREATE OR REPLACE FUNCTION public.fn_projects_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Requisito 1: Infraestrutura e Aderência iniciam como 'in-progress'
  IF NEW.infra_status IS NULL OR NEW.infra_status = 'todo' THEN
    NEW.infra_status := 'in-progress';
    IF NEW.infra_start_date IS NULL THEN
      NEW.infra_start_date := CURRENT_DATE;
    END IF;
  END IF;
  
  IF NEW.adherence_status IS NULL OR NEW.adherence_status = 'todo' THEN
    NEW.adherence_status := 'in-progress';
    IF NEW.adherence_start_date IS NULL THEN
      NEW.adherence_start_date := CURRENT_DATE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_before_insert ON public.projects;
CREATE TRIGGER trg_projects_before_insert
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_projects_before_insert();


-- 2. Função e Trigger BEFORE UPDATE (Cascateamento de status)
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_before_update ON public.projects;
CREATE TRIGGER trg_projects_before_update
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_projects_before_update();


-- 3. Função e Trigger AFTER INSERT OR UPDATE (Fila de Conversão e Notificações)
CREATE OR REPLACE FUNCTION public.fn_projects_after_insert_update()
RETURNS TRIGGER AS $$
DECLARE
  v_sent_by UUID := NULL;
  v_sent_by_name TEXT;
  v_exists BOOLEAN;
  v_ticket_number_str TEXT;
BEGIN
  v_sent_by_name := COALESCE(NEW.last_update_by, 'Sistema');

  -- 1. Registrar na timeline se houve mudanças de status automáticas
  IF TG_OP = 'UPDATE' THEN
    -- Se a conversão mudou para in-progress E a infra e aderência acabaram de ser concluídas
    IF NEW.conversion_status = 'in-progress' AND OLD.conversion_status = 'todo'
       AND NEW.infra_status = 'done' AND NEW.adherence_status = 'done'
       AND (OLD.infra_status != 'done' OR OLD.adherence_status != 'done') THEN
       
      INSERT INTO public.timeline_events (
        project_id,
        type,
        author,
        message,
        timestamp,
        metadata
      ) VALUES (
        NEW.id,
        'status_change',
        v_sent_by_name,
        'Status de Conversão alterado para in-progress',
        NOW(),
        jsonb_build_object('action', 'update', 'field', 'conversion_status', 'value', 'in-progress')
      );
    END IF;

    -- Se a preparação de ambiente mudou para in-progress E a infra e aderência acabaram de ser concluídas
    IF NEW.environment_status = 'in-progress' AND OLD.environment_status = 'todo'
       AND NEW.infra_status = 'done' AND NEW.adherence_status = 'done'
       AND (OLD.infra_status != 'done' OR OLD.adherence_status != 'done') THEN
       
      INSERT INTO public.timeline_events (
        project_id,
        type,
        author,
        message,
        timestamp,
        metadata
      ) VALUES (
        NEW.id,
        'status_change',
        v_sent_by_name,
        'Status de Ambiente alterado para in-progress',
        NOW(),
        jsonb_build_object('action', 'update', 'field', 'environment_status', 'value', 'in-progress')
      );
    END IF;
  END IF;

  -- 2. Requisito 3: Se o status de conversão mudou para 'in-progress' (ou foi inserido como 'in-progress')
  IF (TG_OP = 'INSERT' AND NEW.conversion_status = 'in-progress') OR 
     (TG_OP = 'UPDATE' AND NEW.conversion_status = 'in-progress' AND OLD.conversion_status != 'in-progress') THEN
    
    -- Verifica se já está na fila para evitar duplicados
    SELECT EXISTS(SELECT 1 FROM public.conversion_queue WHERE project_id = NEW.id) INTO v_exists;
    
    IF NOT v_exists THEN
      -- Tenta obter o UUID do perfil correspondente ao nome do usuário
      SELECT id INTO v_sent_by 
      FROM public.profiles 
      WHERE full_name = v_sent_by_name OR email = v_sent_by_name
      LIMIT 1;
      
      -- Se não achar por nome/email e tiver uma sessão ativa do Supabase, usa auth.uid()
      IF v_sent_by IS NULL THEN
        v_sent_by := auth.uid();
      END IF;

      -- Inserir na conversion_queue
      INSERT INTO public.conversion_queue (
        project_id,
        sent_by,
        sent_by_name,
        sent_at,
        queue_status,
        priority
      ) VALUES (
        NEW.id,
        v_sent_by,
        v_sent_by_name,
        NOW(),
        'pending',
        3 -- Prioridade normal (3)
      ) ON CONFLICT (project_id) DO NOTHING;

      -- Formatar string do ticket number para a mensagem de notificação
      IF NEW.ticket_number IS NOT NULL AND NEW.ticket_number != '' THEN
        v_ticket_number_str := ' (#' || NEW.ticket_number || ')';
      ELSE
        v_ticket_number_str := '';
      END IF;

      -- Criar notificação para a equipe de conversão
      INSERT INTO public.notifications (
        team,
        project_id,
        type,
        title,
        message,
        action_url,
        read,
        created_at
      ) VALUES (
        'conversion',
        NEW.id,
        'new_demand',
        'Nova conversão na fila',
        NEW.client_name || v_ticket_number_str || ' foi enviado para a fila de conversão por ' || v_sent_by_name || '.',
        '/conversion',
        FALSE,
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_after_insert_update ON public.projects;
CREATE TRIGGER trg_projects_after_insert_update
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_projects_after_insert_update();

-- Migration: Limpeza e cancelamento do disparo retroativo de notificações do Pós-Implantação
-- e blindagem da função para que funcione exclusivamente daqui para frente (a partir de hoje).

-- 1. Desfaz e deleta todas as 56 notificações geradas pelo disparo do Pós-Implantação
DELETE FROM public.notifications
WHERE (stage = 'post' OR title ILIKE '%Pós-Implantação%');

-- 2. Reverte o status dos 6 projetos que foram ativados indevidamente pelo histórico antigo
-- Desativa o trigger temporariamente durante o rollback para não disparar novas notificações
ALTER TABLE public.projects DISABLE TRIGGER trg_notify_post_stage_activation;
ALTER TABLE public.projects DISABLE TRIGGER trg_deployment_to_post_before;

UPDATE public.projects
SET 
  post_status = 'todo',
  post_start_date = NULL,
  post_support_end_date = NULL
WHERE id IN (
  'b8a6ec30-2859-4880-8e6d-b3fb50614705',
  'f455d475-c21b-4d05-aeaa-091c63248009',
  '57174cd4-5511-4f6c-9446-dad0abe79930',
  '38b4f02d-9eb0-4451-9b54-adbbc8e82c97',
  'ba6ef95f-0efb-400c-b919-f0fd5277a7a9',
  'd0ffc129-1d83-4398-96fe-bd238b17e189'
);

-- Reabilita os triggers
ALTER TABLE public.projects ENABLE TRIGGER trg_deployment_to_post_before;
ALTER TABLE public.projects ENABLE TRIGGER trg_notify_post_stage_activation;

-- 3. Blindagem da Função BEFORE de Transição de Etapa:
-- Não transiciona para Pós se o projeto estiver pausado ('blocked'), finalizado ou arquivado
CREATE OR REPLACE FUNCTION public.fn_handle_deployment_to_post_transition_before()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phase1_status TEXT;
BEGIN
  -- Se o projeto estiver pausado ('blocked') ou cancelado/arquivado, não avança nada automaticamente
  IF NEW.global_status IN ('blocked', 'done', 'archived') OR NEW.is_deleted = true THEN
    RETURN NEW;
  END IF;

  v_phase1_status := NEW.implementation_phase1->>'status';

  -- Se a etapa de implantação foi marcada como 'done' OU a fase 1 foi marcada como 'done'
  IF (NEW.implementation_status = 'done' OR v_phase1_status = 'done') THEN
    -- Sincroniza ambos os campos de status da implantação como 'done'
    NEW.implementation_status := 'done';
    NEW.implementation_phase1 := jsonb_set(COALESCE(NEW.implementation_phase1, '{}'::jsonb), '{status}', '"done"');

    -- Se o Pós-Implantação ainda estiver como 'todo' ou não iniciado, avança automaticamente para 'in-progress'
    IF NEW.post_status IS NULL OR NEW.post_status = 'todo' THEN
      NEW.post_status := 'in-progress';
      NEW.post_start_date := CURRENT_DATE;
      NEW.post_support_end_date := CURRENT_DATE + INTERVAL '15 days';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Blindagem da Função RPC de Expiração de Implantação:
-- Aplica ESTRITAMENTE para projetos ativos ('in-progress') cuja data de término expirou RECENTEMENTE
-- (a partir da data de hoje, ignorando qualquer projeto antigo ou pausado)
CREATE OR REPLACE FUNCTION public.fn_auto_finish_expired_deployments()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INT := 0;
  v_proj RECORD;
  v_end_date_str TEXT;
  v_parsed_date DATE;
BEGIN
  FOR v_proj IN
    SELECT 
      id, 
      client_name, 
      global_status,
      implementation_status, 
      implementation_phase1, 
      implementation_end_date,
      post_status
    FROM public.projects
    WHERE is_deleted = false
      AND global_status = 'in-progress'
      AND (implementation_status IS NULL OR implementation_status <> 'done')
      AND (post_status IS NULL OR post_status = 'todo')
  LOOP
    v_end_date_str := COALESCE(
      v_proj.implementation_phase1->>'endDate',
      v_proj.implementation_phase1->>'end_date'
    );

    IF v_end_date_str IS NOT NULL AND v_end_date_str <> '' THEN
      BEGIN
        v_parsed_date := v_end_date_str::date;

        -- Regra estrita: só processa se a data expirou de ontem para hoje (janela de no máximo 3 dias, ex: sexta/fim de semana para segunda)
        -- e NUNCA projetos com datas antigas anteriores à ativação do recurso
        IF v_parsed_date >= (CURRENT_DATE - INTERVAL '3 days') AND v_parsed_date < CURRENT_DATE THEN
          UPDATE public.projects
          SET 
            implementation_status = 'done',
            implementation_phase1 = jsonb_set(COALESCE(implementation_phase1, '{}'::jsonb), '{status}', '"done"'),
            post_status = 'in-progress',
            post_start_date = CURRENT_DATE,
            post_support_end_date = CURRENT_DATE + INTERVAL '15 days',
            updated_at = NOW()
          WHERE id = v_proj.id;

          v_updated_count := v_updated_count + 1;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          CONTINUE;
      END;
    END IF;
  END LOOP;

  RETURN v_updated_count;
END;
$$;

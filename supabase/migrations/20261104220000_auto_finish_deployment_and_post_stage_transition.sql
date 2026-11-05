-- Migration: Conclusão Automática da Implantação e Transição Inteligente para Pós-Implantação
-- Data: 2026-11-04

-- 1. Função e Trigger para Transição Automática da Implantação para Pós-Implantação (15 dias corridos)
CREATE OR REPLACE FUNCTION public.fn_handle_deployment_to_post_transition_before()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phase1_status TEXT;
BEGIN
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

DROP TRIGGER IF EXISTS trg_deployment_to_post_before ON public.projects;
CREATE TRIGGER trg_deployment_to_post_before
  BEFORE UPDATE OF implementation_status, implementation_phase1 ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_deployment_to_post_transition_before();

-- 2. Trigger AFTER UPDATE para disparar notificações segmentadas por sistema para a equipe de Pós
CREATE OR REPLACE FUNCTION public.notify_post_stage_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name TEXT;
  v_ticket_num TEXT;
  v_sys_type TEXT;
  v_impl_resp_id UUID;
  v_impl_resp_name TEXT;
  v_end_date_str TEXT;
  v_recipient RECORD;
  v_target_names TEXT[];
BEGIN
  -- Apenas quando o post_status transicionar para 'in-progress'
  IF NEW.post_status = 'in-progress' AND (OLD.post_status IS DISTINCT FROM 'in-progress') THEN
    v_client_name := COALESCE(NEW.client_name, 'Cliente não identificado');
    v_ticket_num := COALESCE(NEW.ticket_number, '');
    v_sys_type := COALESCE(NEW.system_type, '');
    v_impl_resp_id := NEW.implementation_responsible_id;
    v_impl_resp_name := COALESCE(NEW.implementation_responsible, NEW.implementation_phase1->>'responsible', '');
    v_end_date_str := to_char(COALESCE(NEW.post_support_end_date, CURRENT_DATE + INTERVAL '15 days'), 'DD/MM/YYYY');

    -- Define lista de nomes específicos de acordo com o sistema do projeto
    IF v_sys_type ILIKE '%Orion TN%' OR v_sys_type ILIKE '%Notas%' OR v_sys_type ILIKE '%Tabnot%' OR v_sys_type ILIKE '%Modelos TN%' THEN
      -- Orion TN: Erik Marques, Henrique Troiano, Carlos Neves, Carlos Silva
      v_target_names := ARRAY['%Erik%Marques%', '%Henrique%Troiano%', '%Carlos%Neves%', '%Carlos%Silva%'];
    ELSIF v_sys_type ILIKE '%Orion PRO%' OR v_sys_type ILIKE '%Protesto%' OR v_sys_type ILIKE '%Prot%' THEN
      -- Orion PRO: Marcos Fernandes, Alana Silva, Bruna Pomini
      v_target_names := ARRAY['%Marcos%Fernandes%', '%Alana%Silva%', '%Bruna%Pomini%'];
    ELSIF v_sys_type ILIKE '%Orion REG%' OR v_sys_type ILIKE '%REG%' OR v_sys_type ILIKE '%RC%' OR v_sys_type ILIKE '%TDPJ%' THEN
      -- Orion REG: Luiz Lucente, Romario Lima, Julio Araujo
      v_target_names := ARRAY['%Luiz%Lucente%', '%Romario%Lima%', '%Julio%Araujo%'];
    ELSE
      v_target_names := ARRAY[]::TEXT[];
    END IF;

    -- Seleciona destinatários: Admins + Implantador responsável da Fase 1 + Analistas do Pós daquele sistema
    FOR v_recipient IN
      SELECT p.id, p.full_name
      FROM public.profiles p
      WHERE (
        p.role = 'admin'
        OR (v_impl_resp_id IS NOT NULL AND p.id = v_impl_resp_id)
        OR (v_impl_resp_name <> '' AND p.full_name ILIKE '%' || TRIM(v_impl_resp_name) || '%')
        OR (array_length(v_target_names, 1) > 0 AND p.full_name ILIKE ANY (v_target_names))
      )
    LOOP
      INSERT INTO public.notifications (
        user_id,
        project_id,
        type,
        stage,
        priority,
        title,
        message,
        action_url,
        category
      ) VALUES (
        v_recipient.id,
        NEW.id,
        'new_demand',
        'post',
        'high',
        'Início do Pós-Implantação: ' || v_client_name,
        'A implantação de ' || v_client_name || CASE WHEN v_ticket_num <> '' THEN ' (#' || v_ticket_num || ')' ELSE '' END || ' foi concluída. Período de pós-implantação (15 dias) ativo até ' || v_end_date_str || '. Criar grupo de WhatsApp com o cliente.',
        '/projects?id=' || NEW.id,
        'operational'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_stage_activation ON public.projects;
CREATE TRIGGER trg_notify_post_stage_activation
  AFTER UPDATE OF post_status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_stage_activation();

-- 3. Função RPC para verificação e conclusão automática de implantações cuja data de término já passou
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
      implementation_status, 
      implementation_phase1, 
      implementation_end_date,
      post_status
    FROM public.projects
    WHERE (implementation_status IS NULL OR implementation_status <> 'done')
  LOOP
    v_end_date_str := COALESCE(
      v_proj.implementation_phase1->>'endDate',
      v_proj.implementation_phase1->>'end_date',
      v_proj.implementation_end_date::text
    );

    IF v_end_date_str IS NOT NULL AND v_end_date_str <> '' THEN
      BEGIN
        -- Converte a data em tipo DATE seguro
        v_parsed_date := v_end_date_str::date;

        -- Se a data de término já passou (ex: terminou sexta e hoje é sábado/domingo/segunda em diante)
        IF v_parsed_date < CURRENT_DATE THEN
          UPDATE public.projects
          SET 
            implementation_status = 'done',
            implementation_phase1 = jsonb_set(COALESCE(implementation_phase1, '{}'::jsonb), '{status}', '"done"'),
            post_status = CASE WHEN post_status IS NULL OR post_status = 'todo' THEN 'in-progress' ELSE post_status END,
            post_start_date = CASE WHEN post_status IS NULL OR post_status = 'todo' THEN CURRENT_DATE ELSE post_start_date END,
            post_support_end_date = CASE WHEN post_status IS NULL OR post_status = 'todo' THEN CURRENT_DATE + INTERVAL '15 days' ELSE post_support_end_date END,
            updated_at = NOW()
          WHERE id = v_proj.id;

          v_updated_count := v_updated_count + 1;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          -- Ignora erros de parsing de formato de data específico em linhas antigas
          CONTINUE;
      END;
    END IF;
  END LOOP;

  RETURN v_updated_count;
END;
$$;

-- 4. Notificação de Changelog (Registro oficial de novidade)
INSERT INTO public.notifications (
  user_id,
  type,
  category,
  priority,
  permission_resource,
  title,
  message,
  action_url
) VALUES (
  NULL,
  'release_feature',
  'changelog',
  'normal',
  'projects',
  'Conclusão Automática da Implantação e Transição para Pós',
  'O Siplan HUB agora conclui automaticamente a Implantação na data de término da Fase 1, ativando o Pós-Implantação por 15 dias com avisos direcionados aos especialistas de cada sistema (Orion TN, PRO e REG).',
  '/projects'
);


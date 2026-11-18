-- Migration: 20261118024500_auto_post_implantation_business_days_transition.sql
-- Objetivos:
-- 1. Funções utilitárias de calendário útil: fn_next_business_day e fn_add_business_days (segunda a sexta).
-- 2. Na data de Término da Fase 1 (ex: sexta-feira = Término), finalizar automaticamente "Fase 1 Treinamento & Acompanhamento"
--    e "Implantação & Treinamento" ('done') e preencher automaticamente "Início" (próximo dia útil, ex: segunda-feira)
--    e "Término" (+9 dias úteis = 2 semanas úteis / 10 dias úteis, ex: 16/11 a 27/11) na etapa "Pós-Implantação".
-- 3. A partir do próximo dia útil (v_today >= post_start_date), alterar automaticamente o status de "Pós-Implantação"
--    para "Em Andamento" ('in-progress') para qualquer projeto ativo cuja implantação esteja finalizada ('done').
-- 4. Atualizar projetos ativos em carteira (incluindo Campinas RCPN/TN Campo Grande, Mirandópolis, Franca 02, Guarujá, Jandira, Guarulhos).

-- ============================================================================
-- 1. FUNÇÕES DE DIAS ÚTEIS (SEGUNDA A SEXTA-FEIRA)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_next_business_day(p_date DATE)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_next DATE;
BEGIN
  IF p_date IS NULL THEN
    RETURN NULL;
  END IF;

  v_next := p_date + 1;
  WHILE EXTRACT(ISODOW FROM v_next) IN (6, 7) LOOP
    v_next := v_next + 1;
  END LOOP;

  RETURN v_next;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_add_business_days(p_start DATE, p_business_days INT)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_curr DATE := p_start;
  v_remaining INT := COALESCE(p_business_days, 0);
BEGIN
  IF p_start IS NULL THEN
    RETURN NULL;
  END IF;

  WHILE EXTRACT(ISODOW FROM v_curr) IN (6, 7) LOOP
    v_curr := v_curr + 1;
  END LOOP;

  WHILE v_remaining > 0 LOOP
    v_curr := v_curr + 1;
    IF EXTRACT(ISODOW FROM v_curr) NOT IN (6, 7) THEN
      v_remaining := v_remaining - 1;
    END IF;
  END LOOP;

  RETURN v_curr;
END;
$$;

-- ============================================================================
-- 2. ATUALIZAÇÃO DA NOTIFICAÇÃO DE PÓS-IMPLANTAÇÃO (DATAS ÚTEIS REAIS)
-- ============================================================================
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
  v_start_date_str TEXT;
  v_end_date_str TEXT;
  v_recipient RECORD;
  v_target_names TEXT[];
BEGIN
  IF NEW.post_status = 'in-progress' AND (OLD.post_status IS DISTINCT FROM 'in-progress') THEN
    v_client_name := COALESCE(NEW.client_name, 'Cliente não identificado');
    v_ticket_num := COALESCE(NEW.ticket_number, '');
    v_sys_type := COALESCE(NEW.system_type, '');
    v_impl_resp_id := NEW.implementation_responsible_id;
    v_impl_resp_name := COALESCE(NEW.implementation_responsible, NEW.implementation_phase1->>'responsible', '');
    v_start_date_str := to_char(COALESCE(NEW.post_start_date, (NOW() AT TIME ZONE 'America/Sao_Paulo')::date), 'DD/MM/YYYY');
    v_end_date_str := to_char(
      COALESCE(
        NEW.post_end_date,
        NEW.post_support_end_date,
        public.fn_add_business_days(COALESCE(NEW.post_start_date, (NOW() AT TIME ZONE 'America/Sao_Paulo')::date), 9)
      ),
      'DD/MM/YYYY'
    );

    IF v_sys_type ILIKE '%Orion TN%' OR v_sys_type ILIKE '%Notas%' OR v_sys_type ILIKE '%Tabnot%' OR v_sys_type ILIKE '%Modelos TN%' THEN
      v_target_names := ARRAY['%Erik%Marques%', '%Henrique%Troiano%', '%Carlos%Neves%', '%Carlos%Silva%'];
    ELSIF v_sys_type ILIKE '%Orion PRO%' OR v_sys_type ILIKE '%Protesto%' OR v_sys_type ILIKE '%Prot%' THEN
      v_target_names := ARRAY['%Marcos%Fernandes%', '%Alana%Silva%', '%Bruna%Pomini%'];
    ELSIF v_sys_type ILIKE '%Orion REG%' OR v_sys_type ILIKE '%REG%' OR v_sys_type ILIKE '%RC%' OR v_sys_type ILIKE '%TDPJ%' THEN
      v_target_names := ARRAY['%Luiz%Lucente%', '%Romario%Lima%', '%Julio%Araujo%'];
    ELSE
      v_target_names := ARRAY[]::TEXT[];
    END IF;

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
        'A implantação de ' || v_client_name || CASE WHEN v_ticket_num <> '' THEN ' (#' || v_ticket_num || ')' ELSE '' END || ' foi concluída. Período de pós-implantação (2 semanas úteis) de ' || v_start_date_str || ' até ' || v_end_date_str || '. Criar grupo de WhatsApp com o cliente.',
        '/projects?id=' || NEW.id,
        'operational'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. TRIGGER BEFORE UPDATE DE TRANSIÇÃO IMPLANTAÇÃO -> PÓS-IMPLANTAÇÃO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_handle_deployment_to_post_transition_before()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_old_impl_status TEXT := COALESCE(OLD.implementation_status, 'todo');
  v_new_impl_status TEXT := COALESCE(NEW.implementation_status, 'todo');
  v_old_phase1_status TEXT := COALESCE(OLD.implementation_phase1->>'status', 'todo');
  v_new_phase1_status TEXT := COALESCE(NEW.implementation_phase1->>'status', 'todo');
  v_new_confirmed BOOLEAN := COALESCE((NEW.implementation_phase1->>'isConfirmed')::boolean, false);
  v_old_end_raw TEXT := NULLIF(btrim(COALESCE(OLD.implementation_phase1->>'endDate', OLD.implementation_phase1->>'end_date', '')), '');
  v_new_start_raw TEXT := NULLIF(btrim(COALESCE(NEW.implementation_phase1->>'startDate', NEW.implementation_phase1->>'start_date', '')), '');
  v_new_end_raw TEXT := NULLIF(btrim(COALESCE(NEW.implementation_phase1->>'endDate', NEW.implementation_phase1->>'end_date', '')), '');
  v_start_date DATE := NULL;
  v_end_date DATE := NULL;
  v_ref_end_date DATE := NULL;
  v_calc_post_start DATE := NULL;
  v_calc_post_end DATE := NULL;
  v_phase1_end_changed BOOLEAN := false;
  v_manual_revert_from_done BOOLEAN := false;
  v_manual_revert_from_in_progress BOOLEAN := false;
  v_manual_post_revert BOOLEAN := false;
BEGIN
  -- 1. Sincroniza confirmedAt dentro de implementation_phase1
  IF v_new_confirmed THEN
    IF COALESCE(NULLIF(btrim(NEW.implementation_phase1->>'confirmedAt'), ''), '') = '' THEN
      NEW.implementation_phase1 := jsonb_set(
        COALESCE(NEW.implementation_phase1, '{}'::jsonb),
        '{confirmedAt}',
        to_jsonb(to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
      );
    END IF;
  ELSIF COALESCE(NEW.implementation_phase1, '{}'::jsonb) ? 'confirmedAt'
     OR COALESCE(NEW.implementation_phase1, '{}'::jsonb) ? 'confirmedBy' THEN
    NEW.implementation_phase1 := COALESCE(NEW.implementation_phase1, '{}'::jsonb) - 'confirmedAt' - 'confirmedBy';
  END IF;

  -- 2. Sincroniza implementation_start_date / implementation_end_date com a Fase 1
  IF COALESCE(NEW.system_type, '') <> 'Modelos TN'
     OR (NEW.implementation_phase1 IS DISTINCT FROM OLD.implementation_phase1) THEN
    IF v_new_start_raw IS NOT NULL THEN
      BEGIN
        v_start_date := v_new_start_raw::date;
        NEW.implementation_start_date := v_new_start_raw::timestamptz;
      EXCEPTION WHEN OTHERS THEN
        v_start_date := NULL;
      END;
    ELSE
      NEW.implementation_start_date := NULL;
    END IF;

    IF v_new_end_raw IS NOT NULL THEN
      BEGIN
        v_end_date := v_new_end_raw::date;
        NEW.implementation_end_date := v_new_end_raw::timestamptz;
      EXCEPTION WHEN OTHERS THEN
        v_end_date := NULL;
      END;
    ELSE
      NEW.implementation_end_date := NULL;
    END IF;
  ELSE
    IF v_new_start_raw IS NOT NULL THEN
      BEGIN
        v_start_date := v_new_start_raw::date;
      EXCEPTION WHEN OTHERS THEN
        v_start_date := NULL;
      END;
    END IF;
    IF v_new_end_raw IS NOT NULL THEN
      BEGIN
        v_end_date := v_new_end_raw::date;
      EXCEPTION WHEN OTHERS THEN
        v_end_date := NULL;
      END;
    END IF;
  END IF;

  -- 3. Tratamento explícito de reversão de 'done' pelo usuário
  IF v_old_impl_status = 'done' AND v_new_impl_status <> 'done' AND v_new_phase1_status = 'done' THEN
    NEW.implementation_phase1 := jsonb_set(
      COALESCE(NEW.implementation_phase1, '{}'::jsonb),
      '{status}',
      to_jsonb(v_new_impl_status)
    );
    v_new_phase1_status := v_new_impl_status;
    v_manual_revert_from_done := true;
  ELSIF v_old_phase1_status = 'done' AND v_new_phase1_status <> 'done' AND v_new_impl_status = 'done' THEN
    NEW.implementation_status := v_new_phase1_status;
    v_new_impl_status := v_new_phase1_status;
    v_manual_revert_from_done := true;
  ELSIF (v_old_impl_status = 'done' AND v_new_impl_status <> 'done')
     OR (v_old_phase1_status = 'done' AND v_new_phase1_status <> 'done') THEN
    v_manual_revert_from_done := true;
  END IF;

  IF v_manual_revert_from_done AND COALESCE(NEW.post_status, 'todo') = 'todo' THEN
    NEW.post_start_date := NULL;
    NEW.post_end_date := NULL;
    NEW.post_support_end_date := NULL;
  END IF;

  -- 4. Sincroniza mudanças normais entre implementation_status e phase1.status
  IF v_new_impl_status IS DISTINCT FROM v_old_impl_status
     AND v_new_phase1_status = v_old_phase1_status
     AND v_new_impl_status <> 'done' THEN
    NEW.implementation_phase1 := jsonb_set(
      COALESCE(NEW.implementation_phase1, '{}'::jsonb),
      '{status}',
      to_jsonb(v_new_impl_status)
    );
    v_new_phase1_status := v_new_impl_status;
  ELSIF v_new_phase1_status IS DISTINCT FROM v_old_phase1_status
     AND v_new_impl_status = v_old_impl_status
     AND v_new_phase1_status <> 'done' THEN
    NEW.implementation_status := v_new_phase1_status;
    v_new_impl_status := v_new_phase1_status;
  END IF;

  -- Projetos pausados, finalizados ou excluídos não disparam transições automáticas
  IF COALESCE(NEW.global_status, '') IN ('blocked', 'done', 'archived') OR COALESCE(NEW.is_deleted, false) = true THEN
    RETURN NEW;
  END IF;

  -- 5. Na data final (Término <= hoje), implantação confirmada ou em andamento finaliza automaticamente
  IF COALESCE(NEW.system_type, '') <> 'Modelos TN'
     AND NOT v_manual_revert_from_done
     AND (v_new_confirmed OR v_new_impl_status = 'in-progress' OR v_new_phase1_status = 'in-progress')
     AND v_start_date IS NOT NULL
     AND v_end_date IS NOT NULL
     AND v_end_date <= v_today
     AND (v_new_impl_status <> 'done' OR v_new_phase1_status <> 'done') THEN
    NEW.implementation_status := 'done';
    NEW.implementation_phase1 := jsonb_set(
      COALESCE(NEW.implementation_phase1, '{}'::jsonb),
      '{status}',
      '"done"'
    );
    v_new_impl_status := 'done';
    v_new_phase1_status := 'done';
  END IF;

  -- 6. Quando Implantação & Treinamento / Fase 1 estiver 'done':
  --    a) Sincroniza ambos como 'done'
  --    b) Preenche Início (próximo dia útil) e Término (+9 dias úteis = 2 semanas úteis) do Pós-Implantação
  --    c) Altera Pós-Implantação para 'in-progress' somente a partir do próximo dia útil (v_today >= post_start_date)
  IF (v_new_impl_status = 'done' OR v_new_phase1_status = 'done') AND NOT v_manual_revert_from_done THEN
    NEW.implementation_status := 'done';
    NEW.implementation_phase1 := jsonb_set(
      COALESCE(NEW.implementation_phase1, '{}'::jsonb),
      '{status}',
      '"done"'
    );

    IF COALESCE(NEW.system_type, '') <> 'Modelos TN' THEN
      v_ref_end_date := COALESCE(v_end_date, NEW.implementation_end_date::date);
      v_phase1_end_changed := (v_new_end_raw IS DISTINCT FROM v_old_end_raw) AND v_new_end_raw IS NOT NULL;

      IF v_ref_end_date IS NOT NULL OR v_old_impl_status <> 'done' OR v_old_phase1_status <> 'done' THEN
        v_calc_post_start := public.fn_next_business_day(COALESCE(v_ref_end_date, v_today));
        v_calc_post_end := public.fn_add_business_days(v_calc_post_start, 9);

        IF NEW.post_start_date IS NULL OR (v_phase1_end_changed AND COALESCE(NEW.post_status, 'todo') <> 'done') THEN
          NEW.post_start_date := v_calc_post_start;
        END IF;

        IF NEW.post_end_date IS NULL OR (v_phase1_end_changed AND COALESCE(NEW.post_status, 'todo') <> 'done') THEN
          NEW.post_end_date := public.fn_add_business_days(NEW.post_start_date, 9);
        END IF;

        NEW.post_support_end_date := COALESCE(NEW.post_end_date, NEW.post_support_end_date, v_calc_post_end);

        v_manual_post_revert :=
          COALESCE(OLD.post_status, 'todo') = 'in-progress'
          AND COALESCE(NEW.post_status, 'todo') IN ('todo', 'blocked');

        IF (NEW.post_status IS NULL OR NEW.post_status = 'todo')
           AND NOT v_manual_post_revert
           AND NEW.post_start_date IS NOT NULL
           AND v_today >= NEW.post_start_date THEN
          NEW.post_status := 'in-progress';
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- 7. Auto-ativação para 'in-progress' quando confirmada e startDate <= hoje < endDate
  v_manual_revert_from_in_progress :=
    (v_old_impl_status = 'in-progress' AND v_new_impl_status IN ('todo', 'blocked'))
    OR (v_old_phase1_status = 'in-progress' AND v_new_phase1_status IN ('todo', 'blocked'));

  IF v_new_confirmed
     AND v_start_date IS NOT NULL
     AND v_start_date <= v_today
     AND (v_end_date IS NULL OR v_today < v_end_date)
     AND NOT v_manual_revert_from_in_progress
     AND (v_new_impl_status = 'todo' OR v_new_phase1_status = 'todo')
     AND v_new_impl_status <> 'done'
     AND v_new_phase1_status <> 'done' THEN
    NEW.implementation_status := 'in-progress';
    NEW.implementation_phase1 := jsonb_set(
      COALESCE(NEW.implementation_phase1, '{}'::jsonb),
      '{status}',
      '"in-progress"'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deployment_to_post_before ON public.projects;
CREATE TRIGGER trg_deployment_to_post_before
  BEFORE UPDATE OF implementation_status, implementation_phase1, post_status, post_start_date, post_end_date ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_deployment_to_post_transition_before();

-- ============================================================================
-- 4. RPC DE VERIFICAÇÃO PERIÓDICA (AUTO-INÍCIO, AUTO-FIM SEXTA E AUTO-PÓS SEGUNDA)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_auto_finish_expired_deployments()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_updated_count INT := 0;
  v_proj RECORD;
  v_start_str TEXT;
  v_end_str TEXT;
  v_start_date DATE;
  v_end_date DATE;
  v_ref_end_date DATE;
  v_calc_post_start DATE;
  v_calc_post_end DATE;
  v_next_post_status TEXT;
  v_is_confirmed BOOLEAN;
  v_impl_status TEXT;
  v_phase1_status TEXT;
  v_curr_post_status TEXT;
BEGIN
  FOR v_proj IN
    SELECT
      id,
      client_name,
      system_type,
      global_status,
      implementation_status,
      implementation_phase1,
      implementation_start_date,
      implementation_end_date,
      post_status,
      post_start_date,
      post_end_date,
      post_support_end_date,
      updated_at
    FROM public.projects
    WHERE is_deleted = false
      AND global_status = 'in-progress'
  LOOP
    v_is_confirmed := COALESCE((v_proj.implementation_phase1->>'isConfirmed')::boolean, false);
    v_impl_status := COALESCE(v_proj.implementation_status, 'todo');
    v_phase1_status := COALESCE(v_proj.implementation_phase1->>'status', 'todo');
    v_curr_post_status := COALESCE(v_proj.post_status, 'todo');
    v_start_str := NULLIF(btrim(COALESCE(v_proj.implementation_phase1->>'startDate', v_proj.implementation_phase1->>'start_date', '')), '');
    v_end_str := NULLIF(btrim(COALESCE(v_proj.implementation_phase1->>'endDate', v_proj.implementation_phase1->>'end_date', '')), '');

    v_start_date := NULL;
    v_end_date := NULL;

    IF v_start_str IS NOT NULL THEN
      BEGIN
        v_start_date := v_start_str::date;
      EXCEPTION WHEN OTHERS THEN
        v_start_date := NULL;
      END;
    END IF;

    IF v_end_str IS NOT NULL THEN
      BEGIN
        v_end_date := v_end_str::date;
      EXCEPTION WHEN OTHERS THEN
        v_end_date := NULL;
      END;
    END IF;

    -- A) Auto-início da Implantação: confirmada e startDate <= hoje < endDate
    IF v_is_confirmed
       AND v_start_date IS NOT NULL
       AND v_start_date <= v_today
       AND (v_end_date IS NULL OR v_today < v_end_date)
       AND (v_impl_status = 'todo' OR v_phase1_status = 'todo')
       AND v_impl_status <> 'done'
       AND v_phase1_status <> 'done' THEN
      UPDATE public.projects
      SET
        implementation_status = 'in-progress',
        implementation_phase1 = jsonb_set(
          COALESCE(implementation_phase1, '{}'::jsonb),
          '{status}',
          '"in-progress"'
        ),
        implementation_start_date = COALESCE(implementation_start_date, v_start_str::timestamptz),
        updated_at = NOW()
      WHERE id = v_proj.id;

      INSERT INTO public.timeline_events (
        project_id,
        type,
        author,
        message,
        metadata
      ) VALUES (
        v_proj.id,
        'status_change',
        'Automação do Sistema',
        'Implantação confirmada iniciada automaticamente ("Em Andamento")',
        jsonb_build_object(
          'category', 'stages',
          'actionType', 'status_change',
          'tabLabel', 'Etapas',
          'stageLabel', '5. Implantação & Treinamento',
          'fieldLabel', 'Status da Etapa 5 e Fase 1',
          'changes', jsonb_build_array(
            jsonb_build_object(
              'field', 'implementation_status',
              'label', '5. Implantação & Treinamento (Status)',
              'oldValue', v_impl_status,
              'newValue', 'in-progress'
            ),
            jsonb_build_object(
              'field', 'implementation_phase1.status',
              'label', 'Fase 1 Treinamento & Acompanhamento (Status)',
              'oldValue', v_phase1_status,
              'newValue', 'in-progress'
            )
          )
        )
      );

      v_updated_count := v_updated_count + 1;
      CONTINUE;
    END IF;

    -- B) Auto-conclusão na data de Término (ex: sexta-feira = data final):
    --    Finaliza Etapa 5 + Fase 1, preenche Início (próximo dia útil) e Término (+9 dias úteis = 2 semanas úteis)
    --    e só muda post_status para 'in-progress' se hoje já for >= post_start_date
    IF COALESCE(v_proj.system_type, '') <> 'Modelos TN'
       AND (v_impl_status <> 'done' OR v_phase1_status <> 'done')
       AND (v_is_confirmed OR v_impl_status = 'in-progress' OR v_phase1_status = 'in-progress')
       AND v_start_date IS NOT NULL
       AND v_end_date IS NOT NULL
       AND v_end_date >= (v_today - INTERVAL '14 days')
       AND v_end_date <= v_today THEN
      v_calc_post_start := COALESCE(v_proj.post_start_date, public.fn_next_business_day(v_end_date));
      v_calc_post_end := COALESCE(v_proj.post_end_date, public.fn_add_business_days(v_calc_post_start, 9));
      v_next_post_status := CASE
        WHEN v_curr_post_status = 'todo' AND v_today >= v_calc_post_start THEN 'in-progress'
        ELSE v_curr_post_status
      END;

      UPDATE public.projects
      SET
        implementation_status = 'done',
        implementation_phase1 = jsonb_set(
          COALESCE(implementation_phase1, '{}'::jsonb),
          '{status}',
          '"done"'
        ),
        post_status = v_next_post_status,
        post_start_date = v_calc_post_start,
        post_end_date = v_calc_post_end,
        post_support_end_date = v_calc_post_end,
        updated_at = NOW()
      WHERE id = v_proj.id;

      INSERT INTO public.timeline_events (
        project_id,
        type,
        author,
        message,
        metadata
      ) VALUES (
        v_proj.id,
        'status_change',
        'Automação do Sistema',
        CASE
          WHEN v_next_post_status = 'in-progress' AND v_curr_post_status <> 'in-progress'
            THEN format(
              'Implantação concluída automaticamente e Pós-Implantação iniciado (%s a %s)',
              to_char(v_calc_post_start, 'DD/MM/YYYY'),
              to_char(v_calc_post_end, 'DD/MM/YYYY')
            )
          ELSE format(
            'Implantação concluída automaticamente na data de término ("Finalizado"). Pós-Implantação agendado de %s a %s',
            to_char(v_calc_post_start, 'DD/MM/YYYY'),
            to_char(v_calc_post_end, 'DD/MM/YYYY')
          )
        END,
        jsonb_build_object(
          'category', 'stages',
          'actionType', 'status_change',
          'tabLabel', 'Etapas',
          'stageLabel', '5. Implantação & Treinamento',
          'changes', jsonb_build_array(
            jsonb_build_object(
              'field', 'implementation_status',
              'label', '5. Implantação & Treinamento (Status)',
              'oldValue', v_impl_status,
              'newValue', 'done'
            ),
            jsonb_build_object(
              'field', 'post_start_date',
              'label', 'Pós-Implantação (Início)',
              'oldValue', COALESCE(to_char(v_proj.post_start_date, 'DD/MM/YYYY'), 'Vazio'),
              'newValue', to_char(v_calc_post_start, 'DD/MM/YYYY')
            ),
            jsonb_build_object(
              'field', 'post_end_date',
              'label', 'Pós-Implantação (Término)',
              'oldValue', COALESCE(to_char(v_proj.post_end_date, 'DD/MM/YYYY'), 'Vazio'),
              'newValue', to_char(v_calc_post_end, 'DD/MM/YYYY')
            )
          )
        )
      );

      v_updated_count := v_updated_count + 1;
      CONTINUE;
    END IF;

    -- C) Projetos cuja Implantação já está 'done':
    --    Garante preenchimento de post_start_date / post_end_date (2 semanas úteis)
    --    e inicia automaticamente o Pós-Implantação ('in-progress') a partir do próximo dia útil!
    IF COALESCE(v_proj.system_type, '') <> 'Modelos TN'
       AND (v_impl_status = 'done' OR v_phase1_status = 'done')
       AND v_curr_post_status <> 'done'
       AND v_curr_post_status <> 'blocked' THEN
      v_ref_end_date := COALESCE(v_end_date, v_proj.implementation_end_date::date, v_proj.updated_at::date, v_today);
      v_calc_post_start := COALESCE(v_proj.post_start_date, public.fn_next_business_day(v_ref_end_date));
      v_calc_post_end := COALESCE(v_proj.post_end_date, public.fn_add_business_days(v_calc_post_start, 9));
      v_next_post_status := CASE
        WHEN v_curr_post_status = 'todo' AND v_today >= v_calc_post_start THEN 'in-progress'
        ELSE v_curr_post_status
      END;

      IF v_next_post_status IS DISTINCT FROM v_curr_post_status
         OR v_proj.post_start_date IS DISTINCT FROM v_calc_post_start
         OR v_proj.post_end_date IS DISTINCT FROM v_calc_post_end THEN
        UPDATE public.projects
        SET
          implementation_status = 'done',
          implementation_phase1 = jsonb_set(
            COALESCE(implementation_phase1, '{}'::jsonb),
            '{status}',
            '"done"'
          ),
          post_status = v_next_post_status,
          post_start_date = v_calc_post_start,
          post_end_date = v_calc_post_end,
          post_support_end_date = v_calc_post_end,
          updated_at = NOW()
        WHERE id = v_proj.id;

        IF v_next_post_status = 'in-progress' AND v_curr_post_status <> 'in-progress' THEN
          INSERT INTO public.timeline_events (
            project_id,
            type,
            author,
            message,
            metadata
          ) VALUES (
            v_proj.id,
            'status_change',
            'Automação do Sistema',
            format(
              'Pós-Implantação iniciado automaticamente no próximo dia útil ("Em Andamento" — %s a %s)',
              to_char(v_calc_post_start, 'DD/MM/YYYY'),
              to_char(v_calc_post_end, 'DD/MM/YYYY')
            ),
            jsonb_build_object(
              'category', 'stages',
              'actionType', 'status_change',
              'tabLabel', 'Etapas',
              'stageLabel', '6. Pós-Implantação',
              'changes', jsonb_build_array(
                jsonb_build_object(
                  'field', 'post_status',
                  'label', 'Pós-Implantação (Status)',
                  'oldValue', v_curr_post_status,
                  'newValue', 'in-progress'
                ),
                jsonb_build_object(
                  'field', 'post_start_date',
                  'label', 'Pós-Implantação (Início)',
                  'oldValue', COALESCE(to_char(v_proj.post_start_date, 'DD/MM/YYYY'), 'Vazio'),
                  'newValue', to_char(v_calc_post_start, 'DD/MM/YYYY')
                ),
                jsonb_build_object(
                  'field', 'post_end_date',
                  'label', 'Pós-Implantação (Término)',
                  'oldValue', COALESCE(to_char(v_proj.post_end_date, 'DD/MM/YYYY'), 'Vazio'),
                  'newValue', to_char(v_calc_post_end, 'DD/MM/YYYY')
                )
              )
            )
          );
        END IF;

        v_updated_count := v_updated_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_updated_count;
END;
$$;

-- ============================================================================
-- 5. ATUALIZAÇÃO DA CARTEIRA ATIVA EXISTENTE (SEM DISPARAR SPAM RETROATIVO)
-- ============================================================================
ALTER TABLE public.projects DISABLE TRIGGER trg_notify_post_stage_activation;
ALTER TABLE public.projects DISABLE TRIGGER trg_deployment_to_post_before;

-- Corrige também post_support_end_date e post_end_date dos projetos já em Pós-Implantação ('in-progress')
-- que haviam sido calculados com 15 dias corridos (ex: 16/11 -> 01/12 passa a ser 16/11 -> 27/11)
UPDATE public.projects p
SET
  post_start_date = COALESCE(
    p.post_start_date,
    public.fn_next_business_day(
      COALESCE(
        NULLIF(btrim(COALESCE(p.implementation_phase1->>'endDate', p.implementation_phase1->>'end_date', '')), '')::date,
        p.implementation_end_date::date
      )
    )
  ),
  post_end_date = public.fn_add_business_days(
    COALESCE(
      p.post_start_date,
      public.fn_next_business_day(
        COALESCE(
          NULLIF(btrim(COALESCE(p.implementation_phase1->>'endDate', p.implementation_phase1->>'end_date', '')), '')::date,
          p.implementation_end_date::date
        )
      )
    ),
    9
  ),
  post_support_end_date = public.fn_add_business_days(
    COALESCE(
      p.post_start_date,
      public.fn_next_business_day(
        COALESCE(
          NULLIF(btrim(COALESCE(p.implementation_phase1->>'endDate', p.implementation_phase1->>'end_date', '')), '')::date,
          p.implementation_end_date::date
        )
      )
    ),
    9
  )
WHERE p.is_deleted = false
  AND p.global_status = 'in-progress'
  AND COALESCE(p.system_type, '') <> 'Modelos TN'
  AND p.post_status = 'in-progress'
  AND p.post_end_date IS NULL
  AND COALESCE(
    NULLIF(btrim(COALESCE(p.implementation_phase1->>'endDate', p.implementation_phase1->>'end_date', '')), '')::date,
    p.implementation_end_date::date
  ) IS NOT NULL;

ALTER TABLE public.projects ENABLE TRIGGER trg_deployment_to_post_before;

-- Executa a função com trg_notify_post_stage_activation desativado apenas nesta migração inicial
-- para ativar Campinas e Mirandópolis (outubro/2026) sem reenviar alertas retroativos antigos
SELECT public.fn_auto_finish_expired_deployments();

ALTER TABLE public.projects ENABLE TRIGGER trg_notify_post_stage_activation;

-- ============================================================================
-- 6. NOTIFICAÇÃO OFICIAL DE CHANGELOG
-- ============================================================================
INSERT INTO public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
) VALUES (
  'changelog',
  'release_improvement',
  'projects',
  'Automação de Pós-Implantação por Dias Úteis (2 Semanas)',
  'Projetos com Implantação & Treinamento finalizada agora iniciam automaticamente o Pós-Implantação no próximo dia útil, preenchendo automaticamente Início e Término com 2 semanas úteis (10 dias úteis, ex: 16/11 a 27/11).',
  '/projects'
);

-- ============================================================================
-- Migracao: Saneamento de datas corrompidas (< 1900), paridade da Fase 2
-- ("Possivel Retorno") com confirmacao, automacao de status e sincronizacao
-- com Calendario, alem de registro oficial de Changelog.
-- ============================================================================

-- 1. Funcao auxiliar para validar datas civis plausiveis (1900..2099)
CREATE OR REPLACE FUNCTION public.fn_safe_valid_date(p_raw TEXT)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_clean TEXT := NULLIF(btrim(COALESCE(p_raw, '')), '');
  v_parsed DATE;
BEGIN
  IF v_clean IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_parsed := v_clean::date;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  IF v_parsed < DATE '1900-01-01' OR v_parsed > DATE '2099-12-31' THEN
    RETURN NULL;
  END IF;

  RETURN v_parsed;
END;
$$;

-- 2. Limpeza cirurgica do registro SERRA (5e2f0bb9-c931-44b2-9f80-4f67e79f9248)
--    e eventuais datas com ano invalido (< 1900) antes de instalar a versao endurecida do trigger
ALTER TABLE public.projects DISABLE TRIGGER trg_notify_post_stage_activation;
ALTER TABLE public.projects DISABLE TRIGGER trg_deployment_to_post_before;

UPDATE public.projects
SET
  implementation_start_date = CASE
    WHEN implementation_start_date IS NOT NULL AND implementation_start_date::date < DATE '1900-01-01' THEN NULL
    ELSE implementation_start_date
  END,
  implementation_end_date = CASE
    WHEN implementation_end_date IS NOT NULL AND implementation_end_date::date < DATE '1900-01-01' THEN NULL
    ELSE implementation_end_date
  END,
  implementation_phase1 = CASE
    WHEN implementation_phase1 IS NOT NULL AND (
      (COALESCE(implementation_phase1->>'startDate', implementation_phase1->>'start_date', '') <> ''
        AND public.fn_safe_valid_date(COALESCE(implementation_phase1->>'startDate', implementation_phase1->>'start_date')) IS NULL)
      OR
      (COALESCE(implementation_phase1->>'endDate', implementation_phase1->>'end_date', '') <> ''
        AND public.fn_safe_valid_date(COALESCE(implementation_phase1->>'endDate', implementation_phase1->>'end_date')) IS NULL)
    )
    THEN implementation_phase1 - 'startDate' - 'endDate' - 'start_date' - 'end_date'
    ELSE implementation_phase1
  END,
  implementation_phase2 = CASE
    WHEN implementation_phase2 IS NOT NULL AND (
      (COALESCE(implementation_phase2->>'startDate', implementation_phase2->>'start_date', '') <> ''
        AND public.fn_safe_valid_date(COALESCE(implementation_phase2->>'startDate', implementation_phase2->>'start_date')) IS NULL)
      OR
      (COALESCE(implementation_phase2->>'endDate', implementation_phase2->>'end_date', '') <> ''
        AND public.fn_safe_valid_date(COALESCE(implementation_phase2->>'endDate', implementation_phase2->>'end_date')) IS NULL)
    )
    THEN implementation_phase2 - 'startDate' - 'endDate' - 'start_date' - 'end_date'
    ELSE implementation_phase2
  END
WHERE id = '5e2f0bb9-c931-44b2-9f80-4f67e79f9248'
   OR (implementation_start_date IS NOT NULL AND implementation_start_date::date < DATE '1900-01-01')
   OR (implementation_end_date IS NOT NULL AND implementation_end_date::date < DATE '1900-01-01')
   OR (
     COALESCE(implementation_phase1->>'startDate', implementation_phase1->>'start_date', '') <> ''
     AND public.fn_safe_valid_date(COALESCE(implementation_phase1->>'startDate', implementation_phase1->>'start_date')) IS NULL
   )
   OR (
     COALESCE(implementation_phase1->>'endDate', implementation_phase1->>'end_date', '') <> ''
     AND public.fn_safe_valid_date(COALESCE(implementation_phase1->>'endDate', implementation_phase1->>'end_date')) IS NULL
   )
   OR (
     COALESCE(implementation_phase2->>'startDate', implementation_phase2->>'start_date', '') <> ''
     AND public.fn_safe_valid_date(COALESCE(implementation_phase2->>'startDate', implementation_phase2->>'start_date')) IS NULL
   )
   OR (
     COALESCE(implementation_phase2->>'endDate', implementation_phase2->>'end_date', '') <> ''
     AND public.fn_safe_valid_date(COALESCE(implementation_phase2->>'endDate', implementation_phase2->>'end_date')) IS NULL
   );

ALTER TABLE public.projects ENABLE TRIGGER trg_deployment_to_post_before;
ALTER TABLE public.projects ENABLE TRIGGER trg_notify_post_stage_activation;

-- 3. Trigger BEFORE UPDATE: Fase 1 -> Pos-Implantacao + Fase 2 (Possivel Retorno) + guarda de anos < 1900
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

  -- Variaveis isoladas da Fase 2 (Possivel Retorno)
  v_old_phase2_status TEXT := COALESCE(OLD.implementation_phase2->>'status', 'todo');
  v_new_phase2_status TEXT := COALESCE(NEW.implementation_phase2->>'status', 'todo');
  v_p2_confirmed BOOLEAN := COALESCE((NEW.implementation_phase2->>'isConfirmed')::boolean, false);
  v_p2_start_raw TEXT := NULLIF(btrim(COALESCE(NEW.implementation_phase2->>'startDate', NEW.implementation_phase2->>'start_date', '')), '');
  v_p2_end_raw TEXT := NULLIF(btrim(COALESCE(NEW.implementation_phase2->>'endDate', NEW.implementation_phase2->>'end_date', '')), '');
  v_p2_start_date DATE := NULL;
  v_p2_end_date DATE := NULL;
  v_p2_manual_revert_from_done BOOLEAN := false;
  v_p2_manual_revert_from_in_progress BOOLEAN := false;
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

  -- 1b. Sincroniza confirmedAt dentro de implementation_phase2 (Possivel Retorno)
  IF v_p2_confirmed THEN
    IF COALESCE(NULLIF(btrim(NEW.implementation_phase2->>'confirmedAt'), ''), '') = '' THEN
      NEW.implementation_phase2 := jsonb_set(
        COALESCE(NEW.implementation_phase2, '{}'::jsonb),
        '{confirmedAt}',
        to_jsonb(to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
      );
    END IF;
  ELSIF COALESCE(NEW.implementation_phase2, '{}'::jsonb) ? 'confirmedAt'
     OR COALESCE(NEW.implementation_phase2, '{}'::jsonb) ? 'confirmedBy' THEN
    NEW.implementation_phase2 := COALESCE(NEW.implementation_phase2, '{}'::jsonb) - 'confirmedAt' - 'confirmedBy';
  END IF;

  -- 2. Sincroniza implementation_start_date / implementation_end_date com a Fase 1 (apenas datas >= 1900)
  v_start_date := public.fn_safe_valid_date(v_new_start_raw);
  v_end_date := public.fn_safe_valid_date(v_new_end_raw);

  IF COALESCE(NEW.system_type, '') <> 'Modelos TN'
     OR (NEW.implementation_phase1 IS DISTINCT FROM OLD.implementation_phase1) THEN
    IF v_start_date IS NOT NULL THEN
      BEGIN
        NEW.implementation_start_date := v_new_start_raw::timestamptz;
      EXCEPTION WHEN OTHERS THEN
        NEW.implementation_start_date := NULL;
      END;
    ELSE
      NEW.implementation_start_date := NULL;
    END IF;

    IF v_end_date IS NOT NULL THEN
      BEGIN
        NEW.implementation_end_date := v_new_end_raw::timestamptz;
      EXCEPTION WHEN OTHERS THEN
        NEW.implementation_end_date := NULL;
      END;
    ELSE
      NEW.implementation_end_date := NULL;
    END IF;
  END IF;

  -- 3. Tratamento explicito de reversao de 'done' pelo usuario (Fase 1 / Etapa 5)
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

  -- 4. Sincroniza mudancas normais entre implementation_status e phase1.status
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

  -- Projetos pausados, finalizados ou excluidos nao disparam transicoes automaticas
  IF COALESCE(NEW.global_status, '') IN ('blocked', 'done', 'archived') OR COALESCE(NEW.is_deleted, false) = true THEN
    RETURN NEW;
  END IF;

  -- 5. Na data final (Termino <= hoje), Fase 1 confirmada ou em andamento finaliza automaticamente
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

  -- 6. Quando Implantacao & Treinamento / Fase 1 estiver 'done':
  --    a) Sincroniza ambos como 'done'
  --    b) Preenche Inicio (proximo dia util) e Termino (+9 dias uteis = 2 semanas uteis) do Pos-Implantacao
  --    c) Altera Pos-Implantacao para 'in-progress' somente a partir do proximo dia util (v_today >= post_start_date)
  IF (v_new_impl_status = 'done' OR v_new_phase1_status = 'done') AND NOT v_manual_revert_from_done THEN
    NEW.implementation_status := 'done';
    NEW.implementation_phase1 := jsonb_set(
      COALESCE(NEW.implementation_phase1, '{}'::jsonb),
      '{status}',
      '"done"'
    );

    IF COALESCE(NEW.system_type, '') <> 'Modelos TN' THEN
      v_ref_end_date := COALESCE(v_end_date, public.fn_safe_valid_date(NEW.implementation_end_date::text));
      v_phase1_end_changed := (v_new_end_raw IS DISTINCT FROM v_old_end_raw) AND v_end_date IS NOT NULL;

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
  ELSE
    -- 7. Auto-ativacao da Fase 1 para 'in-progress' quando confirmada e startDate <= hoje < endDate
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
  END IF;

  -- 8. Automacao independente da Fase 2 ("Possivel Retorno"):
  --    Nao altera implementation_status, phase1 nem post_*.
  v_p2_start_date := public.fn_safe_valid_date(v_p2_start_raw);
  v_p2_end_date := public.fn_safe_valid_date(v_p2_end_raw);
  v_p2_manual_revert_from_done := (v_old_phase2_status = 'done' AND v_new_phase2_status <> 'done');
  v_p2_manual_revert_from_in_progress := (v_old_phase2_status = 'in-progress' AND v_new_phase2_status IN ('todo', 'blocked'));

  IF COALESCE(NEW.system_type, '') <> 'Modelos TN'
     AND NOT v_p2_manual_revert_from_done
     AND (v_p2_confirmed OR v_new_phase2_status = 'in-progress')
     AND v_p2_start_date IS NOT NULL
     AND v_p2_end_date IS NOT NULL
     AND v_p2_end_date <= v_today
     AND v_new_phase2_status <> 'done' THEN
    NEW.implementation_phase2 := jsonb_set(
      COALESCE(NEW.implementation_phase2, '{}'::jsonb),
      '{status}',
      '"done"'
    );
  ELSIF v_p2_confirmed
     AND v_p2_start_date IS NOT NULL
     AND v_p2_start_date <= v_today
     AND (v_p2_end_date IS NULL OR v_today < v_p2_end_date)
     AND NOT v_p2_manual_revert_from_in_progress
     AND v_new_phase2_status = 'todo' THEN
    NEW.implementation_phase2 := jsonb_set(
      COALESCE(NEW.implementation_phase2, '{}'::jsonb),
      '{status}',
      '"in-progress"'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deployment_to_post_before ON public.projects;
CREATE TRIGGER trg_deployment_to_post_before
  BEFORE UPDATE OF implementation_status, implementation_phase1, implementation_phase2, post_status, post_start_date, post_end_date ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_deployment_to_post_transition_before();

-- 4. RPC de verificacao periodica (Auto-Inicio / Auto-Fim Fase 1, Pos-Implantacao e Fase 2)
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
  v_phase1_handled BOOLEAN;

  -- Variaveis da Fase 2
  v_p2_confirmed BOOLEAN;
  v_p2_status TEXT;
  v_p2_start_str TEXT;
  v_p2_end_str TEXT;
  v_p2_start_date DATE;
  v_p2_end_date DATE;
BEGIN
  FOR v_proj IN
    SELECT
      id,
      client_name,
      system_type,
      global_status,
      implementation_status,
      implementation_phase1,
      implementation_phase2,
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
    v_phase1_handled := false;
    v_is_confirmed := COALESCE((v_proj.implementation_phase1->>'isConfirmed')::boolean, false);
    v_impl_status := COALESCE(v_proj.implementation_status, 'todo');
    v_phase1_status := COALESCE(v_proj.implementation_phase1->>'status', 'todo');
    v_curr_post_status := COALESCE(v_proj.post_status, 'todo');
    v_start_str := NULLIF(btrim(COALESCE(v_proj.implementation_phase1->>'startDate', v_proj.implementation_phase1->>'start_date', '')), '');
    v_end_str := NULLIF(btrim(COALESCE(v_proj.implementation_phase1->>'endDate', v_proj.implementation_phase1->>'end_date', '')), '');

    v_start_date := public.fn_safe_valid_date(v_start_str);
    v_end_date := public.fn_safe_valid_date(v_end_str);

    -- A) Auto-inicio da Implantacao (Fase 1): confirmada e startDate <= hoje < endDate
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
      v_phase1_handled := true;
    END IF;

    -- B) Auto-conclusao na data de Termino (Fase 1)
    IF NOT v_phase1_handled
       AND COALESCE(v_proj.system_type, '') <> 'Modelos TN'
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
      v_phase1_handled := true;
    END IF;

    -- C) Projetos cuja Implantacao ja esta 'done': transicao e datas de Pos-Implantacao
    IF NOT v_phase1_handled
       AND COALESCE(v_proj.system_type, '') <> 'Modelos TN'
       AND (v_impl_status = 'done' OR v_phase1_status = 'done')
       AND v_curr_post_status <> 'done'
       AND v_curr_post_status <> 'blocked' THEN
      v_ref_end_date := COALESCE(
        v_end_date,
        public.fn_safe_valid_date(v_proj.implementation_end_date::text),
        v_proj.updated_at::date,
        v_today
      );
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

    -- D) Automacao independente da Fase 2 ("Possivel Retorno")
    v_p2_confirmed := COALESCE((v_proj.implementation_phase2->>'isConfirmed')::boolean, false);
    v_p2_status := COALESCE(v_proj.implementation_phase2->>'status', 'todo');
    v_p2_start_str := NULLIF(btrim(COALESCE(v_proj.implementation_phase2->>'startDate', v_proj.implementation_phase2->>'start_date', '')), '');
    v_p2_end_str := NULLIF(btrim(COALESCE(v_proj.implementation_phase2->>'endDate', v_proj.implementation_phase2->>'end_date', '')), '');
    v_p2_start_date := public.fn_safe_valid_date(v_p2_start_str);
    v_p2_end_date := public.fn_safe_valid_date(v_p2_end_str);

    IF v_p2_confirmed
       AND v_p2_start_date IS NOT NULL
       AND v_p2_start_date <= v_today
       AND (v_p2_end_date IS NULL OR v_today < v_p2_end_date)
       AND v_p2_status = 'todo' THEN
      UPDATE public.projects
      SET
        implementation_phase2 = jsonb_set(
          COALESCE(implementation_phase2, '{}'::jsonb),
          '{status}',
          '"in-progress"'
        ),
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
        'Fase 2 (Possível Retorno) confirmada iniciada automaticamente ("Em Andamento")',
        jsonb_build_object(
          'category', 'stages',
          'actionType', 'status_change',
          'tabLabel', 'Etapas',
          'stageLabel', '5. Implantação & Treinamento',
          'fieldLabel', 'Status da Fase 2',
          'changes', jsonb_build_array(
            jsonb_build_object(
              'field', 'implementation_phase2.status',
              'label', 'Fase 2 Possível Retorno (Status)',
              'oldValue', v_p2_status,
              'newValue', 'in-progress'
            )
          )
        )
      );

      v_updated_count := v_updated_count + 1;
    ELSIF COALESCE(v_proj.system_type, '') <> 'Modelos TN'
       AND v_p2_status <> 'done'
       AND (v_p2_confirmed OR v_p2_status = 'in-progress')
       AND v_p2_start_date IS NOT NULL
       AND v_p2_end_date IS NOT NULL
       AND v_p2_end_date >= (v_today - INTERVAL '14 days')
       AND v_p2_end_date <= v_today THEN
      UPDATE public.projects
      SET
        implementation_phase2 = jsonb_set(
          COALESCE(implementation_phase2, '{}'::jsonb),
          '{status}',
          '"done"'
        ),
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
        'Fase 2 (Possível Retorno) concluída automaticamente na data de término ("Finalizado")',
        jsonb_build_object(
          'category', 'stages',
          'actionType', 'status_change',
          'tabLabel', 'Etapas',
          'stageLabel', '5. Implantação & Treinamento',
          'fieldLabel', 'Status da Fase 2',
          'changes', jsonb_build_array(
            jsonb_build_object(
              'field', 'implementation_phase2.status',
              'label', 'Fase 2 Possível Retorno (Status)',
              'oldValue', v_p2_status,
              'newValue', 'done'
            )
          )
        )
      );

      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;

  RETURN v_updated_count;
END;
$$;

-- 5. Notificacao oficial de Changelog
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
  'Paridade da Fase 2 com Calendário e Proteção na Digitação de Datas',
  'A etapa Fase 2 (Possível Retorno) agora possui interruptor de confirmação com registro de data/hora, suporte a múltiplos implantadores, automações de status e sincronização completa no Calendário. Também corrigimos o bug ao digitar anos em campos de data e os avisos iniciais de gráficos.',
  '/calendar'
);

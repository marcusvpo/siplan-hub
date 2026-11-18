-- Migration: 20261118013000_fix_deployment_transitions_logs_and_chamado_0800.sql
-- Objetivos:
-- 1. Auto-transição de Fase 1 e Etapa 5 (Implantação & Treinamento) para 'in-progress' quando isConfirmed = true e startDate <= hoje (BRT).
-- 2. Correção de datas residuais na coluna implementation_start_date/end_date, remoção de notificações falsas de Pós-Implantação
--    e correção definitiva do trigger fn_handle_deployment_to_post_transition_before para permitir reversão de status sem armadilha OR
--    e exigir datas válidas da Fase 1 antes de iniciar Pós-Implantação.
-- 3. Registro automático de confirmedAt em implementation_phase1 quando isConfirmed = true.
-- 4. Evolução de timeline_events para auditoria completa (visualizações, campos, botões, arquivos, IA, Skills).
-- 5. Remoção das colunas legadas do 0800 ("TituloChamado", "descricaotramite", "ResponsavelAtividade", "EtapasProjeto")
--    e da tabela public.project_tramites, passando a usar integralmente as tabelas espelho da view Ellevo (vm-worker).

-- ============================================================================
-- 1. ATUALIZAÇÃO DO TRIGGER BEFORE DE TRANSIÇÃO DE IMPLANTAÇÃO / FASE 1
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
  v_old_confirmed BOOLEAN := COALESCE((OLD.implementation_phase1->>'isConfirmed')::boolean, false);
  v_new_confirmed BOOLEAN := COALESCE((NEW.implementation_phase1->>'isConfirmed')::boolean, false);
  v_new_start_raw TEXT := NULLIF(btrim(COALESCE(NEW.implementation_phase1->>'startDate', NEW.implementation_phase1->>'start_date', '')), '');
  v_new_end_raw TEXT := NULLIF(btrim(COALESCE(NEW.implementation_phase1->>'endDate', NEW.implementation_phase1->>'end_date', '')), '');
  v_start_date DATE := NULL;
  v_end_date DATE := NULL;
  v_became_done BOOLEAN := false;
  v_manual_revert_from_in_progress BOOLEAN := false;
BEGIN
  -- 1. Sincroniza confirmedAt dentro de implementation_phase1 ao ativar/desativar interruptor
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

  -- 2. Sincroniza colunas implementation_start_date / implementation_end_date com a Fase 1
  --    Evita datas fantasmas quando as datas da Fase 1 são limpas pelo usuário
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

  -- 3. Tratamento explícito de reversão de 'done' (evita armadilha de OR travando em done)
  IF v_old_impl_status = 'done' AND v_new_impl_status <> 'done' AND v_new_phase1_status = 'done' THEN
    NEW.implementation_phase1 := jsonb_set(
      COALESCE(NEW.implementation_phase1, '{}'::jsonb),
      '{status}',
      to_jsonb(v_new_impl_status)
    );
    v_new_phase1_status := v_new_impl_status;
  ELSIF v_old_phase1_status = 'done' AND v_new_phase1_status <> 'done' AND v_new_impl_status = 'done' THEN
    NEW.implementation_status := v_new_phase1_status;
    v_new_impl_status := v_new_phase1_status;
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

  -- 5. Transição explícita para 'done' (apenas quando realmente mudou para 'done')
  v_became_done :=
    (v_new_impl_status = 'done' AND v_old_impl_status <> 'done')
    OR (v_new_phase1_status = 'done' AND v_old_phase1_status <> 'done');

  IF v_became_done THEN
    NEW.implementation_status := 'done';
    NEW.implementation_phase1 := jsonb_set(
      COALESCE(NEW.implementation_phase1, '{}'::jsonb),
      '{status}',
      '"done"'
    );

    -- Pós-Implantação só inicia automaticamente se NÃO for Modelos TN e se a Fase 1 possuir datas válidas
    IF COALESCE(NEW.system_type, '') <> 'Modelos TN'
       AND (NEW.post_status IS NULL OR NEW.post_status = 'todo')
       AND v_start_date IS NOT NULL
       AND v_end_date IS NOT NULL THEN
      NEW.post_status := 'in-progress';
      NEW.post_start_date := v_today;
      NEW.post_support_end_date := v_today + INTERVAL '15 days';
    END IF;

    RETURN NEW;
  END IF;

  -- 6. Auto-ativação para 'in-progress' quando confirmada e na data de início (ou em curso)
  v_manual_revert_from_in_progress :=
    (v_old_impl_status = 'in-progress' AND v_new_impl_status IN ('todo', 'blocked'))
    OR (v_old_phase1_status = 'in-progress' AND v_new_phase1_status IN ('todo', 'blocked'));

  IF v_new_confirmed
     AND v_start_date IS NOT NULL
     AND v_start_date <= v_today
     AND (v_end_date IS NULL OR v_end_date >= v_today)
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

-- ============================================================================
-- 2. RPC DE TRANSIÇÃO AUTOMÁTICA (AUTO-INÍCIO E AUTO-CONCLUSÃO DE FASE 1)
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
  v_is_confirmed BOOLEAN;
  v_impl_status TEXT;
  v_phase1_status TEXT;
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
      post_status
    FROM public.projects
    WHERE is_deleted = false
      AND global_status = 'in-progress'
  LOOP
    v_is_confirmed := COALESCE((v_proj.implementation_phase1->>'isConfirmed')::boolean, false);
    v_impl_status := COALESCE(v_proj.implementation_status, 'todo');
    v_phase1_status := COALESCE(v_proj.implementation_phase1->>'status', 'todo');
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

    -- A) Auto-início: se implantação confirmada, Início <= hoje, ainda não expirou e está como 'todo'
    IF v_is_confirmed
       AND v_start_date IS NOT NULL
       AND v_start_date <= v_today
       AND (v_end_date IS NULL OR v_end_date >= v_today)
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

    -- B) Auto-conclusão: exige startDate e endDate válidos na Fase 1, não ser Modelos TN,
    --    e término expirado nos últimos 3 dias (janela de fim de semana)
    IF COALESCE(v_proj.system_type, '') <> 'Modelos TN'
       AND v_impl_status <> 'done'
       AND (v_proj.post_status IS NULL OR v_proj.post_status = 'todo')
       AND v_start_date IS NOT NULL
       AND v_end_date IS NOT NULL
       AND v_end_date >= (v_today - INTERVAL '3 days')
       AND v_end_date < v_today THEN
      UPDATE public.projects
      SET
        implementation_status = 'done',
        implementation_phase1 = jsonb_set(
          COALESCE(implementation_phase1, '{}'::jsonb),
          '{status}',
          '"done"'
        ),
        post_status = 'in-progress',
        post_start_date = v_today,
        post_support_end_date = v_today + INTERVAL '15 days',
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
        'Implantação concluída automaticamente ao término da Fase 1 e Pós-Implantação iniciado',
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
              'field', 'post_status',
              'label', '6. Pós-Implantação (Status)',
              'oldValue', COALESCE(v_proj.post_status, 'todo'),
              'newValue', 'in-progress'
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

-- ============================================================================
-- 3. EVOLUÇÃO DE timeline_events E CORREÇÃO DE save_project_skills_credentials
-- ============================================================================
ALTER TABLE public.timeline_events
  DROP CONSTRAINT IF EXISTS timeline_events_type_check;

ALTER TABLE public.timeline_events
  ADD CONSTRAINT timeline_events_type_check CHECK (
    type = ANY (
      ARRAY[
        'auto'::text,
        'comment'::text,
        'field_change'::text,
        'status_change'::text,
        'file_upload'::text,
        'file_delete'::text,
        'bulk_edit'::text,
        'project_created'::text,
        'project_deleted'::text,
        'project_view'::text,
        'stage_change'::text,
        'secondary_product'::text,
        'roadmap_change'::text,
        'skills_action'::text,
        'button_action'::text,
        'ai_action'::text,
        'sync_action'::text
      ]
    )
  );

CREATE INDEX IF NOT EXISTS idx_timeline_events_project_timestamp
  ON public.timeline_events (project_id, timestamp DESC);

CREATE OR REPLACE FUNCTION public.save_project_skills_credentials(
  p_project_ids uuid[],
  p_skills_payload jsonb,
  p_actor_name text DEFAULT 'Sistema'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patch jsonb;
  v_pid uuid;
  v_is_silent boolean := (coalesce(p_actor_name, '') = '__SILENT_SYNC__');
  v_clean_actor text := CASE
    WHEN coalesce(p_actor_name, '') IN ('', '__SILENT_SYNC__') THEN 'Sincronização Automática Skills'
    ELSE trim(p_actor_name)
  END;
BEGIN
  v_patch := jsonb_build_object(
    'skills_cartorio_id', p_skills_payload->>'cartorio_id',
    'skills_cartorio_nome', p_skills_payload->>'cartorio_nome',
    'skills_user_id', p_skills_payload->>'user_id',
    'skills_username', p_skills_payload->>'username',
    'skills_login_token', p_skills_payload->>'login_token',
    'skills_expiration_date', p_skills_payload->>'data_expiracao',
    'skills_observacoes', p_skills_payload->>'observacoes',
    'skills_systems_released', coalesce(p_skills_payload->'systems_released', '[]'::jsonb),
    'skills_products_released', coalesce(p_skills_payload->'products_released', '[]'::jsonb),
    'skills_portal_url', coalesce(p_skills_payload->>'portal_url', 'https://skills.siplan.com.br/'),
    'skills_last_activity', p_skills_payload->>'last_activity',
    'skills_session_is_active', coalesce((p_skills_payload->>'session_is_active')::boolean, false)
  );

  IF NOT v_is_silent THEN
    v_patch := v_patch || jsonb_build_object(
      'skills_provisioned_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'skills_provisioned_by', v_clean_actor
    );
  END IF;

  UPDATE public.projects p
  SET custom_fields = coalesce(p.custom_fields, '{}'::jsonb) || v_patch || CASE
        WHEN v_is_silent THEN jsonb_build_object(
          'skills_provisioned_at', coalesce(p.custom_fields->>'skills_provisioned_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
          'skills_provisioned_by', coalesce(p.custom_fields->>'skills_provisioned_by', v_clean_actor)
        )
        ELSE '{}'::jsonb
      END,
      updated_at = CASE WHEN v_is_silent THEN p.updated_at ELSE now() END
  WHERE p.id = ANY(p_project_ids);

  IF NOT v_is_silent THEN
    FOREACH v_pid IN ARRAY p_project_ids LOOP
      INSERT INTO public.timeline_events (project_id, type, author, message, metadata)
      VALUES (
        v_pid,
        'skills_action',
        v_clean_actor,
        format(
          'Acesso Siplan Skills sincronizado — Usuário: %s | Token: %s',
          coalesce(p_skills_payload->>'username', '-'),
          coalesce(p_skills_payload->>'login_token', '-')
        ),
        jsonb_build_object(
          'category', 'skills',
          'actionType', 'skills_action',
          'tabLabel', 'Siplan Skills',
          'fieldLabel', 'Provisionamento Siplan Skills',
          'username', coalesce(p_skills_payload->>'username', '-'),
          'token', coalesce(p_skills_payload->>'login_token', '-'),
          'observacoes', coalesce(p_skills_payload->>'observacoes', '')
        )
      );
    END LOOP;
  END IF;
END;
$$;

-- ============================================================================
-- 4. LIMPEZA SEGURA DE DATAS ÓRFÃS, BACKFILL confirmedAt E NOTIFICAÇÕES FALSAS
-- ============================================================================
ALTER TABLE public.projects DISABLE TRIGGER trg_deployment_to_post_before;
ALTER TABLE public.projects DISABLE TRIGGER trg_notify_environment_events;
ALTER TABLE public.projects DISABLE TRIGGER trg_notify_project_stage_lifecycle;
ALTER TABLE public.projects DISABLE TRIGGER trg_notify_post_stage_activation;

-- Remove notificações falsas de Pós-Implantação disparadas para Franca 01 TN
DELETE FROM public.notifications
WHERE title = 'Início do Pós-Implantação: FRANCA - TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULOS 01'
  AND action_url = '/projects?id=b8a6ec30-2859-4880-8e6d-b3fb50614705';

-- Limpa datas residuais em implementation_start_date / implementation_end_date quando a Fase 1 não tem datas
UPDATE public.projects
SET
  implementation_start_date = CASE
    WHEN NULLIF(btrim(COALESCE(implementation_phase1->>'startDate', implementation_phase1->>'start_date', '')), '') IS NULL
      THEN NULL
    ELSE COALESCE(NULLIF(btrim(implementation_phase1->>'startDate'), ''), NULLIF(btrim(implementation_phase1->>'start_date'), ''))::timestamptz
  END,
  implementation_end_date = CASE
    WHEN NULLIF(btrim(COALESCE(implementation_phase1->>'endDate', implementation_phase1->>'end_date', '')), '') IS NULL
      THEN NULL
    ELSE COALESCE(NULLIF(btrim(implementation_phase1->>'endDate'), ''), NULLIF(btrim(implementation_phase1->>'end_date'), ''))::timestamptz
  END
WHERE is_deleted = false
  AND COALESCE(system_type, '') <> 'Modelos TN'
  AND (
    (
      NULLIF(btrim(COALESCE(implementation_phase1->>'startDate', implementation_phase1->>'start_date', '')), '') IS NULL
      AND implementation_start_date IS NOT NULL
    )
    OR (
      NULLIF(btrim(COALESCE(implementation_phase1->>'endDate', implementation_phase1->>'end_date', '')), '') IS NULL
      AND implementation_end_date IS NOT NULL
    )
    OR (
      NULLIF(btrim(COALESCE(implementation_phase1->>'startDate', '')), '') IS NOT NULL
      AND implementation_start_date IS NULL
    )
    OR (
      NULLIF(btrim(COALESCE(implementation_phase1->>'endDate', '')), '') IS NOT NULL
      AND implementation_end_date IS NULL
    )
  );

-- Backfill de confirmedAt para implantações já confirmadas que não possuíam timestamp registrado
UPDATE public.projects
SET implementation_phase1 = jsonb_set(
  implementation_phase1,
  '{confirmedAt}',
  to_jsonb(to_char(COALESCE(updated_at, created_at, NOW()) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
)
WHERE is_deleted = false
  AND COALESCE((implementation_phase1->>'isConfirmed')::boolean, false) = true
  AND COALESCE(NULLIF(btrim(implementation_phase1->>'confirmedAt'), ''), '') = '';

ALTER TABLE public.projects ENABLE TRIGGER trg_deployment_to_post_before;
ALTER TABLE public.projects ENABLE TRIGGER trg_notify_environment_events;
ALTER TABLE public.projects ENABLE TRIGGER trg_notify_project_stage_lifecycle;
ALTER TABLE public.projects ENABLE TRIGGER trg_notify_post_stage_activation;

-- Executa imediatamente a verificação para transicionar implantações confirmadas já iniciadas (incluindo Franca 2º RI)
SELECT public.fn_auto_finish_expired_deployments();

-- ============================================================================
-- 5. REFATORAÇÃO DO CHAMADO 0800 (VIEW ELLEVO) E REMOÇÃO DE COLUNAS/TABELA LEGADAS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_detected_0800_commercial_data(p_ticket_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket text;
  v_title text;
  v_current_hours numeric;
  v_current_legacy text;
  v_tr record;
  v_ext record;
  v_found_hours numeric := NULL;
  v_found_legacy text := NULL;
  v_tramite_num integer := NULL;
  v_tramite_date timestamp without time zone := NULL;
  v_tramite_resp text := NULL;
BEGIN
  v_ticket := btrim(COALESCE(p_ticket_number, ''));
  IF v_ticket = '' THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT sold_hours, legacy_system
  INTO v_current_hours, v_current_legacy
  FROM public.projects
  WHERE ticket_number = v_ticket AND is_deleted = false
  LIMIT 1;

  SELECT titulo INTO v_title
  FROM public.chamados_processo_venda
  WHERE numero_chamado = v_ticket
  LIMIT 1;

  IF v_title IS NULL THEN
    SELECT titulo INTO v_title
    FROM public.chamados_0800
    WHERE numero_chamado = v_ticket
    LIMIT 1;
  END IF;

  IF v_title IS NOT NULL THEN
    SELECT extracted_legacy INTO v_found_legacy
    FROM public.extract_commercial_data(NULL, v_title);
  END IF;

  FOR v_tr IN
    SELECT numero_tramite, data_tramite, responsavel, descricao
    FROM public.chamados_processo_venda_tramites
    WHERE numero_chamado = v_ticket
    ORDER BY COALESCE(numero_tramite, 0) DESC, data_tramite DESC
  LOOP
    SELECT * INTO v_ext
    FROM public.extract_commercial_data(v_tr.descricao, v_title);

    IF v_found_hours IS NULL AND v_ext.extracted_hours IS NOT NULL THEN
      v_found_hours := v_ext.extracted_hours;
      v_tramite_num := v_tr.numero_tramite;
      v_tramite_date := v_tr.data_tramite;
      v_tramite_resp := v_tr.responsavel;
    END IF;

    IF v_found_legacy IS NULL AND v_ext.extracted_legacy IS NOT NULL THEN
      v_found_legacy := v_ext.extracted_legacy;
      IF v_tramite_num IS NULL THEN
        v_tramite_num := v_tr.numero_tramite;
        v_tramite_date := v_tr.data_tramite;
        v_tramite_resp := v_tr.responsavel;
      END IF;
    END IF;

    IF v_found_hours IS NOT NULL AND v_found_legacy IS NOT NULL THEN
      EXIT;
    END IF;
  END LOOP;

  IF v_found_hours IS NOT NULL OR v_found_legacy IS NOT NULL THEN
    RETURN jsonb_build_object(
      'found', true,
      'sold_hours', v_found_hours,
      'legacy_system', v_found_legacy,
      'tramite_numero', v_tramite_num,
      'tramite_data', v_tramite_date,
      'tramite_responsavel', v_tramite_resp,
      'already_applied', (
        (v_found_hours IS NULL OR v_found_hours = v_current_hours) AND
        (v_found_legacy IS NULL OR lower(btrim(v_found_legacy)) = lower(btrim(COALESCE(v_current_legacy, ''))))
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'found', false,
    'already_applied', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_fn_sync_project_commercial_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket text;
  v_title text;
  v_ext record;
BEGIN
  v_ticket := btrim(COALESCE(NEW.numero_chamado, ''));
  IF v_ticket = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.descricao IS NULL OR (
    NEW.descricao !~* 'Horas vendidas' AND
    NEW.descricao !~* 'Convers[ãa]o' AND
    NEW.descricao !~* 'Sistema atual do cart[oó]rio'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT titulo INTO v_title
  FROM public.chamados_processo_venda
  WHERE numero_chamado = v_ticket
  LIMIT 1;

  IF v_title IS NULL THEN
    SELECT titulo INTO v_title
    FROM public.chamados_0800
    WHERE numero_chamado = v_ticket
    LIMIT 1;
  END IF;

  SELECT * INTO v_ext
  FROM public.extract_commercial_data(NEW.descricao, v_title);

  IF v_ext.extracted_hours IS NOT NULL OR v_ext.extracted_legacy IS NOT NULL THEN
    UPDATE public.projects
    SET
      sold_hours = COALESCE(sold_hours, v_ext.extracted_hours),
      legacy_system = COALESCE(legacy_system, v_ext.extracted_legacy),
      updated_at = now()
    WHERE ticket_number = v_ticket
      AND is_deleted = false
      AND (sold_hours IS NULL OR legacy_system IS NULL);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_0800_project(
  p_ticket_number text,
  p_client_name text,
  p_system_type text,
  p_sales_order_number integer,
  p_op_number integer,
  p_titulo_chamado text,
  p_descricao_tramite text,
  p_responsavel_atividade text,
  p_etapas_projeto text,
  p_project_leader text DEFAULT NULL::text,
  p_sold_hours numeric DEFAULT NULL::numeric,
  p_legacy_system text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_clean_ticket text;
  v_clean_client text;
  v_norm_client text;
  v_class record;
  v_project_id uuid;
  v_project_status text;
  v_project_system text;
  v_secondary_id uuid;
  v_parent_ids uuid[];
  v_pid uuid;
  v_sec record;
  v_ext record;
  v_final_hours numeric;
  v_final_legacy text;
BEGIN
  v_clean_ticket := btrim(COALESCE(p_ticket_number, ''));
  IF v_clean_ticket = '' THEN
    RETURN;
  END IF;

  v_clean_client := COALESCE(NULLIF(btrim(p_client_name), ''), 'Cliente não identificado');
  v_norm_client := public.normalize_client_match_key(v_clean_client);

  SELECT * INTO v_ext
  FROM public.extract_commercial_data(p_descricao_tramite, p_titulo_chamado);

  v_final_hours := COALESCE(p_sold_hours, v_ext.extracted_hours);
  v_final_legacy := COALESCE(NULLIF(btrim(p_legacy_system), ''), v_ext.extracted_legacy);

  SELECT * INTO v_class
  FROM public.classify_0800_implantation_ticket(p_titulo_chamado, p_system_type)
  LIMIT 1;

  IF v_class IS NULL OR v_class.category = 'ignored' THEN
    RETURN;
  END IF;

  -- RAMO A: SISTEMA PRINCIPAL
  IF v_class.category = 'primary' THEN
    SELECT id INTO v_project_id
    FROM public.projects
    WHERE ticket_number = v_clean_ticket
      AND is_deleted = false
    LIMIT 1;

    IF v_project_id IS NOT NULL THEN
      UPDATE public.projects
      SET
        op_number = COALESCE(op_number, p_op_number),
        sales_order_number = COALESCE(sales_order_number, p_sales_order_number),
        sold_hours = COALESCE(sold_hours, v_final_hours),
        legacy_system = COALESCE(legacy_system, v_final_legacy),
        updated_at = now()
      WHERE id = v_project_id;
    ELSE
      INSERT INTO public.projects (
        ticket_number,
        client_name,
        system_type,
        sales_order_number,
        op_number,
        global_status,
        project_type,
        last_update_by,
        project_leader,
        sold_hours,
        legacy_system
      ) VALUES (
        v_clean_ticket,
        v_clean_client,
        v_class.canonical_name,
        p_sales_order_number,
        p_op_number,
        'in-progress',
        'new',
        'Automação 0800',
        COALESCE(NULLIF(btrim(p_project_leader), ''), 'Bruno Fernandes'),
        v_final_hours,
        v_final_legacy
      )
      RETURNING id INTO v_project_id;

      INSERT INTO public.timeline_events (
        project_id,
        type,
        author,
        message,
        metadata
      ) VALUES (
        v_project_id,
        'project_created',
        'Automação 0800',
        'Projeto criado automaticamente a partir do chamado 0800 #' || v_clean_ticket,
        jsonb_build_object(
          'category', 'automation',
          'actionType', 'project_created',
          'tabLabel', 'Chamado 0800',
          'ticket_number', v_clean_ticket,
          'titulo', p_titulo_chamado,
          'etapas_projeto', p_etapas_projeto
        )
      );
    END IF;

    SELECT global_status, system_type
    INTO v_project_status, v_project_system
    FROM public.projects
    WHERE id = v_project_id;

    IF COALESCE(v_project_status, '') NOT IN ('done', 'archived') THEN
      FOR v_sec IN
        SELECT st.id, cat.only_system_type
        FROM public.secondary_tickets st
        LEFT JOIN public.secondary_product_catalog cat ON cat.code = st.product_code
        WHERE st.hub_status <> 'cancelled'
          AND (cat.only_system_type IS NULL OR cat.only_system_type = v_project_system)
          AND (
            (p_op_number IS NOT NULL AND p_op_number > 0 AND st.op_number = p_op_number)
            OR (p_sales_order_number IS NOT NULL AND p_sales_order_number > 0 AND st.sales_order_number = p_sales_order_number)
            OR (v_norm_client IS NOT NULL AND public.normalize_client_match_key(st.client_name) = v_norm_client)
            OR EXISTS (
              SELECT 1
              FROM public.chamados_processo_venda cpv
              WHERE cpv.numero_chamado = v_clean_ticket
                AND public.normalize_client_match_key(cpv.nome_cliente) = public.normalize_client_match_key(st.client_name)
            )
            OR EXISTS (
              SELECT 1
              FROM public.chamados_0800 c0
              WHERE c0.numero_chamado = v_clean_ticket
                AND public.normalize_client_match_key(c0.nome_cliente) = public.normalize_client_match_key(st.client_name)
            )
          )
      LOOP
        INSERT INTO public.project_secondary_ticket_links (project_id, secondary_ticket_id, link_source)
        VALUES (v_project_id, v_sec.id, 'auto')
        ON CONFLICT (project_id, secondary_ticket_id) DO NOTHING;
      END LOOP;
    END IF;

    RETURN;
  END IF;

  -- RAMO B: PRODUTO SECUNDÁRIO
  IF v_class.category = 'secondary' THEN
    SELECT COALESCE(ARRAY_AGG(DISTINCT p.id), '{}'::uuid[])
    INTO v_parent_ids
    FROM public.projects p
    WHERE p.is_deleted = false
      AND COALESCE(p.is_archived, false) = false
      AND COALESCE(p.global_status, '') NOT IN ('done', 'archived')
      AND COALESCE(p.system_type, '') IN ('Orion TN', 'Orion PRO', 'Orion REG', 'WebRI', 'WEB RC')
      AND (v_class.only_system_type IS NULL OR p.system_type = v_class.only_system_type)
      AND (
        (p_op_number IS NOT NULL AND p_op_number > 0 AND p.op_number = p_op_number)
        OR (p_sales_order_number IS NOT NULL AND p_sales_order_number > 0 AND p.sales_order_number = p_sales_order_number)
        OR (v_norm_client IS NOT NULL AND public.normalize_client_match_key(p.client_name) = v_norm_client)
        OR (
          v_norm_client IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.chamados_processo_venda cpv
            WHERE cpv.numero_chamado = p.ticket_number
              AND public.normalize_client_match_key(cpv.nome_cliente) = v_norm_client
          )
        )
        OR (
          v_norm_client IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.chamados_0800 c0
            WHERE c0.numero_chamado = p.ticket_number
              AND public.normalize_client_match_key(c0.nome_cliente) = v_norm_client
          )
        )
      );

    SELECT id INTO v_secondary_id
    FROM public.secondary_tickets
    WHERE ticket_number = v_clean_ticket
    LIMIT 1;

    IF COALESCE(array_length(v_parent_ids, 1), 0) = 0 AND v_secondary_id IS NULL THEN
      RETURN;
    END IF;

    INSERT INTO public.secondary_tickets (
      ticket_number,
      product_code,
      product_name,
      client_name,
      op_number,
      sales_order_number,
      titulo_chamado,
      ellevo_status,
      ellevo_last_tramite,
      ellevo_analyst
    ) VALUES (
      v_clean_ticket,
      v_class.product_code,
      v_class.canonical_name,
      v_clean_client,
      p_op_number,
      p_sales_order_number,
      p_titulo_chamado,
      NULLIF(btrim(p_etapas_projeto), ''),
      NULLIF(btrim(p_descricao_tramite), 'Sem descrição'),
      NULLIF(btrim(p_responsavel_atividade), 'Não atribuído')
    )
    ON CONFLICT (ticket_number) DO UPDATE SET
      product_code = COALESCE(EXCLUDED.product_code, public.secondary_tickets.product_code),
      product_name = COALESCE(EXCLUDED.product_name, public.secondary_tickets.product_name),
      op_number = COALESCE(public.secondary_tickets.op_number, EXCLUDED.op_number),
      sales_order_number = COALESCE(public.secondary_tickets.sales_order_number, EXCLUDED.sales_order_number),
      titulo_chamado = COALESCE(EXCLUDED.titulo_chamado, public.secondary_tickets.titulo_chamado),
      ellevo_status = CASE
        WHEN public.secondary_tickets.ellevo_synced_at IS NULL
        THEN COALESCE(EXCLUDED.ellevo_status, public.secondary_tickets.ellevo_status)
        ELSE public.secondary_tickets.ellevo_status
      END,
      ellevo_last_tramite = CASE
        WHEN public.secondary_tickets.ellevo_synced_at IS NULL
        THEN COALESCE(EXCLUDED.ellevo_last_tramite, public.secondary_tickets.ellevo_last_tramite)
        ELSE public.secondary_tickets.ellevo_last_tramite
      END,
      ellevo_analyst = CASE
        WHEN public.secondary_tickets.ellevo_synced_at IS NULL
        THEN COALESCE(EXCLUDED.ellevo_analyst, public.secondary_tickets.ellevo_analyst)
        ELSE public.secondary_tickets.ellevo_analyst
      END,
      updated_at = now()
    RETURNING id INTO v_secondary_id;

    FOREACH v_pid IN ARRAY v_parent_ids
    LOOP
      INSERT INTO public.project_secondary_ticket_links (project_id, secondary_ticket_id, link_source)
      VALUES (v_pid, v_secondary_id, 'auto')
      ON CONFLICT (project_id, secondary_ticket_id) DO NOTHING;
    END LOOP;
  END IF;
END;
$function$;

DROP TABLE IF EXISTS public.project_tramites CASCADE;

ALTER TABLE public.projects
  DROP COLUMN IF EXISTS "TituloChamado",
  DROP COLUMN IF EXISTS "descricaotramite",
  DROP COLUMN IF EXISTS "ResponsavelAtividade",
  DROP COLUMN IF EXISTS "EtapasProjeto";

-- ============================================================================
-- 6. NOTIFICAÇÃO OFICIAL DE NOVIDADES / CHANGELOG
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
  'Melhorias em Implantação, Auditoria de Logs e Chamado 0800',
  'Autoativação de implantações confirmadas na data de início, registro da data de confirmação, correção de datas residuais e transições de Pós-Implantação, histórico completo de alterações e visualizações com filtros avançados, e aba Chamado 0800 refeita com dados completos do Ellevo via vm-worker.',
  '/projects'
);

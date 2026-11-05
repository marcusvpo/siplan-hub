-- Migration: 20261104140500_fix_sync_0800_project_columns.sql
-- Objetivo: Corrigir referências a colunas inexistentes na RPC sync_0800_project 
-- (st.normalized_client -> normalize_client_match_key, st.product_catalog_id -> st.product_code,
--  created_by -> link_source, pt.created_at -> pt.data_tramite, project_type -> 'new')
-- e unificar assinatura de 12 parâmetros.

-- 1. Remove sobrecarga antiga de 10 parâmetros se existir
DROP FUNCTION IF EXISTS public.sync_0800_project(text, text, text, integer, integer, text, text, text, text, text);

-- 2. Recria a função unificada com valores default para flexibilidade
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
  v_last_tramite text;
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

  -- Extração de Horas e Legado
  SELECT * INTO v_ext
  FROM public.extract_commercial_data(p_descricao_tramite, p_titulo_chamado);

  v_final_hours := COALESCE(p_sold_hours, v_ext.extracted_hours);
  v_final_legacy := COALESCE(NULLIF(btrim(p_legacy_system), ''), v_ext.extracted_legacy);

  -- Classifica o chamado com blindagem anti-typo e dupla checagem
  SELECT * INTO v_class
  FROM public.classify_0800_implantation_ticket(p_titulo_chamado, p_system_type)
  LIMIT 1;

  IF v_class IS NULL OR v_class.category = 'ignored' THEN
    RETURN;
  END IF;

  -- ==========================================================================
  -- RAMO A: SISTEMA PRINCIPAL (Orion TN, Orion PRO, Orion REG, WebRI)
  -- ==========================================================================
  IF v_class.category = 'primary' THEN
    SELECT id INTO v_project_id
    FROM public.projects
    WHERE ticket_number = v_clean_ticket
      AND is_deleted = false
    LIMIT 1;

    IF v_project_id IS NOT NULL THEN
      UPDATE public.projects
      SET
        "TituloChamado" = p_titulo_chamado,
        "descricaotramite" = p_descricao_tramite,
        "ResponsavelAtividade" = p_responsavel_atividade,
        "EtapasProjeto" = p_etapas_projeto,
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
        "TituloChamado",
        "descricaotramite",
        "ResponsavelAtividade",
        "EtapasProjeto",
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
        p_titulo_chamado,
        p_descricao_tramite,
        p_responsavel_atividade,
        p_etapas_projeto,
        'todo',
        'new',
        'Automação 0800',
        COALESCE(NULLIF(btrim(p_project_leader), ''), 'Bruno Fernandes'),
        v_final_hours,
        v_final_legacy
      )
      RETURNING id INTO v_project_id;
    END IF;

    -- Insere trâmite no histórico do projeto principal se mudou
    IF p_descricao_tramite IS NOT NULL AND btrim(p_descricao_tramite) <> '' THEN
      SELECT pt.descricao_tramite INTO v_last_tramite
      FROM public.project_tramites pt
      WHERE pt.project_id = v_project_id
      ORDER BY pt.data_tramite DESC
      LIMIT 1;

      IF v_last_tramite IS NULL OR v_last_tramite IS DISTINCT FROM p_descricao_tramite THEN
        INSERT INTO public.project_tramites (
          project_id,
          descricao_tramite,
          responsavel_atividade,
          etapa_projeto,
          data_tramite
        ) VALUES (
          v_project_id,
          p_descricao_tramite,
          p_responsavel_atividade,
          p_etapas_projeto,
          now()
        );
      END IF;
    END IF;

    -- Vínculo reverso automático com ponte SAP <-> Ellevo
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

  -- ==========================================================================
  -- RAMO B: PRODUTO SECUNDÁRIO (14 produtos oficiais)
  -- ==========================================================================
  IF v_class.category = 'secondary' THEN
    -- Localiza todos os projetos principais ATIVOS elegíveis
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

-- 3. Notificação Changelog
INSERT INTO public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
) VALUES (
  'changelog',
  'release_fix',
  'projects',
  'Correção no sincronizador de projetos 0800',
  'Corrigidas referências a colunas no banco de dados na função RPC sync_0800_project, restabelecendo a execução automática do fluxo diário do n8n.',
  '/projects'
);

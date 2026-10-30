-- Migration: 20261029235000_auto_extract_project_commercial_data.sql
-- Objetivo: Auto-extração e sincronização reativa de Horas Vendidas (sold_hours)
-- e Sistema Legado (legacy_system) a partir dos trâmites e títulos do 0800/Ellevo.

-- 1. FUNÇÃO AUXILIAR: Extração pura de dados comerciais com regex e normalização
CREATE OR REPLACE FUNCTION public.extract_commercial_data(
  p_text text,
  p_title text DEFAULT NULL
)
RETURNS TABLE (
  extracted_hours numeric,
  extracted_legacy text
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_hours numeric := NULL;
  v_legacy text := NULL;
  v_h_pres numeric := NULL;
  v_h_rem numeric := NULL;
  v_raw_hours text;
  v_raw_leg text;
BEGIN
  -- 1. Extração de Horas
  -- Formato A: "Horas vendidas de Implantação: 80 horas" ou "Horas vendidas: 40 horas"
  v_raw_hours := substring(p_text FROM '(?i)Horas vendidas[^:\n\r<]*:\s*([0-9]+(?:[.,][0-9]+)?)\s*h');
  IF v_raw_hours IS NOT NULL AND v_raw_hours ~ '^[0-9]+([.,][0-9]+)?$' THEN
    v_hours := replace(v_raw_hours, ',', '.')::numeric;
  ELSE
    -- Formato B: Template de passagem (Presencial + Remoto/Cortesia)
    v_raw_hours := substring(p_text FROM '(?i)Horas vendidas\s*[-—]\s*Implantação presencial:\s*([0-9]+(?:[.,][0-9]+)?)\s*h');
    IF v_raw_hours IS NOT NULL AND v_raw_hours ~ '^[0-9]+([.,][0-9]+)?$' THEN
      v_h_pres := replace(v_raw_hours, ',', '.')::numeric;
    END IF;

    v_raw_hours := substring(p_text FROM '(?i)Horas vendidas\s*[-—]\s*Implantação remota/cortesia:\s*([0-9]+(?:[.,][0-9]+)?)\s*h');
    IF v_raw_hours IS NOT NULL AND v_raw_hours ~ '^[0-9]+([.,][0-9]+)?$' THEN
      v_h_rem := replace(v_raw_hours, ',', '.')::numeric;
    END IF;

    IF v_h_pres IS NOT NULL OR v_h_rem IS NOT NULL THEN
      v_hours := COALESCE(v_h_pres, 0) + COALESCE(v_h_rem, 0);
    END IF;
  END IF;

  -- 2. Extração de Sistema Legado
  -- Prioridade 1: Título do Chamado (ex: "OP: ... + Conversão WebTD" ou "+ Conversão SiplanPRO")
  IF p_title IS NOT NULL THEN
    v_raw_leg := substring(p_title FROM '(?i)\+\s*Convers[ãa]o(?:\s+de\s+Bases?(?:\s+de\s+Dados)?(?:\s+e\s+Imagens)?)?\s*[:\-]?\s*([A-Za-z0-9_\-\.\s]+?)(?:$|\s*(?:[\n\r<]))');
    IF v_raw_leg IS NOT NULL THEN
      v_legacy := btrim(regexp_replace(v_raw_leg, '\s+', ' ', 'g'));
    END IF;
  END IF;

  -- Prioridade 2: Atividade descrita no Trâmite Comercial (ex: "Atividade : Implantação ... + Conversão Control-M Web TD")
  IF v_legacy IS NULL AND p_text IS NOT NULL THEN
    v_raw_leg := substring(p_text FROM '(?i)Atividade\s*:\s*.*?\+\s*Convers[ãa]o(?:\s+de\s+Bases?(?:\s+de\s+Dados)?(?:\s+e\s+Imagens)?)?\s*[:\-]?\s*([A-Za-z0-9_\-\.\s]+?)(?:$|\s*(?:Data|Analista|Cadastrar|[\n\r<]))');
    IF v_raw_leg IS NOT NULL THEN
      v_legacy := btrim(regexp_replace(v_raw_leg, '\s+', ' ', 'g'));
    END IF;
  END IF;

  -- Prioridade 3: Template Formal ("Sistema atual do cartório (legado): Triunfo")
  IF v_legacy IS NULL AND p_text IS NOT NULL THEN
    v_raw_leg := substring(p_text FROM '(?i)Sistema atual do cart[oó]rio\s*\(legado\):\s*([^\r\n<■]+)');
    IF v_raw_leg IS NOT NULL THEN
      v_legacy := btrim(regexp_replace(v_raw_leg, '\s+', ' ', 'g'));
    END IF;
  END IF;

  -- Limpeza e normalização de typos conhecidos
  IF v_legacy IS NOT NULL THEN
    -- Normaliza erro de digitação frequente "Ciontrol-M" -> "Control-M"
    v_legacy := regexp_replace(v_legacy, '(?i)\bCiontrol-M\b', 'Control-M', 'g');
    -- Normaliza traços isolados e placeholders
    IF v_legacy ~ '^[_ \-]+$' OR lower(v_legacy) IN ('a definir', 'nao informado', 'não informado', 'nenhum', '-') THEN
      v_legacy := NULL;
    END IF;
  END IF;

  RETURN QUERY SELECT v_hours, v_legacy;
END;
$$;

-- 2. FUNÇÃO RPC: Consulta dados comerciais detectados nos trâmites de um chamado
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

  -- Obtém dados atuais do projeto e do chamado
  SELECT "TituloChamado", sold_hours, legacy_system
  INTO v_title, v_current_hours, v_current_legacy
  FROM public.projects
  WHERE ticket_number = v_ticket AND is_deleted = false
  LIMIT 1;

  IF v_title IS NULL THEN
    SELECT titulo INTO v_title
    FROM public.chamados_processo_venda
    WHERE numero_chamado = v_ticket
    LIMIT 1;
  END IF;

  -- 1. Tenta extrair legado direto do título se ainda não tivermos
  IF v_title IS NOT NULL THEN
    SELECT extracted_legacy INTO v_found_legacy
    FROM public.extract_commercial_data(NULL, v_title);
  END IF;

  -- 2. Percorre os trâmites do chamado do mais recente para o mais antigo buscando horas e legado
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

    -- Se já encontrou ambos, encerra busca
    IF v_found_hours IS NOT NULL AND v_found_legacy IS NOT NULL THEN
      EXIT;
    END IF;
  END LOOP;

  -- Se encontrou pelo menos uma informação nova
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

-- 3. FUNÇÃO RPC: Aplica os dados comerciais detectados diretamente no projeto
CREATE OR REPLACE FUNCTION public.apply_detected_0800_commercial_data(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proj record;
  v_det jsonb;
  v_hours numeric;
  v_legacy text;
BEGIN
  SELECT id, ticket_number, sold_hours, legacy_system
  INTO v_proj
  FROM public.projects
  WHERE id = p_project_id AND is_deleted = false;

  IF v_proj IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Projeto não encontrado.');
  END IF;

  v_det := public.get_detected_0800_commercial_data(v_proj.ticket_number);

  IF NOT (v_det->>'found')::boolean THEN
    RETURN jsonb_build_object('success', false, 'message', 'Nenhuma informação comercial encontrada nos trâmites do 0800.');
  END IF;

  v_hours := NULLIF(v_det->>'sold_hours', '')::numeric;
  v_legacy := NULLIF(btrim(v_det->>'legacy_system'), '');

  UPDATE public.projects
  SET
    sold_hours = COALESCE(v_hours, sold_hours),
    legacy_system = COALESCE(v_legacy, legacy_system),
    updated_at = now()
  WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'success', true,
    'applied_hours', v_hours,
    'applied_legacy', v_legacy,
    'message', 'Dados do 0800 aplicados com sucesso!'
  );
END;
$$;

-- 4. TRIGGER REATIVO: Sincronização automática em background no momento que o trâmite é salvo
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

  -- Só processa se a descrição contiver indícios de horas ou legado
  IF NEW.descricao IS NULL OR (
    NEW.descricao !~* 'Horas vendidas' AND 
    NEW.descricao !~* 'Convers[ãa]o' AND 
    NEW.descricao !~* 'Sistema atual do cart[oó]rio'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT "TituloChamado" INTO v_title
  FROM public.projects
  WHERE ticket_number = v_ticket AND is_deleted = false
  LIMIT 1;

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

DROP TRIGGER IF EXISTS trg_sync_project_commercial_data ON public.chamados_processo_venda_tramites;
CREATE TRIGGER trg_sync_project_commercial_data
AFTER INSERT OR UPDATE OF descricao ON public.chamados_processo_venda_tramites
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_sync_project_commercial_data();

-- 5. EVOLUÇÃO DA RPC public.sync_0800_project (Nó 4 do n8n)
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

  -- Classifica o chamado pelo Título + Catálogo
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
        'Implantacao',
        'Autom. N8N',
        p_project_leader,
        v_final_hours,
        v_final_legacy
      )
      RETURNING id INTO v_project_id;
    END IF;

    -- Conecta produtos secundários que porventura já estivessem na fila aguardando este projeto
    FOR v_sec IN
      SELECT DISTINCT st.id AS sec_id
      FROM public.secondary_tickets st
      WHERE st.normalized_client = v_norm_client
        AND (
          st.product_catalog_id != 'editor_modelos'
          OR v_class.canonical_name = 'Orion TN'
        )
    LOOP
      INSERT INTO public.project_secondary_ticket_links (project_id, secondary_ticket_id, created_by)
      VALUES (v_project_id, v_sec.sec_id, 'auto_sync')
      ON CONFLICT (project_id, secondary_ticket_id) DO NOTHING;
    END LOOP;

    PERFORM public.refresh_project_secondary_summary(v_project_id);

    -- Histórico de Trâmites
    IF p_descricao_tramite IS NOT NULL AND btrim(p_descricao_tramite) != '' THEN
      SELECT descricao_tramite INTO v_last_tramite
      FROM public.project_tramites pt
      WHERE pt.project_id = v_project_id
      ORDER BY pt.created_at DESC
      LIMIT 1;

      IF v_last_tramite IS NULL OR v_last_tramite != p_descricao_tramite THEN
        INSERT INTO public.project_tramites (
          project_id,
          descricao_tramite,
          responsavel_atividade,
          etapa_projeto
        ) VALUES (
          v_project_id,
          p_descricao_tramite,
          p_responsavel_atividade,
          p_etapas_projeto
        );
      END IF;
    END IF;

    RETURN;
  END IF;

  -- ==========================================================================
  -- RAMO B: PRODUTO SECUNDÁRIO (14 produtos do Catálogo Oficial)
  -- ==========================================================================
  IF v_class.category = 'secondary' THEN
    SELECT ARRAY_AGG(id) INTO v_parent_ids
    FROM public.projects
    WHERE public.normalize_client_match_key(client_name) = v_norm_client
      AND is_deleted = false
      AND global_status != 'done'
      AND (
        v_class.catalog_id != 'editor_modelos'
        OR system_type = 'Orion TN'
      );

    IF v_parent_ids IS NULL OR array_length(v_parent_ids, 1) = 0 THEN
      RETURN;
    END IF;

    INSERT INTO public.secondary_tickets (
      ticket_number,
      product_catalog_id,
      product_name,
      client_name,
      normalized_client,
      sales_order_number,
      op_number,
      titulo_chamado,
      descricao_tramite,
      ellevo_status,
      ellevo_analyst,
      created_by
    ) VALUES (
      v_clean_ticket,
      v_class.catalog_id,
      v_class.canonical_name,
      v_clean_client,
      v_norm_client,
      p_sales_order_number,
      p_op_number,
      p_titulo_chamado,
      p_descricao_tramite,
      p_etapas_projeto,
      p_responsavel_atividade,
      'auto_sync'
    )
    ON CONFLICT (ticket_number) DO UPDATE
    SET
      titulo_chamado = EXCLUDED.titulo_chamado,
      descricao_tramite = EXCLUDED.descricao_tramite,
      ellevo_status = EXCLUDED.ellevo_status,
      ellevo_analyst = EXCLUDED.ellevo_analyst,
      sales_order_number = COALESCE(secondary_tickets.sales_order_number, EXCLUDED.sales_order_number),
      op_number = COALESCE(secondary_tickets.op_number, EXCLUDED.op_number),
      updated_at = now()
    RETURNING id INTO v_secondary_id;

    FOREACH v_pid IN ARRAY v_parent_ids
    LOOP
      INSERT INTO public.project_secondary_ticket_links (project_id, secondary_ticket_id, created_by)
      VALUES (v_pid, v_secondary_id, 'auto_sync')
      ON CONFLICT (project_id, secondary_ticket_id) DO NOTHING;

      PERFORM public.refresh_project_secondary_summary(v_pid);
    END LOOP;

    RETURN;
  END IF;
END;
$function$;

-- 6. SANEAMENTO RETROATIVO: Preenche projetos existentes que possuem trâmites registrados
DO $$
DECLARE
  v_proj record;
  v_det jsonb;
  v_h numeric;
  v_leg text;
  v_count integer := 0;
BEGIN
  FOR v_proj IN
    SELECT id, ticket_number, sold_hours, legacy_system
    FROM public.projects
    WHERE is_deleted = false
      AND (sold_hours IS NULL OR legacy_system IS NULL)
  LOOP
    v_det := public.get_detected_0800_commercial_data(v_proj.ticket_number);
    IF (v_det->>'found')::boolean THEN
      v_h := NULLIF(v_det->>'sold_hours', '')::numeric;
      v_leg := NULLIF(btrim(v_det->>'legacy_system'), '');

      IF v_h IS NOT NULL OR v_leg IS NOT NULL THEN
        UPDATE public.projects
        SET
          sold_hours = COALESCE(sold_hours, v_h),
          legacy_system = COALESCE(legacy_system, v_leg),
          updated_at = now()
        WHERE id = v_proj.id;
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Saneamento retroativo concluído: % projetos atualizados.', v_count;
END;
$$;

-- 7. NOTIFICAÇÃO CHANGELOG
INSERT INTO public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
)
SELECT
  'changelog',
  'release_feature',
  'projects',
  'Auto-Detecção e Preenchimento de Horas e Sistema Legado (0800)',
  'Agora as Horas Vendidas e o Sistema Legado são automaticamente extraídos dos trâmites comerciais do 0800 (Trâmite 4) e do título do chamado via trigger reativo no banco, eliminando o preenchimento manual.',
  '/projects'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_feature'
    AND permission_resource = 'projects'
    AND title LIKE '%Auto-Detecção e Preenchimento de Horas%'
);

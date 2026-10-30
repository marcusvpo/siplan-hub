-- Migration: 20261029150000_secondary_products_typo_shield.sql
-- Objetivo:
--   Blindagem em 4 camadas contra erros de digitação e variações de nomenclatura no 0800:
--   1. Raiz morfológica para "Implantação e Treinamento" (captura typos como "Implanmtação", "Implatação", omissão de "e", etc.), bloqueando pós-implantação, rotinas, atualizações, período de teste e IA.
--   2. Suporte controlado a "Configuração e Treinamento" EXCLUSIVAMENTE para os 14 Produtos Secundários (jamais para Sistemas Principais), mantendo o bloqueio obrigatório de vendas avulsas sem projeto pai ativo.
--   3. Tolerância a erros de grafia nos produtos (ex: "OLivro Caixa Web", "Orion/Orin") + fallback cruzado seguro pelo campo Software do Ellevo quando o sufixo do título é omitido ou grafado incorretamente.
--   4. Ponte automática de identidade SAP <-> Ellevo (via chamados_processo_venda / chamados_0800) na RPC sync_0800_project + preenchimento imediato de ellevo_status antes do primeiro ciclo do vm-worker.

-- ============================================================================
-- 1. REFINAMENTO DOS PADRÕES DO CATÁLOGO (BLINDAGEM DE IA E TYPOS DE PRODUTO)
-- ============================================================================

UPDATE public.secondary_product_catalog
SET
  match_patterns = ARRAY[
    '\msiplan\s*ia\M',
    '\minteligencia\s*artificial\M',
    '\mprocessamento\s*ia\M',
    '\mocrizacao\M',
    '\mmodulo\s*(de\s*)?ia\M',
    '\mrotina\s*(de\s*)?ia\M',
    '\m(da|de)\s+ia\M',
    '\mia\s+azure\M'
  ],
  updated_at = now()
WHERE code = 'siplan_ia';

UPDATE public.secondary_product_catalog
SET
  match_patterns = ARRAY['\mo?livro\s*caixa\s*web\M', '\mlcw\M', '\mlcx\M'],
  updated_at = now()
WHERE code = 'lcw';

UPDATE public.secondary_product_catalog
SET match_patterns = ARRAY['\morio?n\s*caixa\M'], updated_at = now()
WHERE code = 'orion_caixa';

UPDATE public.secondary_product_catalog
SET match_patterns = ARRAY['\morio?n\s*cart\s*flow\M', '\mcart\s*flow\M'], updated_at = now()
WHERE code = 'orion_cartflow';

UPDATE public.secondary_product_catalog
SET match_patterns = ARRAY['\morio?n\s*connect\M'], updated_at = now()
WHERE code = 'orion_connect';

UPDATE public.secondary_product_catalog
SET match_patterns = ARRAY['\morio?n\s*editor\M'], updated_at = now()
WHERE code = 'orion_editor';

UPDATE public.secondary_product_catalog
SET match_patterns = ARRAY['\morio?n\s*ged\M'], updated_at = now()
WHERE code = 'orion_ged';

-- ============================================================================
-- 2. CLASSIFICADOR COM BLINDAGEM MORFOLÓGICA E DUPLA CHECAGEM TÍTULO + SOFTWARE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.classify_0800_implantation_ticket(
  p_titulo text,
  p_software text DEFAULT NULL
)
RETURNS TABLE (
  category text,
  product_code text,
  canonical_name text,
  only_system_type text,
  requires_orion_admin boolean
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_norm_title text;
  v_match text[];
  v_is_implantacao boolean := false;
  v_is_configuracao boolean := false;
  v_raw_suffix text := '';
  v_subject text;
  v_norm_software text;
  v_soft_match text;
  v_fallback_code text := NULL;
  v_row record;
  v_pat text;
BEGIN
  v_norm_title := public.normalize_0800_match_text(p_titulo);

  IF v_norm_title = '' THEN
    RETURN QUERY SELECT 'ignored'::text, NULL::text, NULL::text, NULL::text, false;
    RETURN;
  END IF;

  -- Bloqueio imediato de pós-implantação, treinamentos avulsos de rotina, testes e integrações fora do escopo
  IF v_norm_title ~ '\mpos\s+impla'
     OR v_norm_title ~ '\m(rotina|rotinas|parcela\s+express|assinatura\s+digital|periodo\s+de\s+teste|atualizacao)\M' THEN
    RETURN QUERY SELECT 'ignored'::text, NULL::text, NULL::text, NULL::text, false;
    RETURN;
  END IF;

  -- Avalia exclusões explícitas do catálogo (Siplan IA, BI Report, NFSe, WEB RC) no título completo
  FOR v_row IN
    SELECT c.code, c.match_patterns
    FROM public.secondary_product_catalog c
    WHERE c.active = true
      AND c.category = 'ignored'
    ORDER BY c.priority ASC, c.code ASC
  LOOP
    FOREACH v_pat IN ARRAY v_row.match_patterns
    LOOP
      IF v_norm_title ~ v_pat THEN
        RETURN QUERY SELECT 'ignored'::text, NULL::text, NULL::text, NULL::text, false;
        RETURN;
      END IF;
    END LOOP;
  END LOOP;

  -- Camada 1: Raiz morfológica de "Implantação e Treinamento" (tolera typos como "Implanmtação", "Implatação", omissão de "e")
  v_match := regexp_match(
    v_norm_title,
    '\m(impla[a-z]{2,10})\s+(?:e\s+|de\s+|configuracao\s+e\s+)?treinamento\M(.*)$'
  );

  IF v_match IS NOT NULL THEN
    v_is_implantacao := true;
    v_raw_suffix := btrim(COALESCE(v_match[2], ''));
  ELSE
    -- Camada 2: "Configuração e Treinamento" aceito APENAS se classificar como Produto Secundário oficial
    v_match := regexp_match(
      v_norm_title,
      '\m(configura[a-z]{2,10})\s+(?:e\s+|de\s+)?treinamento\M(.*)$'
    );
    IF v_match IS NOT NULL THEN
      v_is_configuracao := true;
      v_raw_suffix := btrim(COALESCE(v_match[2], ''));
    ELSE
      RETURN QUERY SELECT 'ignored'::text, NULL::text, NULL::text, NULL::text, false;
      RETURN;
    END IF;
  END IF;

  v_subject := CASE WHEN v_raw_suffix <> '' THEN v_raw_suffix ELSE v_norm_title END;

  -- Classificação principal pelo assunto do Título (fonte primária da verdade)
  FOR v_row IN
    SELECT c.code, c.name, c.category, c.match_patterns, c.only_system_type, c.requires_orion_admin
    FROM public.secondary_product_catalog c
    WHERE c.active = true
      AND c.category IN ('primary', 'secondary')
    ORDER BY c.priority ASC, c.code ASC
  LOOP
    FOREACH v_pat IN ARRAY v_row.match_patterns
    LOOP
      IF v_subject ~ v_pat THEN
        IF v_row.category = 'primary' THEN
          -- Sistemas principais NUNCA entram por "Configuração e Treinamento"
          IF NOT v_is_implantacao THEN
            RETURN QUERY SELECT 'ignored'::text, NULL::text, NULL::text, NULL::text, false;
            RETURN;
          END IF;

          v_norm_software := public.normalize_project_system_type(p_software);
          IF v_norm_software IN ('Orion TN', 'Orion PRO', 'Orion REG', 'WebRI') THEN
            RETURN QUERY SELECT
              'primary'::text,
              lower(replace(v_norm_software, ' ', '_')),
              v_norm_software,
              NULL::text,
              false;
            RETURN;
          END IF;
        END IF;

        RETURN QUERY SELECT
          v_row.category,
          v_row.code,
          v_row.name,
          v_row.only_system_type,
          v_row.requires_orion_admin;
        RETURN;
      END IF;
    END LOOP;
  END LOOP;

  -- Fallback A: Título sem sufixo ("OP ... - Implantação e Treinamento") com Software de Sistema Principal
  IF v_is_implantacao AND v_raw_suffix = '' THEN
    v_norm_software := public.normalize_project_system_type(p_software);
    IF v_norm_software IN ('Orion TN', 'Orion PRO', 'Orion REG', 'WebRI') THEN
      RETURN QUERY SELECT
        'primary'::text,
        lower(replace(v_norm_software, ' ', '_')),
        v_norm_software,
        NULL::text,
        false;
      RETURN;
    END IF;
  END IF;

  -- Camada 3 (Fallback B): Título válido de Implantação/Configuração e Treinamento cujo sufixo foi omitido
  -- ou teve erro de grafia inédito, resgatado pelo campo Software do Ellevo (desde que não mencione sistemas legados)
  IF v_norm_title !~ '\m(control\s*m|cm|siplan\s*pro|siplan\s*tn|siplan\s*reg)\M' THEN
    v_soft_match := public.normalize_0800_match_text(p_software);
    v_fallback_code := CASE v_soft_match
      WHEN 'lcw' THEN 'lcw'
      WHEN 'livro caixa web' THEN 'lcw'
      WHEN 'lcx livro caixa' THEN 'lcw'
      WHEN 'sga' THEN 'sga'
      WHEN 'library' THEN 'library'
      WHEN 'cartorio on hand' THEN 'cartorio_on_hand'
      WHEN 'on hand' THEN 'cartorio_on_hand'
      WHEN 'e recepcao' THEN 'e_recepcao'
      WHEN 'ciaf' THEN 'ciaf'
      WHEN 'imagepro' THEN 'image_pro'
      WHEN 'image pro' THEN 'image_pro'
      WHEN 'image' THEN 'image'
      WHEN 'img' THEN 'image'
      WHEN 'e qualificacao' THEN 'e_qualificacao'
      WHEN 'caixa' THEN 'orion_caixa'
      WHEN 'orion caixa' THEN 'orion_caixa'
      WHEN 'orioncaixa' THEN 'orion_caixa'
      WHEN 'orion cartflow' THEN 'orion_cartflow'
      WHEN 'orioncartflow' THEN 'orion_cartflow'
      WHEN 'cartflow' THEN 'orion_cartflow'
      WHEN 'orion connect' THEN 'orion_connect'
      WHEN 'orionconnect' THEN 'orion_connect'
      WHEN 'editor' THEN 'orion_editor'
      WHEN 'orion editor' THEN 'orion_editor'
      WHEN 'orioneditor' THEN 'orion_editor'
      WHEN 'orionged' THEN 'orion_ged'
      WHEN 'orion ged' THEN 'orion_ged'
      ELSE NULL
    END;

    IF v_fallback_code IS NOT NULL THEN
      SELECT c.code, c.name, c.category, c.only_system_type, c.requires_orion_admin
      INTO v_row
      FROM public.secondary_product_catalog c
      WHERE c.code = v_fallback_code
        AND c.active = true
      LIMIT 1;

      IF FOUND THEN
        RETURN QUERY SELECT
          v_row.category,
          v_row.code,
          v_row.name,
          v_row.only_system_type,
          v_row.requires_orion_admin;
        RETURN;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT 'ignored'::text, NULL::text, NULL::text, NULL::text, false;
END;
$$;

-- ============================================================================
-- 3. EVOLUÇÃO DA RPC sync_0800_project COM PONTE SAP <-> ELLEVO E ELLEVO_STATUS
-- ============================================================================

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
  p_project_leader text DEFAULT NULL::text
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
BEGIN
  v_clean_ticket := btrim(COALESCE(p_ticket_number, ''));
  IF v_clean_ticket = '' THEN
    RETURN;
  END IF;

  v_clean_client := COALESCE(NULLIF(btrim(p_client_name), ''), 'Cliente não identificado');
  v_norm_client := public.normalize_client_match_key(v_clean_client);

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
        project_leader
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
        COALESCE(NULLIF(btrim(p_project_leader), ''), 'Bruno Fernandes')
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
    -- Localiza todos os projetos principais ATIVOS elegíveis (barra 100% vendas avulsas e projetos concluídos!)
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

    -- Verifica se o chamado secundário já havia sido cadastrado anteriormente no HUB
    SELECT id INTO v_secondary_id
    FROM public.secondary_tickets
    WHERE ticket_number = v_clean_ticket
    LIMIT 1;

    -- Se não há nenhum projeto principal ativo elegível E o chamado ainda não existe no HUB -> Venda avulsa! Ignora!
    IF COALESCE(array_length(v_parent_ids, 1), 0) = 0 AND v_secondary_id IS NULL THEN
      RETURN;
    END IF;

    -- Upsert do registro canônico único em public.secondary_tickets
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

    -- Vincula a todos os projetos principais ativos encontrados (sincronização 100% espelhada)
    FOREACH v_pid IN ARRAY v_parent_ids
    LOOP
      INSERT INTO public.project_secondary_ticket_links (project_id, secondary_ticket_id, link_source)
      VALUES (v_pid, v_secondary_id, 'auto')
      ON CONFLICT (project_id, secondary_ticket_id) DO NOTHING;
    END LOOP;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_0800_project(text, text, text, integer, integer, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_0800_project(text, text, text, integer, integer, text, text, text, text, text) TO service_role;

-- Endurecimento de search_path e revogação de exposição RPC desnecessária em funções internas/triggers
ALTER FUNCTION public.normalize_0800_match_text(text) SET search_path = public;
ALTER FUNCTION public.normalize_client_match_key(text) SET search_path = public;
ALTER FUNCTION public.is_secondary_ticket_resolved_in_0800(boolean, text, text, text, timestamptz) SET search_path = public;

REVOKE ALL ON FUNCTION public.recalculate_project_secondary_summary(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_project_secondary_summary(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.trg_fn_project_secondary_links_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_fn_secondary_tickets_summary() FROM PUBLIC, anon, authenticated;

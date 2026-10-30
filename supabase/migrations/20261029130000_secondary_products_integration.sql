-- Migration: 20261029130000_secondary_products_integration.sql
-- Objetivo:
--   1. Catálogo oficial de produtos secundários (14 itens do Administrativo) + regras de afinidade (Orion Editor -> Orion TN) e Orion Admin.
--   2. Tabelas canônicas secondary_tickets (1 registro único por chamado) e project_secondary_ticket_links (vínculo N:N espelhado entre múltiplos sistemas principais ativos do mesmo cartório).
--   3. Contadores leves desnormalizados em public.projects (Split Query) + sincronização automática de projects.products.
--   4. Evolução da RPC public.sync_0800_project para classificar chamados "Implantação e Treinamento", barrar vendas avulsas (sem projeto pai ativo com global_status <> 'done') e vincular automaticamente produtos secundários.
--   5. Permissão RBAC secondary_products (view, edit), RLS estrita TO authenticated com has_permission(...) e notificação de Changelog.

-- ============================================================================
-- 1. FUNÇÕES UTILITÁRIAS DE NORMALIZAÇÃO E COMPARAÇÃO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_0800_match_text(raw_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN raw_text IS NULL OR btrim(raw_text) = '' THEN ''
    ELSE btrim(
      regexp_replace(
        lower(
          translate(
            raw_text,
            'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
            'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
          )
        ),
        '[^a-z0-9]+',
        ' ',
        'g'
      )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_client_match_key(raw_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    public.normalize_0800_match_text(
      regexp_replace(COALESCE(raw_name, ''), '\s*-\s*Chamado:\s*\d+\s*$', '', 'i')
    ),
    ''
  );
$$;

-- ============================================================================
-- 2. CATÁLOGO OFICIAL DE PRODUTOS (PRINCIPAIS, 14 SECUNDÁRIOS E IGNORADOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.secondary_product_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('primary', 'secondary', 'ignored')),
  match_patterns text[] NOT NULL DEFAULT '{}'::text[],
  only_system_type text NULL,
  requires_orion_admin boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.secondary_product_catalog (
  code, name, category, match_patterns, only_system_type, requires_orion_admin, priority, active
) VALUES
  -- Itens explicitamente fora do escopo do HUB (avaliados antes de tudo)
  ('siplan_ia', 'Siplan IA', 'ignored', ARRAY['\msiplan\s*ia\M', '\minteligencia\s*artificial\M', '\mprocessamento\s*ia\M', '\mocrizacao\M'], NULL, false, 10, true),
  ('bi_report', 'BI Report', 'ignored', ARRAY['\mbi\s*report\M', '\mpaineis\s+de\s+indicadores\M'], NULL, false, 11, true),
  ('siplan_nfse', 'Siplan NFSe', 'ignored', ARRAY['\mnfse\M', '\mnfs\s*e\M'], NULL, false, 12, true),
  ('webrc', 'WEB RC', 'ignored', ARRAY['\mweb\s*rc\M', '\msiplan\s*rc\M'], NULL, false, 13, true),

  -- Sistemas Principais (avaliados antes dos secundários para tratar títulos combo históricos)
  ('orion_tn', 'Orion TN', 'primary', ARRAY['\morio?n\s*tn\M', '\morio?n\s*notas\M', '\morio?n\s*tabelionato\M'], NULL, false, 20, true),
  ('orion_pro', 'Orion PRO', 'primary', ARRAY['\morio?n\s*pro\M', '\morio?n\s*protesto\M'], NULL, false, 21, true),
  ('orion_reg', 'Orion REG', 'primary', ARRAY['\morio?n\s*reg\M', '\morio?n\s*registro\M', '\morio?n\s*reg\s*tdpj\M'], NULL, false, 22, true),
  ('webri', 'WebRI', 'primary', ARRAY['\mweb\s*ri\M'], NULL, false, 23, true),

  -- 14 Produtos Secundários Oficiais do Administrativo
  -- Nota: Image PRO tem prioridade menor (50) que Image (51) para evitar falso match parcial
  ('image_pro', 'Image PRO', 'secondary', ARRAY['\mimage\s*pro\M'], NULL, false, 50, true),
  ('image', 'Image', 'secondary', ARRAY['\msiplan\s*image\M', '\mimage\M'], NULL, false, 51, true),
  ('lcw', 'Livro Caixa Web', 'secondary', ARRAY['\mlivro\s*caixa\s*web\M', '\mlcw\M', '\mlcx\M'], NULL, true, 52, true),
  ('sga', 'SGA', 'secondary', ARRAY['\msga\M', '\msistema\s+de\s+gestao\s+de\s+atendimento\M'], NULL, false, 53, true),
  ('library', 'Library', 'secondary', ARRAY['\me\s*library\M', '\mlibrary\M'], NULL, false, 54, true),
  ('cartorio_on_hand', 'Cartório On Hand', 'secondary', ARRAY['\mcartorio\s*on\s*hand\M', '\mapp\s*on\s*hand\M', '\mon\s*hand\M'], NULL, false, 55, true),
  ('e_recepcao', 'e-Recepção', 'secondary', ARRAY['\me\s*recepcao\M'], NULL, false, 56, true),
  ('ciaf', 'CIAF', 'secondary', ARRAY['\mciaf\M'], NULL, false, 57, true),
  ('e_qualificacao', 'e-Qualificação', 'secondary', ARRAY['\me\s*qualificacao\M'], NULL, false, 58, true),
  ('orion_caixa', 'Orion Caixa', 'secondary', ARRAY['\morion\s*caixa\M'], NULL, false, 59, true),
  ('orion_cartflow', 'Orion CartFLOW', 'secondary', ARRAY['\morion\s*cart\s*flow\M', '\mcart\s*flow\M'], NULL, true, 60, true),
  ('orion_connect', 'Orion Connect', 'secondary', ARRAY['\morion\s*connect\M'], NULL, true, 61, true),
  ('orion_editor', 'Orion Editor', 'secondary', ARRAY['\morion\s*editor\M'], 'Orion TN', false, 62, true),
  ('orion_ged', 'Orion GED', 'secondary', ARRAY['\morion\s*ged\M'], NULL, false, 63, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  match_patterns = EXCLUDED.match_patterns,
  only_system_type = EXCLUDED.only_system_type,
  requires_orion_admin = EXCLUDED.requires_orion_admin,
  priority = EXCLUDED.priority,
  active = EXCLUDED.active,
  updated_at = now();

-- Função de classificação determinística de chamados 0800
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
  v_marker constant text := 'implantacao e treinamento';
  v_pos integer;
  v_subject text;
  v_norm_software text;
  v_row record;
  v_pat text;
BEGIN
  v_norm_title := public.normalize_0800_match_text(p_titulo);
  v_pos := strpos(v_norm_title, v_marker);

  -- Regra estrita: apenas chamados contendo "Implantação e Treinamento" no título
  IF v_pos = 0 THEN
    RETURN QUERY SELECT 'ignored'::text, NULL::text, NULL::text, NULL::text, false;
    RETURN;
  END IF;

  v_subject := btrim(substr(v_norm_title, v_pos + length(v_marker)));
  IF v_subject = '' THEN
    v_subject := v_norm_title;
  END IF;

  FOR v_row IN
    SELECT c.code, c.name, c.category, c.match_patterns, c.only_system_type, c.requires_orion_admin
    FROM public.secondary_product_catalog c
    WHERE c.active = true
    ORDER BY c.priority ASC, c.code ASC
  LOOP
    FOREACH v_pat IN ARRAY v_row.match_patterns
    LOOP
      IF v_subject ~ v_pat THEN
        -- Se for sistema principal em título combo, respeita o Software do chamado quando for um principal válido
        IF v_row.category = 'primary' THEN
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

  -- Fallback apenas se o título for literalmente "OP ... - Implantação e Treinamento" sem sufixo e Software for principal
  IF btrim(substr(v_norm_title, v_pos + length(v_marker))) = '' THEN
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

  RETURN QUERY SELECT 'ignored'::text, NULL::text, NULL::text, NULL::text, false;
END;
$$;

-- ============================================================================
-- 3. TABELAS CANÔNICAS: secondary_tickets & project_secondary_ticket_links
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.secondary_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  product_code text,
  product_name text NOT NULL,
  client_name text NOT NULL,
  codigo_cliente text,
  op_number integer,
  sales_order_number integer,
  titulo_chamado text,
  hub_status text NOT NULL DEFAULT 'pending'
    CHECK (hub_status IN (
      'pending',
      'in_progress',
      'deployed_field',
      'handed_to_sd',
      'completed_sd',
      'blocked_client',
      'cancelled'
    )),
  responsible text,
  observations text,
  tramited_to_cs boolean NOT NULL DEFAULT false,
  ellevo_status text,
  ellevo_team text,
  ellevo_analyst text,
  ellevo_opened_at timestamptz,
  ellevo_closed_at timestamptz,
  ellevo_last_tramite text,
  ellevo_last_tramite_at timestamptz,
  ellevo_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

CREATE INDEX IF NOT EXISTS idx_secondary_tickets_hub_status
  ON public.secondary_tickets (hub_status);

CREATE INDEX IF NOT EXISTS idx_secondary_tickets_op_sales
  ON public.secondary_tickets (op_number, sales_order_number);

CREATE TABLE IF NOT EXISTS public.project_secondary_ticket_links (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  secondary_ticket_id uuid NOT NULL REFERENCES public.secondary_tickets(id) ON DELETE CASCADE,
  link_source text NOT NULL DEFAULT 'auto' CHECK (link_source IN ('auto', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, secondary_ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_project_secondary_links_ticket
  ON public.project_secondary_ticket_links (secondary_ticket_id);

-- Colunas leves em public.projects (respeitando estritamente o Split Query Pattern)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS secondary_tickets_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS secondary_tickets_pending_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS secondary_products_names text[] NOT NULL DEFAULT '{}'::text[];

-- ============================================================================
-- 4. CÁLCULO DE PENDÊNCIA E TRIGGERS DE RESUMO EM public.projects
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_secondary_ticket_resolved_in_0800(
  p_tramited_to_cs boolean,
  p_ellevo_status text,
  p_ellevo_analyst text,
  p_ellevo_team text,
  p_ellevo_closed_at timestamptz
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    COALESCE(p_tramited_to_cs, false)
    OR p_ellevo_closed_at IS NOT NULL
    OR public.normalize_0800_match_text(p_ellevo_status) ~ '(encerrad|concluid|fechad|cancelad|finalizad)'
    OR public.normalize_0800_match_text(p_ellevo_analyst) ~ '(maria santos|soraya)'
    OR public.normalize_0800_match_text(p_ellevo_team) ~ '(cs|cx|faturamento|administrativo)';
$$;

CREATE OR REPLACE FUNCTION public.recalculate_project_secondary_summary(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  v_pending integer := 0;
  v_names text[] := '{}'::text[];
BEGIN
  IF p_project_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE st.hub_status <> 'cancelled')::integer,
    COUNT(*) FILTER (
      WHERE st.hub_status <> 'cancelled'
        AND NOT (
          st.hub_status IN ('deployed_field', 'completed_sd')
          AND public.is_secondary_ticket_resolved_in_0800(
            st.tramited_to_cs,
            st.ellevo_status,
            st.ellevo_analyst,
            st.ellevo_team,
            st.ellevo_closed_at
          )
        )
    )::integer,
    COALESCE(
      ARRAY_AGG(DISTINCT st.product_name ORDER BY st.product_name)
        FILTER (WHERE st.hub_status <> 'cancelled'),
      '{}'::text[]
    )
  INTO v_total, v_pending, v_names
  FROM public.project_secondary_ticket_links l
  JOIN public.secondary_tickets st ON st.id = l.secondary_ticket_id
  WHERE l.project_id = p_project_id;

  -- Atualiza projects somente quando houver diferença real para não poluir updated_at
  UPDATE public.projects p
  SET
    secondary_tickets_count = COALESCE(v_total, 0),
    secondary_tickets_pending_count = COALESCE(v_pending, 0),
    secondary_products_names = COALESCE(v_names, '{}'::text[]),
    products = ARRAY(
      SELECT DISTINCT item
      FROM unnest(COALESCE(p.products, '{}'::text[]) || COALESCE(v_names, '{}'::text[])) AS item
      WHERE item IS NOT NULL AND btrim(item) <> ''
      ORDER BY 1
    )
  WHERE p.id = p_project_id
    AND (
      p.secondary_tickets_count IS DISTINCT FROM COALESCE(v_total, 0)
      OR p.secondary_tickets_pending_count IS DISTINCT FROM COALESCE(v_pending, 0)
      OR p.secondary_products_names IS DISTINCT FROM COALESCE(v_names, '{}'::text[])
      OR NOT (COALESCE(p.products, '{}'::text[]) @> COALESCE(v_names, '{}'::text[]))
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_fn_project_secondary_links_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_project_secondary_summary(OLD.project_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN
      PERFORM public.recalculate_project_secondary_summary(OLD.project_id);
    END IF;
    PERFORM public.recalculate_project_secondary_summary(NEW.project_id);
    RETURN NEW;
  ELSE
    PERFORM public.recalculate_project_secondary_summary(NEW.project_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_secondary_links_summary ON public.project_secondary_ticket_links;
CREATE TRIGGER trg_project_secondary_links_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.project_secondary_ticket_links
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_project_secondary_links_summary();

CREATE OR REPLACE FUNCTION public.trg_fn_secondary_tickets_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proj_id uuid;
  v_ticket_id uuid;
BEGIN
  v_ticket_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;

  FOR v_proj_id IN
    SELECT l.project_id
    FROM public.project_secondary_ticket_links l
    WHERE l.secondary_ticket_id = v_ticket_id
  LOOP
    PERFORM public.recalculate_project_secondary_summary(v_proj_id);
  END LOOP;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_secondary_tickets_summary ON public.secondary_tickets;
CREATE TRIGGER trg_secondary_tickets_summary
  AFTER UPDATE OF hub_status, product_name, tramited_to_cs, ellevo_status, ellevo_analyst, ellevo_team, ellevo_closed_at
  OR DELETE ON public.secondary_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_secondary_tickets_summary();

-- ============================================================================
-- 5. EVOLUÇÃO DA RPC public.sync_0800_project (100% RETROCOMPATÍVEL COM N8N)
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

  -- Classifica o chamado pelo Título ("Implantação e Treinamento") + Catálogo
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

    -- Vínculo reverso automático: se este projeto principal está ativo (global_status <> 'done'),
    -- espelha automaticamente quaisquer secondary_tickets já existentes do mesmo cliente/OP/Pedido
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
      NULLIF(btrim(p_descricao_tramite), 'Sem descrição'),
      NULLIF(btrim(p_responsavel_atividade), 'Não atribuído')
    )
    ON CONFLICT (ticket_number) DO UPDATE SET
      product_code = COALESCE(EXCLUDED.product_code, public.secondary_tickets.product_code),
      product_name = COALESCE(EXCLUDED.product_name, public.secondary_tickets.product_name),
      op_number = COALESCE(public.secondary_tickets.op_number, EXCLUDED.op_number),
      sales_order_number = COALESCE(public.secondary_tickets.sales_order_number, EXCLUDED.sales_order_number),
      titulo_chamado = COALESCE(EXCLUDED.titulo_chamado, public.secondary_tickets.titulo_chamado),
      -- Só sobrescreve trâmite/analista via n8n caso o vm-worker ainda não tenha sincronizado direto do SQL Server
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

-- ============================================================================
-- 6. PERMISSÕES RBAC E POLICIES RLS ESTRITAS (TO authenticated)
-- ============================================================================

INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('secondary_products', 'view', 'Visualizar a esteira e aba de Produtos Secundários'),
  ('secondary_products', 'edit', 'Editar status, observações e vínculos de Produtos Secundários')
ON CONFLICT (resource, action) DO UPDATE
SET description = EXCLUDED.description;

-- Concede ao admin
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.app_roles r
CROSS JOIN public.app_permissions p
WHERE r.name = 'admin'
  AND p.resource = 'secondary_products'
  AND p.action IN ('view', 'edit')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Nasce permissivo: quem já possui projects.view recebe secondary_products.view;
-- quem já possui projects.edit recebe secondary_products.edit.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT arp.role_id, target_perm.id
FROM public.app_role_permissions arp
JOIN public.app_permissions source_perm ON source_perm.id = arp.permission_id
JOIN public.app_permissions target_perm
  ON target_perm.resource = 'secondary_products'
 AND target_perm.action = source_perm.action
WHERE source_perm.resource = 'projects'
  AND source_perm.action IN ('view', 'edit')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Habilita RLS nas 3 novas tabelas e fecha acesso anônimo
ALTER TABLE public.secondary_product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_secondary_ticket_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.secondary_product_catalog FROM anon;
REVOKE ALL ON public.secondary_tickets FROM anon;
REVOKE ALL ON public.project_secondary_ticket_links FROM anon;

GRANT SELECT ON public.secondary_product_catalog TO authenticated, service_role;
GRANT ALL ON public.secondary_product_catalog TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.secondary_tickets TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_secondary_ticket_links TO authenticated, service_role;

-- Policies: secondary_product_catalog
DROP POLICY IF EXISTS "secondary_product_catalog_select_auth" ON public.secondary_product_catalog;
CREATE POLICY "secondary_product_catalog_select_auth"
  ON public.secondary_product_catalog
  FOR SELECT
  TO authenticated
  USING (
    public.has_permission(auth.uid(), 'secondary_products', 'view')
    OR public.has_permission(auth.uid(), 'projects', 'view')
    OR public.has_permission(auth.uid(), 'calendar_projects', 'view')
  );

-- Policies: secondary_tickets
DROP POLICY IF EXISTS "secondary_tickets_select_auth" ON public.secondary_tickets;
CREATE POLICY "secondary_tickets_select_auth"
  ON public.secondary_tickets
  FOR SELECT
  TO authenticated
  USING (
    public.has_permission(auth.uid(), 'secondary_products', 'view')
    OR public.has_permission(auth.uid(), 'projects', 'view')
    OR public.has_permission(auth.uid(), 'calendar_projects', 'view')
  );

DROP POLICY IF EXISTS "secondary_tickets_insert_auth" ON public.secondary_tickets;
CREATE POLICY "secondary_tickets_insert_auth"
  ON public.secondary_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'secondary_products', 'edit')
    OR public.has_permission(auth.uid(), 'projects', 'edit')
  );

DROP POLICY IF EXISTS "secondary_tickets_update_auth" ON public.secondary_tickets;
CREATE POLICY "secondary_tickets_update_auth"
  ON public.secondary_tickets
  FOR UPDATE
  TO authenticated
  USING (
    public.has_permission(auth.uid(), 'secondary_products', 'edit')
    OR public.has_permission(auth.uid(), 'projects', 'edit')
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'secondary_products', 'edit')
    OR public.has_permission(auth.uid(), 'projects', 'edit')
  );

DROP POLICY IF EXISTS "secondary_tickets_delete_auth" ON public.secondary_tickets;
CREATE POLICY "secondary_tickets_delete_auth"
  ON public.secondary_tickets
  FOR DELETE
  TO authenticated
  USING (
    public.has_permission(auth.uid(), 'secondary_products', 'edit')
    OR public.has_permission(auth.uid(), 'projects', 'edit')
  );

-- Policies: project_secondary_ticket_links
DROP POLICY IF EXISTS "project_secondary_links_select_auth" ON public.project_secondary_ticket_links;
CREATE POLICY "project_secondary_links_select_auth"
  ON public.project_secondary_ticket_links
  FOR SELECT
  TO authenticated
  USING (
    public.has_permission(auth.uid(), 'secondary_products', 'view')
    OR public.has_permission(auth.uid(), 'projects', 'view')
    OR public.has_permission(auth.uid(), 'calendar_projects', 'view')
  );

DROP POLICY IF EXISTS "project_secondary_links_insert_auth" ON public.project_secondary_ticket_links;
CREATE POLICY "project_secondary_links_insert_auth"
  ON public.project_secondary_ticket_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'secondary_products', 'edit')
    OR public.has_permission(auth.uid(), 'projects', 'edit')
  );

DROP POLICY IF EXISTS "project_secondary_links_delete_auth" ON public.project_secondary_ticket_links;
CREATE POLICY "project_secondary_links_delete_auth"
  ON public.project_secondary_ticket_links
  FOR DELETE
  TO authenticated
  USING (
    public.has_permission(auth.uid(), 'secondary_products', 'edit')
    OR public.has_permission(auth.uid(), 'projects', 'edit')
  );

-- ============================================================================
-- 7. NOTIFICAÇÃO DE NOVIDADE (CHANGELOG)
-- ============================================================================

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
  'secondary_products',
  'Nova Esteira e Gestão Integrada de Produtos Secundários (0800)',
  'Agora os chamados de Implantação e Treinamento dos 14 produtos secundários oficiais (LCW, SGA, Cartório On Hand, Orion GED, Orion Editor, Orion Connect, Orion CartFLOW, etc.) são automaticamente vinculados aos projetos ativos no Siplan HUB, com espelhamento em tempo real do status/responsável no 0800, sincronização entre múltiplos sistemas principais do mesmo cartório, destaque nos cards/modal/calendário e nova tela esteira em Implantação > Produtos Secundários.',
  '/deployments/secondary-products'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_feature'
    AND permission_resource = 'secondary_products'
    AND action_url = '/deployments/secondary-products'
);

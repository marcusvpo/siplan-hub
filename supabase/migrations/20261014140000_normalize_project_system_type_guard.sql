-- Migration: 20261014140000_normalize_project_system_type_guard.sql
-- Objetivo: Padronizar e blindar a nomenclatura dos sistemas (especialmente variações como 'Orion REG (TDPJ)' -> 'Orion REG')
-- e garantir a especialidade automática correspondente, viabilizando o carregamento de templates de aderência.

-- 1. Função utilitária imutável para normalizar o nome do sistema no banco
CREATE OR REPLACE FUNCTION public.normalize_project_system_type(raw_system text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_cleaned text;
  v_lower text;
BEGIN
  IF raw_system IS NULL OR trim(raw_system) = '' THEN
    RETURN raw_system;
  END IF;

  v_cleaned := trim(raw_system);
  -- Translitera acentos e converte para minúsculo
  v_lower := lower(translate(v_cleaned, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'));

  -- Orion REG (cobre 'Orion REG (TDPJ)', 'Orion Reg TDPJ', 'OrionREG (TDPJ)', 'OrionREG', 'Orion Reg', 'Licenciamento do Software Orion Registro TDPJ')
  -- Garante que 'Orion GED' ou outras variações que contenham 'ged' não sejam afetadas
  IF (v_lower ~ 'orion.*reg' OR v_lower ~ 'orion.*registro') AND NOT v_lower ~ 'ged' THEN
    RETURN 'Orion REG';
  END IF;

  -- Orion TN
  IF v_lower ~ 'orion.*tn' OR v_lower ~ 'orion.*notas' THEN
    RETURN 'Orion TN';
  END IF;

  -- Orion PRO
  IF v_lower ~ 'orion.*pro' OR v_lower ~ 'orion.*protesto' THEN
    RETURN 'Orion PRO';
  END IF;

  -- Modelos TN
  IF v_lower ~ 'modelos.*tn' THEN
    RETURN 'Modelos TN';
  END IF;

  -- WebRI / WEBRI / WEB RI
  IF v_lower ~ 'web\s*ri' THEN
    RETURN 'WebRI';
  END IF;

  RETURN v_cleaned;
END;
$$;

-- 2. Atualizar registros existentes no banco de dados com variações de sistema e preencher especialidades faltantes
UPDATE public.projects
SET system_type = 'Orion REG',
    specialty = COALESCE(specialty, 'TDPJ')
WHERE system_type IN ('Orion REG (TDPJ)', 'Orion Reg TDPJ')
   OR (system_type ILIKE 'Orion%reg%' AND system_type NOT ILIKE '%ged%' AND system_type <> 'Orion REG');

UPDATE public.projects
SET specialty = 'TDPJ'
WHERE system_type = 'Orion REG' AND (specialty IS NULL OR trim(specialty) = '');

UPDATE public.projects
SET specialty = 'Notas'
WHERE system_type = 'Orion TN' AND (specialty IS NULL OR trim(specialty) = '');

UPDATE public.projects
SET specialty = 'Protesto'
WHERE system_type = 'Orion PRO' AND (specialty IS NULL OR trim(specialty) = '');

UPDATE public.projects
SET specialty = 'Registro de Imóveis'
WHERE system_type IN ('WebRI', 'WEBRI', 'WEB RI') AND (specialty IS NULL OR trim(specialty) = '');

-- 3. Trigger BEFORE INSERT OR UPDATE na tabela public.projects para garantir blindagem contínua
CREATE OR REPLACE FUNCTION public.fn_projects_normalize_system()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.system_type IS NOT NULL THEN
    NEW.system_type := public.normalize_project_system_type(NEW.system_type);
  END IF;

  IF (NEW.specialty IS NULL OR trim(NEW.specialty) = '') AND NEW.system_type IS NOT NULL THEN
    NEW.specialty := CASE NEW.system_type
      WHEN 'Orion REG' THEN 'TDPJ'
      WHEN 'Orion TN' THEN 'Notas'
      WHEN 'Orion PRO' THEN 'Protesto'
      WHEN 'WebRI' THEN 'Registro de Imóveis'
      WHEN 'WEBRI' THEN 'Registro de Imóveis'
      ELSE NEW.specialty
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_normalize_system_before_insert ON public.projects;
CREATE TRIGGER trg_projects_normalize_system_before_insert
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_projects_normalize_system();

DROP TRIGGER IF EXISTS trg_projects_normalize_system_before_update ON public.projects;
CREATE TRIGGER trg_projects_normalize_system_before_update
  BEFORE UPDATE OF system_type, specialty ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_projects_normalize_system();

-- 4. Atualizar a RPC upsert_project_from_0800 com normalização nativa
CREATE OR REPLACE FUNCTION public.upsert_project_from_0800(
  p_ticket_number text,
  p_client_name text,
  p_system_type text,
  p_sales_order_number integer DEFAULT NULL,
  p_op_number integer DEFAULT NULL,
  p_titulo_chamado text DEFAULT NULL,
  p_descricao_tramite text DEFAULT NULL,
  p_responsavel_atividade text DEFAULT NULL,
  p_etapas_projeto text DEFAULT NULL,
  p_project_leader text DEFAULT 'Bruno Fernandes'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_created boolean := false;
  v_message text;
  v_normalized_system text;
  v_inferred_specialty text;
BEGIN
  IF p_ticket_number IS NULL OR trim(p_ticket_number) = '' THEN
    RAISE EXCEPTION 'p_ticket_number é obrigatório';
  END IF;

  -- Normaliza o sistema principal (ex: 'Orion REG (TDPJ)' vira 'Orion REG')
  v_normalized_system := public.normalize_project_system_type(p_system_type);

  -- Infere a especialidade do cartório conforme o sistema
  v_inferred_specialty := CASE v_normalized_system
    WHEN 'Orion REG' THEN 'TDPJ'
    WHEN 'Orion TN' THEN 'Notas'
    WHEN 'Orion PRO' THEN 'Protesto'
    WHEN 'WebRI' THEN 'Registro de Imóveis'
    WHEN 'WEBRI' THEN 'Registro de Imóveis'
    ELSE NULL
  END;

  -- Buscar se já existe projeto ativo com esse ticket_number
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE ticket_number = trim(p_ticket_number)
    AND is_deleted = false
  LIMIT 1;

  IF v_project_id IS NULL THEN
    -- Criar novo projeto se não existir
    INSERT INTO public.projects (
      client_name,
      ticket_number,
      system_type,
      specialty,
      project_leader,
      sales_order_number,
      op_number,
      description,
      last_update_by,
      global_status,
      infra_status,
      adherence_status,
      environment_status,
      conversion_status,
      implementation_status,
      post_status,
      modelos_editor_status
    ) VALUES (
      trim(p_client_name),
      trim(p_ticket_number),
      v_normalized_system,
      v_inferred_specialty,
      coalesce(trim(p_project_leader), 'Bruno Fernandes'),
      p_sales_order_number,
      p_op_number,
      coalesce(p_titulo_chamado, 'Origem: Chamado 0800'),
      'Automação n8n (0800)',
      'in-progress',
      'todo',
      'todo',
      'todo',
      'todo',
      'todo',
      'todo',
      'todo'
    )
    RETURNING id INTO v_project_id;

    v_created := true;
    v_message := 'Novo projeto criado com sucesso via 0800.';

    -- Registrar evento de criação na timeline do projeto
    INSERT INTO public.timeline_events (
      project_id,
      type,
      author,
      message,
      metadata
    ) VALUES (
      v_project_id,
      'project_created',
      'Automação n8n (0800)',
      'Projeto integrado via chamado 0800 #' || trim(p_ticket_number),
      jsonb_build_object(
        'ticket_number', trim(p_ticket_number),
        'client_name', trim(p_client_name),
        'system_type', v_normalized_system,
        'titulo', p_titulo_chamado,
        'descricao_tramite', p_descricao_tramite,
        'responsavel_atividade', p_responsavel_atividade,
        'etapas_projeto', p_etapas_projeto
      )
    );
  ELSE
    -- Projeto já existe: garante sistema normalizado, atualiza o timestamp e registra o trâmite na timeline
    v_created := false;
    v_message := 'Projeto existente localizado. Novo trâmite/atualização registrado na timeline.';

    UPDATE public.projects
    SET 
      updated_at = now(),
      last_update_by = 'Automação n8n (0800)',
      system_type = COALESCE(v_normalized_system, system_type),
      specialty = COALESCE(specialty, v_inferred_specialty)
    WHERE id = v_project_id;

    IF p_descricao_tramite IS NOT NULL AND trim(p_descricao_tramite) <> '' THEN
      INSERT INTO public.timeline_events (
        project_id,
        type,
        author,
        message,
        metadata
      ) VALUES (
        v_project_id,
        'auto',
        'Automação n8n (0800)',
        'Novo trâmite vindo do 0800: ' || coalesce(p_etapas_projeto, 'Atualização de atividade'),
        jsonb_build_object(
          'ticket_number', trim(p_ticket_number),
          'descricao_tramite', p_descricao_tramite,
          'responsavel_atividade', p_responsavel_atividade,
          'etapas_projeto', p_etapas_projeto
        )
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'project_id', v_project_id,
    'created', v_created,
    'ticket_number', trim(p_ticket_number),
    'message', v_message
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_project_from_0800 TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_project_from_0800 TO service_role;

-- 5. Registro de notificação no changelog (Regra 12 de AGENTS.md)
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
  'release_fix',
  'projects',
  'Projetos: Padronização e blindagem de nomenclatura do Orion REG',
  'Corrigida a identificação do sistema Orion REG em projetos originados de chamados 0800 (como variações Orion REG (TDPJ)), habilitando a geração do Formulário de Aderência e blindando novos cadastros contra divergências de nomenclatura.',
  '/projects'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications existing
  WHERE existing.category = 'changelog'
    AND existing.type = 'release_fix'
    AND existing.permission_resource = 'projects'
    AND existing.title = 'Projetos: Padronização e blindagem de nomenclatura do Orion REG'
    AND existing.action_url = '/projects'
);

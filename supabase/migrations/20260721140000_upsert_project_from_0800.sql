-- Migration: 20260721140000_upsert_project_from_0800.sql
-- Garantir unicidade de ticket_number em projetos ativos e disponibilizar a RPC upsert_project_from_0800.

-- 1. Criar Índice Único Parcial para impedir fisicamente a duplicação de projetos com o mesmo ticket_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_ticket_number_unique 
  ON public.projects (ticket_number) 
  WHERE is_deleted = false;

-- 2. Criar RPC Idempotente para Criação e Atualização de Projetos via 0800 (n8n)
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
BEGIN
  IF p_ticket_number IS NULL OR trim(p_ticket_number) = '' THEN
    RAISE EXCEPTION 'p_ticket_number é obrigatório';
  END IF;

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
      trim(p_system_type),
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
        'system_type', trim(p_system_type),
        'titulo', p_titulo_chamado,
        'descricao_tramite', p_descricao_tramite,
        'responsavel_atividade', p_responsavel_atividade,
        'etapas_projeto', p_etapas_projeto
      )
    );
  ELSE
    -- Projeto já existe: apenas atualiza o timestamp e registra o trâmite na timeline
    v_created := false;
    v_message := 'Projeto existente localizado. Novo trâmite/atualização registrado na timeline.';

    UPDATE public.projects
    SET 
      updated_at = now(),
      last_update_by = 'Automação n8n (0800)'
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

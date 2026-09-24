-- Migration: Corrigir automacao de status da Etapa 1 (Analise de Infraestrutura) na Coleta Publica
-- Regra: O status geral da etapa so pode ser 'done' (Finalizado) ou 'blocked' (Bloqueado)
-- quando os DOIS campos (Status do Servidor E Status das Estacoes) estiverem preenchidos com dados validos.
-- Caso falte Servidor ou Estacoes, a etapa permanece como 'in-progress' (Em Andamento).

-- 1. Remover possivel assinatura obsoleta de 4 parametros se ainda existir
DROP FUNCTION IF EXISTS public.update_project_public_infra(UUID, JSONB, JSONB, INT);

-- 2. Atualizar a funcao de 6 parametros com a nova regra de preenchimento obrigatorio de ambos os itens
CREATE OR REPLACE FUNCTION public.update_project_public_infra(
  p_id UUID,
  p_workstations JSONB,
  p_servers JSONB,
  p_workstations_count INT,
  p_workstations_status VARCHAR DEFAULT NULL,
  p_server_status VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_project public.projects%ROWTYPE;
  v_final_workstations JSONB;
  v_final_servers JSONB;
  v_final_workstations_count INT;
  v_workstations_status VARCHAR;
  v_server_status VARCHAR;
  v_server_filled BOOLEAN;
  v_workstations_filled BOOLEAN;
  v_new_infra_status VARCHAR;
  v_timeline_message TEXT;
  r_project RECORD;
BEGIN
  SELECT * INTO target_project FROM public.projects WHERE id = p_id AND is_deleted = false;
  
  IF NOT FOUND OR COALESCE(target_project.infra_public_link_closed, false) = true THEN
    RETURN FALSE;
  END IF;

  -- 1. Preservar dados ja existentes caso o envio atual nao contenha dados de uma das partes
  v_final_servers := CASE 
    WHEN p_servers IS NOT NULL AND jsonb_typeof(p_servers) = 'array' AND jsonb_array_length(p_servers) > 0 
      THEN p_servers 
    ELSE COALESCE(target_project.infra_servers, '[]'::jsonb) 
  END;

  v_final_workstations := CASE 
    WHEN p_workstations IS NOT NULL AND jsonb_typeof(p_workstations) = 'array' AND jsonb_array_length(p_workstations) > 0 
      THEN p_workstations 
    ELSE COALESCE(target_project.infra_workstations, '[]'::jsonb) 
  END;

  v_final_workstations_count := CASE 
    WHEN p_workstations_count IS NOT NULL AND p_workstations_count > 0 
      THEN p_workstations_count 
    WHEN jsonb_typeof(v_final_workstations) = 'array' AND jsonb_array_length(v_final_workstations) > 0 
      THEN jsonb_array_length(v_final_workstations) 
    ELSE COALESCE(target_project.infra_workstations_count, 0) 
  END;

  -- 2. Preservar status de servidor e estacoes caso nao informado no envio
  v_workstations_status := CASE 
    WHEN p_workstations_status IS NOT NULL AND TRIM(p_workstations_status) != '' 
      THEN p_workstations_status 
    ELSE target_project.infra_workstations_status 
  END;

  v_server_status := CASE 
    WHEN p_server_status IS NOT NULL AND TRIM(p_server_status) != '' 
      THEN p_server_status 
    ELSE target_project.infra_server_status 
  END;

  -- 3. Identificar se Servidor e Estacoes estao de fato preenchidos (com equipamentos e status avaliado)
  v_server_filled := (
    v_server_status IS NOT NULL 
    AND TRIM(v_server_status) != '' 
    AND LOWER(TRIM(v_server_status)) NOT IN ('aguardando', 'não avaliado', 'nao avaliado', 'pending', 'null')
    AND jsonb_typeof(v_final_servers) = 'array'
    AND jsonb_array_length(v_final_servers) > 0
  );

  v_workstations_filled := (
    v_workstations_status IS NOT NULL 
    AND TRIM(v_workstations_status) != '' 
    AND LOWER(TRIM(v_workstations_status)) NOT IN ('aguardando', 'não avaliado', 'nao avaliado', 'pending', 'null')
    AND jsonb_typeof(v_final_workstations) = 'array'
    AND jsonb_array_length(v_final_workstations) > 0
  );

  -- 4. Determinar o status geral da Etapa 1:
  -- So pode ser 'done' (Finalizado) ou 'blocked' (Bloqueado) se os DOIS campos estiverem preenchidos!
  IF v_server_filled AND v_workstations_filled THEN
    IF v_server_status ILIKE '%inadequado%' OR v_workstations_status ILIKE '%inadequado%' 
       OR v_server_status = 'Aguardando Adequação' OR v_workstations_status = 'Aguardando Adequação' THEN
      v_new_infra_status := 'blocked';
      v_timeline_message := 'Dados de infraestrutura concluídos pelo técnico (Sincronização por Cliente). Etapa 1 alterada para Bloqueado devido a inadequações identificadas.';
    ELSE
      v_new_infra_status := 'done';
      v_timeline_message := 'Dados de infraestrutura concluídos pelo técnico (Sincronização por Cliente). Etapa 1 alterada para Finalizado.';
    END IF;
  ELSE
    v_new_infra_status := 'in-progress';
    IF v_workstations_filled AND NOT v_server_filled THEN
      v_timeline_message := 'Dados de estações coletados pelo técnico (Sincronização por Cliente). Etapa 1 mantida Em Andamento aguardando envio do servidor.';
    ELSIF v_server_filled AND NOT v_workstations_filled THEN
      v_timeline_message := 'Dados de servidor coletados pelo técnico (Sincronização por Cliente). Etapa 1 mantida Em Andamento aguardando envio das estações.';
    ELSE
      v_timeline_message := 'Dados parciais de infraestrutura coletados pelo técnico (Sincronização por Cliente). Etapa 1 mantida Em Andamento aguardando conclusão dos dados.';
    END IF;
  END IF;

  -- 5. Atualizar todos os projetos ativos do mesmo cliente (sincronizacao multi-sistema)
  FOR r_project IN 
    SELECT id FROM public.projects 
    WHERE LOWER(TRIM(client_name)) = LOWER(TRIM(target_project.client_name))
      AND is_deleted = false
  LOOP
    UPDATE public.projects
    SET 
      infra_workstations = v_final_workstations,
      infra_servers = v_final_servers,
      infra_workstations_count = v_final_workstations_count,
      infra_workstations_status = v_workstations_status,
      infra_server_status = v_server_status,
      infra_status = v_new_infra_status,
      infra_end_date = CASE 
        WHEN v_new_infra_status = 'done' THEN COALESCE(infra_end_date, NOW()) 
        ELSE NULL 
      END,
      last_update_by = 'Coleta Pública (Técnico)'
    WHERE id = r_project.id;

    -- Registrar evento na timeline
    INSERT INTO public.timeline_events (
      project_id,
      type,
      author,
      message
    ) VALUES (
      r_project.id,
      'auto',
      'Técnico (Link Público)',
      v_timeline_message
    );
  END LOOP;

  RETURN TRUE;
END;
$$;

-- 3. Saneamento: Corrigir projetos existentes afetados pela falha anterior da coleta publica
UPDATE public.projects
SET 
  infra_status = 'in-progress',
  infra_end_date = NULL
WHERE is_deleted = false
  AND last_update_by = 'Coleta Pública (Técnico)'
  AND infra_status = 'done'
  AND (
    infra_server_status IS NULL 
    OR TRIM(infra_server_status) = '' 
    OR LOWER(TRIM(infra_server_status)) IN ('aguardando', 'não avaliado', 'nao avaliado', 'pending')
    OR infra_workstations_status IS NULL 
    OR TRIM(infra_workstations_status) = '' 
    OR LOWER(TRIM(infra_workstations_status)) IN ('aguardando', 'não avaliado', 'nao avaliado', 'pending')
    OR infra_servers IS NULL 
    OR jsonb_array_length(infra_servers) = 0
    OR infra_workstations IS NULL 
    OR jsonb_array_length(infra_workstations) = 0
  );

-- 4. Notificacao de release / changelog (Item 12 do checklist AGENTS.md)
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
  'Ajuste na Automação de Status da Análise de Infraestrutura',
  'A etapa 1 (Análise de Infraestrutura) agora só é definida como Finalizada ou Bloqueada após o envio completo de Servidor e Estações pelo link público. Envios parciais mantêm a etapa Em Andamento.',
  '/projects'
);

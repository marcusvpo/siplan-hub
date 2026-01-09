-- Migração para criar tabela de roadmaps e função RPC associada
-- Nome do arquivo sugerido: 20260109_create_roadmap_system.sql

-- 1. Criar tabela de roadmaps se não existir
CREATE TABLE IF NOT EXISTS public.roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  share_token UUID NOT NULL DEFAULT gen_random_uuid(),
  is_active BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  welcome_message TEXT,
  custom_theme JSONB DEFAULT '{}'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT roadmaps_project_id_key UNIQUE (project_id),
  CONSTRAINT roadmaps_share_token_key UNIQUE (share_token)
);

-- 2. Habilitar RLS e Políticas
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (via RPC ou direta se necessário, mas restringiremos insert/update)
CREATE POLICY "Roadmaps são visualizáveis por todos (via token)" 
ON public.roadmaps FOR SELECT 
USING (true);

CREATE POLICY "Roadmaps podem ser gerenciados por usuários autenticados" 
ON public.roadmaps FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- 3. Função RPC get_roadmap_data segura (SECURITY DEFINER para acessar dados do projeto mesmo que anon)
CREATE OR REPLACE FUNCTION public.get_roadmap_data(token_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  roadmap_record public.roadmaps%ROWTYPE;
  project_record public.projects%ROWTYPE;
  result JSONB;
BEGIN
  -- Buscar o roadmap pelo token
  SELECT * INTO roadmap_record FROM public.roadmaps WHERE share_token = token_uuid;
  
  IF NOT FOUND THEN
    -- Retornar erro ou null? Preferível null para handling no front
    RETURN NULL;
  END IF;

  IF NOT roadmap_record.is_active THEN
    RETURN NULL; -- ou erro específico
  END IF;

  -- Incrementar contador de visualizações
  UPDATE public.roadmaps SET view_count = view_count + 1 WHERE id = roadmap_record.id;

  -- Buscar o projeto associado
  SELECT * INTO project_record FROM public.projects WHERE id = roadmap_record.project_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Construir o objeto de retorno
  result := jsonb_build_object(
    'roadmap', jsonb_build_object(
      'id', roadmap_record.id,
      'welcome_message', roadmap_record.welcome_message,
      'custom_theme', roadmap_record.custom_theme,
      'config', roadmap_record.config
    ),
    'project', jsonb_build_object(
      'client_name', project_record.client_name,
      'system_type', project_record.system_type,
      'sold_hours', project_record.sold_hours,
      'overall_progress', project_record.overall_progress,
      'global_status', project_record.global_status,
      'stages', jsonb_build_object(
        'infra', jsonb_build_object('status', project_record.infra_status),
        'adherence', jsonb_build_object('status', project_record.adherence_status),
        'environment', jsonb_build_object('status', project_record.environment_status),
        'conversion', jsonb_build_object('status', project_record.conversion_status),
        'implementation', jsonb_build_object('status', project_record.implementation_status),
        'post', jsonb_build_object('status', project_record.post_status)
      )
    )
  );

  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro (ex: UUID inválido), retornar null
  RETURN NULL;
END;
$$;

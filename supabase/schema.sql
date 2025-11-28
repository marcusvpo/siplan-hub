-- Consolidated Migration Script for Siplan Manager v2.0
-- Generated on 2025-11-28

-- 1. Base Tables (from 20251125145104_33e23d55-f5a6-4b78-8ce0-b96d91761855.sql)
-- Criar tabela de projetos
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  ticket_number TEXT NOT NULL,
  system_type TEXT NOT NULL,
  project_leader TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_update_by TEXT NOT NULL,
  next_follow_up_date DATE,
  
  -- Estágios
  infra_status TEXT NOT NULL DEFAULT 'todo',
  infra_responsible TEXT,
  infra_start_date DATE,
  infra_end_date DATE,
  infra_blocking_reason TEXT,
  infra_observations TEXT,
  
  adherence_status TEXT NOT NULL DEFAULT 'todo',
  adherence_responsible TEXT,
  adherence_start_date DATE,
  adherence_end_date DATE,
  adherence_has_product_gap BOOLEAN DEFAULT false,
  adherence_dev_ticket TEXT,
  adherence_dev_estimated_date DATE,
  adherence_observations TEXT,
  
  environment_status TEXT NOT NULL DEFAULT 'todo',
  environment_responsible TEXT,
  environment_real_date DATE,
  environment_os_version TEXT,
  environment_approved_by_infra BOOLEAN DEFAULT false,
  environment_observations TEXT,
  
  conversion_status TEXT NOT NULL DEFAULT 'todo',
  conversion_responsible TEXT,
  conversion_source_system TEXT,
  conversion_observations TEXT,
  
  implementation_status TEXT NOT NULL DEFAULT 'todo',
  implementation_responsible TEXT,
  implementation_remote_install_date DATE,
  implementation_training_start_date DATE,
  implementation_training_end_date DATE,
  implementation_switch_type TEXT,
  implementation_observations TEXT,
  
  post_status TEXT NOT NULL DEFAULT 'todo',
  post_responsible TEXT,
  post_start_date DATE,
  post_end_date DATE,
  post_observations TEXT
);

-- Criar tabela de eventos da timeline
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('auto', 'comment', 'field_change', 'status_change', 'file_upload', 'bulk_edit', 'project_created', 'project_deleted')), -- Expanded types from V2
  author TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Criar tabela de arquivos
CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  mime_type TEXT
);

-- Habilitar RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir tudo por enquanto)
CREATE POLICY "Permitir tudo em projetos" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em timeline_events" ON public.timeline_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em project_files" ON public.project_files FOR ALL USING (true) WITH CHECK (true);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_project_id ON public.timeline_events(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_timestamp ON public.timeline_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files(project_id);

-- 2. Function Fix (from 20251125145117_7220b79b-455b-4a3e-a712-6411d1a0aba2.sql)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-files', 'project-files', false)
ON CONFLICT DO NOTHING;

-- Políticas de storage
CREATE POLICY "Permitir upload de arquivos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'project-files');

CREATE POLICY "Permitir leitura de arquivos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'project-files');

CREATE POLICY "Permitir deletar arquivos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'project-files');


-- 4. V2 Columns and Tables (from 20251125172107_2f36b864-3bcf-43de-9c0c-c330cf46efcc.sql and 20251125174249_288b0bdd-7666-4944-aaef-351892845285.sql)

-- Adicionar novos campos de metadados
ALTER TABLE projects ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS implantation_type TEXT DEFAULT 'new' CHECK (implantation_type IN ('new', 'migration_siplan', 'migration_competitor', 'upgrade'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'new' CHECK (project_type IN ('new', 'migration', 'upgrade', 'maintenance'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS global_status TEXT DEFAULT 'in-progress' CHECK (global_status IN ('todo', 'in-progress', 'done', 'blocked', 'archived'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS overall_progress INTEGER DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100);

-- Informações gerais expandidas
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS special_considerations TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_value NUMERIC(12,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Contatos expandidos
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_primary_contact TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- Responsáveis por etapa
ALTER TABLE projects ADD COLUMN IF NOT EXISTS responsible_environment TEXT;

-- Datas críticas expandidas
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date_planned DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date_planned DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date_actual DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date_actual DATE;

-- Soft deletes e arquivamento
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Campos customizados (JSONB)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes JSONB;

-- Expandir InfraStage
ALTER TABLE projects ADD COLUMN IF NOT EXISTS infra_server_in_use TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS infra_server_needed TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS infra_approved_by_infra BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS infra_technical_notes TEXT;

-- Expandir AdherenceStage
ALTER TABLE projects ADD COLUMN IF NOT EXISTS adherence_gap_description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS adherence_gap_priority TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS adherence_analysis_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS adherence_conformity_standards TEXT;

-- Expandir EnvironmentStage
ALTER TABLE projects ADD COLUMN IF NOT EXISTS environment_version TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS environment_test_available BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS environment_preparation_checklist TEXT;

-- Expandir ConversionStage
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conversion_complexity TEXT CHECK (conversion_complexity IN ('low', 'medium', 'high', 'very_high'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conversion_record_count BIGINT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conversion_data_volume_gb NUMERIC(10,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conversion_tool_used TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conversion_homologation_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conversion_homologation_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conversion_deviations TEXT;

-- Expandir ImplementationStage
ALTER TABLE projects ADD COLUMN IF NOT EXISTS implementation_switch_start_time TIME;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS implementation_switch_end_time TIME;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS implementation_training_type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS implementation_training_location TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS implementation_participants_count INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS implementation_client_feedback TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS implementation_acceptance_status TEXT;

-- Expandir PostStage
ALTER TABLE projects ADD COLUMN IF NOT EXISTS post_support_period_days INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS post_support_end_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS post_benefits_delivered TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS post_challenges_found TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS post_roi_estimated TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS post_client_satisfaction TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS post_recommendations TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS post_followup_needed BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS post_followup_date DATE;

-- Campos adicionais (from 20251125174249_288b0bdd-7666-4944-aaef-351892845285.sql)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS op_number integer;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sales_order_number integer;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sold_hours numeric;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS legacy_system text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS specialty text;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_global_status ON projects(global_status);
CREATE INDEX IF NOT EXISTS idx_projects_is_deleted ON projects(is_deleted);
CREATE INDEX IF NOT EXISTS idx_projects_is_archived ON projects(is_archived);
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags);

-- Tabela para filtros salvos
CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0
);

ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo em saved_filters" ON saved_filters
  FOR ALL USING (true) WITH CHECK (true);

-- Tabela para checklist items
CREATE TABLE IF NOT EXISTS project_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_by TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE project_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo em project_checklist" ON project_checklist
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_project_checklist_project_id ON project_checklist(project_id);

COMMENT ON TABLE projects IS 'Siplan Manager v2.0 - Enterprise-grade project management';
COMMENT ON TABLE saved_filters IS 'User-saved filter combinations for quick access';
COMMENT ON TABLE project_checklist IS 'Customizable checklist items per project';

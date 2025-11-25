-- Expandir tabela projects com TODOS os novos campos da v2.0

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

-- Responsáveis por etapa (já existem alguns, adicionar faltantes)
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
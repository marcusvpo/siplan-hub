-- Ensure observation columns exist for all stages
-- These columns store the JSON stringified content blocks from the Rich Text Editor
ALTER TABLE projects ADD COLUMN IF NOT EXISTS infra_observations TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS adherence_observations TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS environment_observations TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conversion_observations TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS post_observations TEXT;

-- Ensure implementation phases exist (which contain their own observations nested in the JSONB)
-- Phase 1: Implantação Inicial
ALTER TABLE projects ADD COLUMN IF NOT EXISTS implementation_phase1 JSONB DEFAULT '{}'::jsonb;

-- Phase 2: Treinamento & Acompanhamento
ALTER TABLE projects ADD COLUMN IF NOT EXISTS implementation_phase2 JSONB DEFAULT '{}'::jsonb;

-- Add comments to clarify usage for future developers
COMMENT ON COLUMN projects.infra_observations IS 'Rich text content (JSON string) for Infra stage';
COMMENT ON COLUMN projects.adherence_observations IS 'Rich text content (JSON string) for Adherence stage';
COMMENT ON COLUMN projects.environment_observations IS 'Rich text content (JSON string) for Environment stage';
COMMENT ON COLUMN projects.conversion_observations IS 'Rich text content (JSON string) for Conversion stage';
COMMENT ON COLUMN projects.post_observations IS 'Rich text content (JSON string) for Post-Implementation stage';

COMMENT ON COLUMN projects.implementation_phase1 IS 'JSONB object for Implementation Phase 1. Contains "observations" field with Rich Text content.';
COMMENT ON COLUMN projects.implementation_phase2 IS 'JSONB object for Implementation Phase 2. Contains "observations" field with Rich Text content.';

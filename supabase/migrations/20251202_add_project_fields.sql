-- Add related_tickets column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS related_tickets JSONB DEFAULT '[]'::jsonb;

-- Add Infra stage specific status columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS infra_workstations_status TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS infra_server_status TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS infra_workstations_count INTEGER;

-- Add Implementation phases as JSONB columns to avoid creating too many columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS implementation_phase1 JSONB DEFAULT '{}'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS implementation_phase2 JSONB DEFAULT '{}'::jsonb;

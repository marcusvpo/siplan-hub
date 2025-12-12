-- Add missing date columns for Environment and Conversion stages

-- Environment stage: Add start_date and end_date columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS environment_start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS environment_end_date DATE;

-- Conversion stage: Add sent_at and finished_at columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conversion_sent_at DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conversion_finished_at DATE;

-- Add Conversion homologation status if not exists
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conversion_homologation_status TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conversion_homologation_responsible TEXT;

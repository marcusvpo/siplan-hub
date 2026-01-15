-- Create timeline_events if it doesn't exist
CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  author TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Ensure client_primary_contact exists on projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_primary_contact TEXT;

-- Enable RLS
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- Policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'timeline_events' AND policyname = 'Enable all access for timeline_events'
    ) THEN
        CREATE POLICY "Enable all access for timeline_events" ON timeline_events
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

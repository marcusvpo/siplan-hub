-- Add tags to clients
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "tags" text[] DEFAULT '{}';

-- Create commercial_notes table
CREATE TABLE IF NOT EXISTS "public"."commercial_notes" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "client_id" UUID NOT NULL REFERENCES "public"."clients"("id") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('meeting', 'call', 'email', 'alignment', 'other')),
    "author_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now(),
    "deleted_at" TIMESTAMPTZ
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "idx_commercial_notes_client_id" ON "public"."commercial_notes"("client_id");

-- Add RLS policies
ALTER TABLE "public"."commercial_notes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON "public"."commercial_notes"
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON "public"."commercial_notes"
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON "public"."commercial_notes"
    FOR UPDATE TO authenticated USING (true);
    
CREATE POLICY "Enable delete for authenticated users" ON "public"."commercial_notes"
    FOR DELETE TO authenticated USING (true);

-- Create public storage bucket for form-images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('form-images', 'form-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage objects under form-images
DROP POLICY IF EXISTS "Allow public read access to form-images" ON storage.objects;
CREATE POLICY "Allow public read access to form-images" 
ON storage.objects FOR SELECT TO public 
USING (bucket_id = 'form-images');

DROP POLICY IF EXISTS "Allow authenticated insert to form-images" ON storage.objects;
CREATE POLICY "Allow authenticated insert to form-images" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'form-images');

DROP POLICY IF EXISTS "Allow authenticated delete to form-images" ON storage.objects;
CREATE POLICY "Allow authenticated delete to form-images" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'form-images');

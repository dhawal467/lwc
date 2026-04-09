INSERT INTO storage.buckets (id, name, public) 
VALUES ('design-files', 'design-files', true) 
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated uploads to design-files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'design-files');
CREATE POLICY "Allow public reads from design-files" ON storage.objects FOR SELECT USING (bucket_id = 'design-files');

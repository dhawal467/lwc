ALTER TABLE public.qc_checks ADD COLUMN IF NOT EXISTS photo_url TEXT;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('qc-photos', 'qc-photos', true) 
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated uploads to qc-photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'qc-photos');
CREATE POLICY "Allow public reads from qc-photos" ON storage.objects FOR SELECT USING (bucket_id = 'qc-photos');

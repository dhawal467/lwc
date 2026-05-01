CREATE TABLE public.attendance_archive (
  LIKE public.attendance INCLUDING ALL,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.attendance_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read access on attendance_archive"
  ON public.attendance_archive FOR SELECT
  TO authenticated
  USING (public.get_role() = 'admin');

-- Daily cron: archive attendance older than 30 days
SELECT cron.schedule(
  'archive-old-attendance',
  '0 2 * * *',
  $$
  INSERT INTO public.attendance_archive
    SELECT *, NOW() as archived_at FROM public.attendance
    WHERE date < CURRENT_DATE - INTERVAL '30 days';
  DELETE FROM public.attendance
    WHERE date < CURRENT_DATE - INTERVAL '30 days';
  $$
);

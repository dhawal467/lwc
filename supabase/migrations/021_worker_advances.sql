CREATE TABLE public.worker_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  recorded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.worker_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Manager full access on worker_advances"
  ON public.worker_advances FOR ALL
  TO authenticated
  USING (public.get_role() IN ('admin', 'manager'))
  WITH CHECK (public.get_role() IN ('admin', 'manager'));

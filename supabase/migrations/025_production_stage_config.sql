CREATE TABLE public.production_stage_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track text NOT NULL CHECK (track IN ('A', 'B')),
  stage_key text NOT NULL,
  expected_hours numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (track, stage_key)
);

ALTER TABLE public.production_stage_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read production_stage_config"
  ON public.production_stage_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage production_stage_config"
  ON public.production_stage_config FOR ALL TO authenticated
  USING (public.get_role() = 'admin') WITH CHECK (public.get_role() = 'admin');

-- Seed defaults
INSERT INTO public.production_stage_config (track, stage_key, expected_hours) VALUES
  ('A', 'carpentry', 48), ('A', 'polish', 24), ('A', 'qc_check', 4), ('A', 'dispatch', 8),
  ('B', 'frame_making', 48), ('B', 'polish', 24), ('B', 'upholstery', 36), ('B', 'qc_check', 4), ('B', 'dispatch', 8);

-- Create public.qc_checks table
CREATE TABLE public.qc_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_stage_id UUID REFERENCES public.order_stages(id) ON DELETE CASCADE,
  checked_by UUID REFERENCES public.users(id),
  passed BOOLEAN NOT NULL,
  checklist_json JSONB,
  failure_notes TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

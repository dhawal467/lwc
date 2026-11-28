-- Migration 032: Immutable Payroll Settlements
-- Freezes historical monthly payroll calculations for workers once settled by an admin/manager.

CREATE TABLE IF NOT EXISTS public.payroll_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- YYYY-MM
  shifts_count NUMERIC(5, 1) NOT NULL,
  daily_rate NUMERIC(10, 2) NOT NULL,
  gross_wage NUMERIC(10, 2) NOT NULL,
  advances_deducted NUMERIC(10, 2) NOT NULL,
  net_paid NUMERIC(10, 2) NOT NULL,
  carryover_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  settled_by UUID REFERENCES public.users(id),
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  CONSTRAINT uq_worker_month UNIQUE (worker_id, month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_settlements_month ON public.payroll_settlements(month);
CREATE INDEX IF NOT EXISTS idx_payroll_settlements_worker ON public.payroll_settlements(worker_id);

ALTER TABLE public.payroll_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read settlements"
  ON public.payroll_settlements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin and manager to insert/update settlements"
  ON public.payroll_settlements FOR ALL
  TO authenticated
  USING (public.get_role() IN ('admin', 'manager'))
  WITH CHECK (public.get_role() IN ('admin', 'manager'));

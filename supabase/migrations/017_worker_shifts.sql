-- Make department optional (was NOT NULL before)
ALTER TABLE public.workers ALTER COLUMN department DROP NOT NULL;

-- Add shifts_worked column to attendance
-- Valid values: 0 (absent), 0.5, 1.0, 1.5, 2.0
ALTER TABLE public.attendance
  ADD COLUMN shifts_worked NUMERIC(3,1)
    NOT NULL
    DEFAULT 0
    CHECK (shifts_worked IN (0, 0.5, 1.0, 1.5, 2.0));

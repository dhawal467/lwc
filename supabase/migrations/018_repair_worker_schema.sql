-- REPAIR: Ensure department and phone are nullable
ALTER TABLE public.workers ALTER COLUMN department DROP NOT NULL;
ALTER TABLE public.workers ALTER COLUMN phone DROP NOT NULL;

-- Ensure shifts_worked exists with correct constraints
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='shifts_worked') THEN
        ALTER TABLE public.attendance ADD COLUMN shifts_worked NUMERIC(3,1) NOT NULL DEFAULT 0 CHECK (shifts_worked IN (0, 0.5, 1.0, 1.5, 2.0));
    END IF;
END $$;

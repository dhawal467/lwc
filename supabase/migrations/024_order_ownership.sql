-- Add owner_id to orders
ALTER TABLE public.orders ADD COLUMN owner_id uuid REFERENCES public.users(id);

-- Backfill: set owner_id = created_by for all existing orders
UPDATE public.orders SET owner_id = created_by WHERE created_by IS NOT NULL AND owner_id IS NULL;

-- For any remaining NULLs, set to first admin user
UPDATE public.orders SET owner_id = (
  SELECT id FROM public.users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE owner_id IS NULL;

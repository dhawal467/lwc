ALTER TABLE public.order_items ADD COLUMN blocked boolean DEFAULT false;
ALTER TABLE public.order_items ADD COLUMN blocked_reason text
  CHECK (blocked_reason IN ('material_pending','customer_approval','worker_unavailable','payment_pending','machine_issue','other'));
ALTER TABLE public.order_items ADD COLUMN blocked_at timestamptz;
ALTER TABLE public.order_items ADD COLUMN blocked_by uuid REFERENCES auth.users(id);
ALTER TABLE public.order_items ADD COLUMN blocked_note text;

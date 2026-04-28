ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

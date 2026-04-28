-- Migration 018: Add quantity to order_items

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0);

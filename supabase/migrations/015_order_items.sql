-- ============================================================
-- Migration 015: Order Items (Phase 2 Line Item Architecture)
-- 
-- Changes:
--   1. Create order_items table (per-item track, status, price)
--   2. Add order_item_id FK to order_stages
--   3. Make orders.track nullable (new orders have no track — items do)
--   4. Add status CHECK constraint on orders (first time — includes partial_dispatch)
--   5. Add audit trigger on order_items
-- ============================================================

-- PRE-FLIGHT CHECK (run manually before applying migration):
-- SELECT DISTINCT status FROM orders;
-- Verify all values are in the list below. If not, update the CHECK or fix bad data first.

-- 1. Create order_items
CREATE TABLE public.order_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  description       text,
  track             text        NOT NULL CHECK (track IN ('A', 'B')),
  unit_price        decimal(12, 2),          -- nullable; used by future price estimator
  status            text        NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'in_production', 'on_hold', 'dispatched', 'completed', 'cancelled')),
  current_stage_key text,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order_id  ON public.order_items(order_id);
CREATE INDEX idx_order_items_status    ON public.order_items(status);

-- 2. Add order_item_id to order_stages (nullable — Phase 1 rows stay NULL)
ALTER TABLE public.order_stages
  ADD COLUMN order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE;

CREATE INDEX idx_order_stages_item_id ON public.order_stages(order_item_id);

-- 3. Make orders.track nullable (Phase 1 keeps existing values; Phase 2+ rows = NULL)
ALTER TABLE public.orders
  ALTER COLUMN track DROP NOT NULL;

-- 4. Add status CHECK constraint on orders (no prior constraint exists)
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'draft', 'confirmed', 'in_production', 'on_hold',
    'partial_dispatch', 'dispatched', 'qc_passed', 'completed', 'cancelled'
  ));

-- 5. Audit trigger on order_items (reuses existing process_audit_log function)
CREATE TRIGGER audit_order_items
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 6. RLS on order_items (mirrors orders policies)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on order_items"
  ON public.order_items FOR ALL
  TO authenticated
  USING  (public.get_role() = 'admin')
  WITH CHECK (public.get_role() = 'admin');

CREATE POLICY "Manager full access on order_items"
  ON public.order_items FOR ALL
  TO authenticated
  USING  (public.get_role() = 'manager')
  WITH CHECK (public.get_role() = 'manager');

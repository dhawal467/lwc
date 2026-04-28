-- ============================================================
-- Migration 016: Payment Ledger + Order Financials View
--
-- Changes:
--   1. Create payment_ledger table
--   2. Create order_financials view (balance calculation + item_count)
--   3. Audit trigger on payment_ledger
--   4. RLS on payment_ledger (admin + manager can write; admin can delete)
-- ============================================================

-- 1. Payment Ledger
CREATE TABLE public.payment_ledger (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount        decimal(12, 2) NOT NULL CHECK (amount > 0),
  payment_type  text        NOT NULL CHECK (payment_type IN ('advance', 'partial', 'final')),
  payment_date  date        NOT NULL DEFAULT CURRENT_DATE,
  notes         text,
  recorded_by   uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_ledger_order_id ON public.payment_ledger(order_id);

-- 2. Financials View (includes item_count for orders list)
CREATE OR REPLACE VIEW public.order_financials AS
SELECT
  o.id                                                            AS order_id,
  o.order_number,
  o.customer_id,
  c.name                                                          AS customer_name,
  c.phone                                                         AS customer_phone,
  o.quoted_amount,
  COALESCE(SUM(p.amount), 0)                                      AS total_paid,
  COALESCE(o.quoted_amount, 0) - COALESCE(SUM(p.amount), 0)      AS balance_due,
  (SELECT count(*) FROM public.order_items oi
   WHERE oi.order_id = o.id AND oi.deleted_at IS NULL)            AS item_count,
  o.status,
  o.delivery_date,
  o.deleted_at,
  o.created_at
FROM public.orders o
LEFT JOIN public.customers c   ON c.id = o.customer_id
LEFT JOIN public.payment_ledger p ON p.order_id = o.id
WHERE o.deleted_at IS NULL
GROUP BY
  o.id, o.order_number, o.customer_id,
  c.name, c.phone,
  o.quoted_amount, o.status, o.delivery_date, o.deleted_at, o.created_at;

-- 3. Audit trigger on payment_ledger
CREATE TRIGGER audit_payment_ledger
  AFTER INSERT OR DELETE ON public.payment_ledger
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 4. RLS on payment_ledger
ALTER TABLE public.payment_ledger ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admin full access on payment_ledger"
  ON public.payment_ledger FOR ALL
  TO authenticated
  USING  (public.get_role() = 'admin')
  WITH CHECK (public.get_role() = 'admin');

-- Manager: insert + select (cannot delete payments; only admin can)
CREATE POLICY "Manager can view payments"
  ON public.payment_ledger FOR SELECT
  TO authenticated
  USING (public.get_role() = 'manager');

CREATE POLICY "Manager can record payments"
  ON public.payment_ledger FOR INSERT
  TO authenticated
  WITH CHECK (public.get_role() = 'manager');

-- ============================================================
-- Migration 014: Admin Audit Logs
-- Creates the audit_logs table, a shared trigger function, and
-- attaches AFTER INSERT/UPDATE/DELETE triggers to the four core
-- tables: orders, order_stages, customers, workers.
-- ============================================================

-- 1. Create the audit_logs table
CREATE TABLE public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT        NOT NULL,
  record_id   UUID        NOT NULL,
  action      TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  changed_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast admin queries (newest first per table)
CREATE INDEX idx_audit_logs_created_at  ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_table_name  ON public.audit_logs (table_name);
CREATE INDEX idx_audit_logs_changed_by  ON public.audit_logs (changed_by);

-- 2. Trigger function — single function shared across all four tables
--
-- Key variables used:
--   TG_TABLE_NAME → 'orders' | 'order_stages' | 'customers' | 'workers'
--   TG_OP         → 'INSERT' | 'UPDATE' | 'DELETE'
--   NEW / OLD     → Postgres pseudo-rows representing the row state
--   auth.uid()    → UUID of the authenticated Supabase user from the JWT
--
-- SECURITY DEFINER ensures auth.uid() is evaluated in the context of
-- the calling user's JWT, not the function owner's session.
-- The function is declared AFTER so it never blocks the original DML.

CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_record_id  UUID;
  v_old_data   JSONB;
  v_new_data   JSONB;
  v_changed_by UUID;
BEGIN
  -- Capture the actor from the current JWT; may be NULL for
  -- server-side service-role operations (acceptable).
  v_changed_by := auth.uid();

  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_old_data  := to_jsonb(OLD);
    v_new_data  := NULL;

  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    v_old_data  := NULL;
    v_new_data  := to_jsonb(NEW);

  ELSE -- UPDATE
    v_record_id := NEW.id;
    v_old_data  := to_jsonb(OLD);
    v_new_data  := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_logs
    (table_name, record_id, action, old_data, new_data, changed_by)
  VALUES
    (TG_TABLE_NAME, v_record_id, TG_OP, v_old_data, v_new_data, v_changed_by);

  -- AFTER triggers ignore the return value for non-row-level operations.
  -- Return NULL for AFTER triggers is conventional.
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the trigger to all four core tables

CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE TRIGGER audit_order_stages
  AFTER INSERT OR UPDATE OR DELETE ON public.order_stages
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE TRIGGER audit_customers
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE TRIGGER audit_workers
  AFTER INSERT OR UPDATE OR DELETE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 4. Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can SELECT. The SECURITY DEFINER trigger function bypasses
-- RLS when writing, so no INSERT/UPDATE/DELETE policy is needed.
CREATE POLICY "Admin can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.get_role() = 'admin');

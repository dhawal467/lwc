-- Migration 031: Performance Indexes on Foreign Keys and High-Frequency Query Paths
-- Improves query execution plans on orders, stages, items, attendance, and QC checks.

-- 1. Orders foreign keys
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_owner_id ON public.orders(owner_id);

-- 2. QC checks and design files foreign keys
CREATE INDEX IF NOT EXISTS idx_qc_checks_order_stage_id ON public.qc_checks(order_stage_id);
CREATE INDEX IF NOT EXISTS idx_design_files_order_id ON public.design_files(order_id);

-- 3. Order items and stages relational lookup
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_stages_order_id ON public.order_stages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_stages_order_item_id ON public.order_stages(order_item_id);

-- 4. Attendance date filter and range lookups
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON public.attendance(worker_id, date);

-- 5. Worker advances status and worker filtering
CREATE INDEX IF NOT EXISTS idx_worker_advances_worker_status ON public.worker_advances(worker_id, status);

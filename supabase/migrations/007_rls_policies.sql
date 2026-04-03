-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Help function to check role from JWT
CREATE OR REPLACE FUNCTION public.get_role()
RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'role';
$$ LANGUAGE sql STABLE;

-- 1. USERS POLICIES
CREATE POLICY "Admin full access on users"
  ON public.users FOR ALL
  TO authenticated
  USING (public.get_role() = 'admin')
  WITH CHECK (public.get_role() = 'admin');

CREATE POLICY "Manager can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (public.get_role() = 'manager');

CREATE POLICY "Manager can update own user profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id AND public.get_role() = 'manager')
  WITH CHECK (auth.uid() = id AND public.get_role() = 'manager');

-- 2. CUSTOMERS POLICIES
CREATE POLICY "Admin and Manager full access on customers"
  ON public.customers FOR ALL
  TO authenticated
  USING (public.get_role() IN ('admin', 'manager'))
  WITH CHECK (public.get_role() IN ('admin', 'manager'));

-- 3. ORDERS POLICIES
CREATE POLICY "Admin full access on orders"
  ON public.orders FOR ALL
  TO authenticated
  USING (public.get_role() = 'admin')
  WITH CHECK (public.get_role() = 'admin');

CREATE POLICY "Manager CRUD on orders (no hard-delete)"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.get_role() = 'manager');

CREATE POLICY "Manager can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (public.get_role() = 'manager');

CREATE POLICY "Manager can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.get_role() = 'manager')
  WITH CHECK (public.get_role() = 'manager');

-- 4. ORDER_STAGES POLICIES (Read-only for clients)
CREATE POLICY "Everyone can view order stages"
  ON public.order_stages FOR SELECT
  TO authenticated
  USING (true);

-- 5. QC_CHECKS POLICIES (Read-only for clients)
CREATE POLICY "Everyone can view QC checks"
  ON public.qc_checks FOR SELECT
  TO authenticated
  USING (true);

-- 6. DESIGN_FILES POLICIES
CREATE POLICY "Admin and Manager full access on design_files"
  ON public.design_files FOR ALL
  TO authenticated
  USING (public.get_role() IN ('admin', 'manager'))
  WITH CHECK (public.get_role() IN ('admin', 'manager'));

-- 7. WORKERS POLICIES
CREATE POLICY "Admin full access on workers"
  ON public.workers FOR ALL
  TO authenticated
  USING (public.get_role() = 'admin')
  WITH CHECK (public.get_role() = 'admin');

CREATE POLICY "Manager can view workers"
  ON public.workers FOR SELECT
  TO authenticated
  USING (public.get_role() = 'manager');

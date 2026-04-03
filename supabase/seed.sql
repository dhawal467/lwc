-- seed.sql
-- Development data for FurnitureMFG

DO $$
DECLARE
  admin_id UUID := gen_random_uuid();
  manager_id UUID := gen_random_uuid();
  cust1_id UUID := gen_random_uuid();
  cust2_id UUID := gen_random_uuid();
BEGIN
  -- 1. Create Auth Users
  -- These will auto-populate public.users via the trigger created in migration 001
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
  VALUES
    (admin_id, 'admin@example.com', '$2a$10$vI8A7C6B7C6B7C6B7C6B7OuXkL3q9jH7W8f0G1h2i3j4k5l6m7n8o', now(), '{"full_name": "System Admin", "role": "admin"}', 'authenticated', 'authenticated'),
    (manager_id, 'manager@example.com', '$2a$10$vI8A7C6B7C6B7C6B7C6B7OuXkL3q9jH7W8f0G1h2i3j4k5l6m7n8o', now(), '{"full_name": "Shop Manager", "role": "manager"}', 'authenticated', 'authenticated');

  -- 2. Create Customers
  INSERT INTO public.customers (id, name, phone, address, notes)
  VALUES
    (cust1_id, 'Anita Sharma', '+91 98765 43210', 'Plot 45, Sector 12, Jaipur', 'Regular wholesale architect client'),
    (cust2_id, 'Vikram Mehta', '+91 91234 56789', 'Gopalpura Bypass, Jaipur', 'New custom dining table order');

  -- 3. Create Workers
  INSERT INTO public.workers (name, department, phone, active)
  VALUES
    ('Suresh Kumar', 'Carpentry', '+91 90000 11111', true),
    ('Prakash Lal', 'Polish', '+91 90000 22222', true),
    ('Deepak Singh', 'QC', '+91 90000 33333', true);

  -- 4. Create Orders
  INSERT INTO public.orders (order_number, customer_id, track, status, current_stage_key, priority, delivery_date, description, quoted_amount, created_by)
  VALUES
    ('ORD-001', cust1_id, 'A', 'in_production', 'carpentry', true, CURRENT_DATE + interval '14 days', 'Teak wood king size bed with storage', 45000.00, admin_id),
    ('ORD-002', cust2_id, 'B', 'confirmed', 'frame_making', false, CURRENT_DATE + interval '21 days', 'L-shaped custom sofa (7 seater)', 85000.00, manager_id);

END $$;

-- 1. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Insert Admin and Manager into auth.users
-- Fixed UUIDs ensure FK references in orders work deterministically.
-- The on_auth_user_created trigger will fire and insert into public.users automatically.
-- The sync_role_to_jwt_claims trigger will then sync the role into app_metadata.
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  is_super_admin
)
VALUES
(
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'admin@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"],"role":"admin"}',
  '{"full_name":"Admin Owner","role":"admin"}',
  now(), now(),
  'authenticated',
  'authenticated',
  false
),
(
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'manager@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"],"role":"manager"}',
  '{"full_name":"Production Manager","role":"manager"}',
  now(), now(),
  'authenticated',
  'authenticated',
  false
);

-- 3. Insert Dummy Customers
INSERT INTO public.customers (id, name, phone, address) VALUES
('33333333-3333-3333-3333-333333333333', 'Acme Corp', '555-0100', '123 Factory Lane'),
('44444444-4444-4444-4444-444444444444', 'John Doe', '555-0200', '456 Residential Blvd');

-- 4. Insert Dummy Workers
INSERT INTO public.workers (name, department, phone) VALUES
('Rajesh', 'Carpentry', '555-1001'),
('Amit', 'Polish', '555-1002'),
('Suresh', 'QC', '555-1003');

-- 5. Insert Dummy Orders
INSERT INTO public.orders (id, order_number, customer_id, track, status, current_stage_key, created_by) VALUES
(gen_random_uuid(), 'ORD-001', '33333333-3333-3333-3333-333333333333', 'A', 'in_production', 'carpentry', '22222222-2222-2222-2222-222222222222'),
(gen_random_uuid(), 'ORD-002', '44444444-4444-4444-4444-444444444444', 'B', 'confirmed', 'frame_making', '22222222-2222-2222-2222-222222222222'),
(gen_random_uuid(), 'ORD-003', '33333333-3333-3333-3333-333333333333', 'A', 'dispatched', 'dispatch', '22222222-2222-2222-2222-222222222222');

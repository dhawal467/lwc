-- Create public.customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create public.orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  track TEXT NOT NULL,
  status TEXT NOT NULL,
  current_stage_key TEXT,
  priority BOOLEAN DEFAULT false,
  delivery_date DATE,
  description TEXT,
  materials_checklist TEXT,
  quoted_amount DECIMAL(12, 2),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Create public.order_stages table (FSM state rows)
CREATE TABLE public.order_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  sequence_position SMALLINT NOT NULL,
  status TEXT NOT NULL,
  sanding_complete BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.users(id),
  notes TEXT,
  photo_url TEXT
);

-- Create public.design_files table
CREATE TABLE public.design_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID REFERENCES public.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

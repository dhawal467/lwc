-- 009_order_number_function.sql
-- Creates a deterministic, sequential order number generator.

CREATE OR REPLACE FUNCTION public.generate_next_order_number()
RETURNS TEXT AS $$
DECLARE
  max_num INTEGER;
  next_num INTEGER;
BEGIN
  -- Extract the highest numeric suffix from all existing order_numbers
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(order_number FROM 'ORD-(\d+)') AS INTEGER
      )
    ),
    0
  )
  INTO max_num
  FROM public.orders
  WHERE order_number ~ '^ORD-\d+$';

  next_num := max_num + 1;

  -- Format as ORD-001, ORD-002, ..., ORD-999, ORD-1000, etc.
  RETURN 'ORD-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Set the default value of order_number to use this function
ALTER TABLE public.orders
  ALTER COLUMN order_number SET DEFAULT public.generate_next_order_number();

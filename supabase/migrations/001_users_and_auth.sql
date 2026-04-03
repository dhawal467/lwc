-- Create user role enum
CREATE TYPE user_role AS ENUM ('admin', 'manager');

-- Create public.users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role DEFAULT 'manager'::user_role,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to handle new user signup and insert into public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'manager'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ADR-2: Function to sync user role to custom claims in auth JWT
CREATE OR REPLACE FUNCTION public.sync_role_to_jwt_claims()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync role on insert or update in public.users
CREATE TRIGGER on_user_role_updated
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_role_to_jwt_claims();

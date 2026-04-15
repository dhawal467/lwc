-- Fix handle_new_user to be resilient to missing metadata from Supabase Dashboard
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'), -- Fallback for null full_name
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'manager'::public.user_role) -- Fallback for null or missing role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure role sync handles null raw_app_meta_data safely
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

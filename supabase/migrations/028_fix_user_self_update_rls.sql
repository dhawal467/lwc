-- Migration 028: Restrict user self-update to full_name only.
--
-- Context:
--   Migration 023 created "Users can update own name" with:
--     WITH CHECK (auth.uid() = id)
--   This only validates row ownership — not WHICH columns are being changed.
--   An authenticated user could therefore update their own 'role' column to 'admin'.
--   Because the on_user_role_updated trigger syncs 'role' into Supabase auth JWT
--   claims (raw_app_meta_data), this is a privilege escalation vector.
--
-- Fix:
--   Replace the policy with a tighter WITH CHECK that ensures 'role' and 'email'
--   are unchanged from what is currently stored in the database.
--   The subquery (SELECT role FROM public.users WHERE id = auth.uid()) is safe —
--   it is resolved using the "Users can read own profile" SELECT policy (023),
--   which already allows unconditional self-reads. No recursion occurs.
--
-- What remains allowed:
--   - Updating full_name (the only legitimate self-update use case)
--
-- What is now blocked:
--   - Self-promoting role to 'admin' or any other value
--   - Changing own email via RLS (email changes go through Supabase Auth, not direct DB updates)

DROP POLICY IF EXISTS "Users can update own name" ON public.users;

CREATE POLICY "Users can update own profile name only"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent role escalation: role must remain unchanged
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
    -- Prevent email hijacking: email must remain unchanged
    AND email = (SELECT email FROM public.users WHERE id = auth.uid())
  );

-- Fix: Allow any authenticated user to SELECT their own row in public.users.
--
-- The existing policies ("Admin full access on users" and "Manager can view all users")
-- both depend on get_role() returning a value from the JWT app_metadata claim.
-- This creates a chicken-and-egg problem: a user cannot read their own role from
-- the DB because they need the role in the JWT first, but the JWT role claim is
-- only synced when the trigger fires on INSERT/UPDATE.
--
-- This policy breaks the cycle by allowing self-reads unconditionally (no role check).

CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Also allow users to update their own name (without needing the manager role claim).
-- The existing "Manager can update own user profile" policy already covers this
-- for users whose JWT has the role, but this ensures it works before JWT sync too.
CREATE POLICY "Users can update own name"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- Migration 029: Improved actor attribution in audit_logs
-- Updates process_audit_log() trigger function so that when
-- Next.js API routes use the service-role client (where
-- auth.uid() is NULL), the actual user's ID is still captured
-- via a custom 'x-user-id' HTTP request header.
--
-- How it works:
--   1. auth.uid() is tried first (works for user-client requests)
--   2. If NULL, the function reads the PostgREST request.headers
--      setting and extracts the 'x-user-id' key
--   3. The x-user-id is safely cast to UUID with error handling
--   4. If parsing fails or the header is absent, changed_by = NULL
--      (displayed as "System" in the admin log UI)
--
-- Security:
--   - The FK audit_logs.changed_by → public.users(id) ensures
--     only valid user IDs can be stored; invalid UUIDs are
--     caught by the EXCEPTION block and stored as NULL.
--   - This does NOT affect authentication or RLS — it is purely
--     for audit attribution.
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_record_id  UUID;
  v_old_data   JSONB;
  v_new_data   JSONB;
  v_changed_by UUID;
  v_headers    TEXT;
BEGIN
  -- 1. Try standard auth.uid() first (user-client / JWT requests)
  v_changed_by := auth.uid();

  -- 2. Fall back to x-user-id request header (service-role client requests)
  --    PostgREST populates request.headers for all calls that come through
  --    the REST API — including service-role client calls from Next.js API routes.
  IF v_changed_by IS NULL THEN
    BEGIN
      v_headers := current_setting('request.headers', true);
      IF v_headers IS NOT NULL AND v_headers <> '' THEN
        v_changed_by := (v_headers::json ->> 'x-user-id')::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Silently ignore any JSON parsing or UUID cast errors.
      -- changed_by stays NULL (shown as "System" in the admin UI).
      v_changed_by := NULL;
    END;
  END IF;

  -- 3. Determine the record data based on the operation type
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_old_data  := to_jsonb(OLD);
    v_new_data  := NULL;

  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    v_old_data  := NULL;
    v_new_data  := to_jsonb(NEW);

  ELSE -- UPDATE
    v_record_id := NEW.id;
    v_old_data  := to_jsonb(OLD);
    v_new_data  := to_jsonb(NEW);
  END IF;

  -- 4. Insert the audit record
  INSERT INTO public.audit_logs
    (table_name, record_id, action, old_data, new_data, changed_by)
  VALUES
    (TG_TABLE_NAME, v_record_id, TG_OP, v_old_data, v_new_data, v_changed_by);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

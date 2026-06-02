import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with the service-role key (bypasses RLS).
 *
 * @param userId - Optional ID of the authenticated user performing the action.
 *   When provided, it is forwarded as the `x-user-id` request header so the
 *   `process_audit_log` DB trigger can attribute audit_logs rows to the real
 *   actor even though auth.uid() is NULL for service-role requests.
 */
export function createServiceRoleClient(userId?: string) {
  const extraHeaders: Record<string, string> = userId
    ? { 'x-user-id': userId }
    : {};

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: extraHeaders,
      },
    }
  )
}

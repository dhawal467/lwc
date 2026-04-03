-- Enable pg_cron extension (only available in Supabase cloud, will be skipped locally)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  -- Schedule nightly cleanup of soft-deleted orders (only runs if pg_cron is available)
  PERFORM cron.schedule(
    'prune_recycle_bin',
    '0 0 * * *',
    $cron$ DELETE FROM public.orders WHERE deleted_at < now() - interval '30 days' $cron$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'pg_cron not available in this environment, skipping cron job setup.';
END;
$$;

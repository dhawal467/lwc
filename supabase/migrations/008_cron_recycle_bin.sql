-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule nightly cleanup of soft-deleted orders
SELECT cron.schedule(
  'prune_recycle_bin',
  '0 0 * * *',
  $$ DELETE FROM public.orders WHERE deleted_at < now() - interval '30 days' $$
);

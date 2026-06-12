-- =============================================================
-- Migration 030: Notification Infrastructure
-- Phase 6 — Telegram Notification Layer
-- =============================================================

-- Notification log: records every notification sent (success or failure)
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.order_events(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'telegram',
  message_type text NOT NULL,
  message_content text,
  photo_url text,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  telegram_message_id bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_log_order ON public.notification_log(order_id);
CREATE INDEX idx_notification_log_status ON public.notification_log(status);
CREATE INDEX idx_notification_log_type_item ON public.notification_log(message_type, order_item_id);

-- Notification queue: failed sends that need retry + scheduled sends
CREATE TABLE public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.order_events(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  photo_url text,
  status text NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX idx_notification_queue_pending ON public.notification_queue(status, scheduled_for)
  WHERE status = 'pending';

-- RLS — these tables are written by service-role (which bypasses RLS).
-- We only need policies for admin read access via the dashboard.
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read access on notification_log"
  ON public.notification_log FOR SELECT TO authenticated
  USING (public.get_role() = 'admin');

CREATE POLICY "Admin read access on notification_queue"
  ON public.notification_queue FOR SELECT TO authenticated
  USING (public.get_role() = 'admin');

CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_events_order_id ON public.order_events(order_id);
CREATE INDEX idx_order_events_item_id ON public.order_events(order_item_id);
CREATE INDEX idx_order_events_type ON public.order_events(event_type);

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on order_events"
  ON public.order_events FOR ALL TO authenticated
  USING (public.get_role() = 'admin') WITH CHECK (public.get_role() = 'admin');

CREATE POLICY "Manager full access on order_events"
  ON public.order_events FOR ALL TO authenticated
  USING (public.get_role() = 'manager') WITH CHECK (public.get_role() = 'manager');

CREATE TRIGGER audit_order_events
  AFTER INSERT OR UPDATE OR DELETE ON public.order_events
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

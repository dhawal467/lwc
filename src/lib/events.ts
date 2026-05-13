import { createServiceRoleClient } from "@/lib/supabase/service";

type EventType = 'note' | 'stage_change' | 'blocked' | 'unblocked' | 'payment'
  | 'ownership_change' | 'item_added' | 'item_cancelled'
  | 'delivery_date_changed' | 'qc_result' | 'photo_uploaded';

export async function logOrderEvent(params: {
  orderId: string;
  orderItemId?: string;
  actorId?: string;
  eventType: EventType;
  payload?: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  await supabase.from("order_events").insert({
    order_id: params.orderId,
    order_item_id: params.orderItemId || null,
    actor_id: params.actorId || null,
    event_type: params.eventType,
    payload: params.payload || {},
  });
}

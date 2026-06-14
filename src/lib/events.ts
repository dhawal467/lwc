import { createServiceRoleClient } from "@/lib/supabase/service";
import { STAGE_LABELS, BLOCK_REASON_LABELS } from "@/lib/design-constants";
import { sendNotification } from "@/lib/notifications/send";

type EventType = 'note' | 'stage_change' | 'blocked' | 'unblocked' | 'payment'
  | 'ownership_change' | 'item_added' | 'item_cancelled'
  | 'delivery_date_changed' | 'qc_result' | 'photo_uploaded'
  | 'order_created' | 'order_confirmed' | 'order_hold' | 'order_resume'
  | 'item_confirmed';

export async function logOrderEvent(params: {
  orderId: string;
  orderItemId?: string;
  actorId?: string;
  eventType: EventType;
  payload?: Record<string, unknown>;
}): Promise<{ id: string } | null> {
  const supabase = createServiceRoleClient();
  const enrichedPayload: Record<string, unknown> = { ...(params.payload || {}) };

  // --- Enrich: actor name ---
  if (params.actorId) {
    const { data: actor } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', params.actorId)
      .single();
    enrichedPayload.actor_name = actor?.full_name || 'Unknown User';
  } else {
    enrichedPayload.actor_name = 'System';
  }

  // --- Enrich: order context ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await supabase
    .from('orders')
    .select('order_number, customers ( name )')
    .eq('id', params.orderId)
    .single();
  if (order) {
    enrichedPayload.order_number = order.order_number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enrichedPayload.customer_name = (order as any).customers?.name || null;
    enrichedPayload.order_id = params.orderId;
  }

  // --- Enrich: item context ---
  if (params.orderItemId) {
    const { data: item } = await supabase
      .from('order_items')
      .select('name, photo_url')
      .eq('id', params.orderItemId)
      .single();
    if (item) {
      enrichedPayload.item_name = enrichedPayload.item_name || item.name;
      enrichedPayload.item_photo_url = enrichedPayload.item_photo_url || item.photo_url;
    }
  }

  // --- Enrich: stage labels ---
  if (enrichedPayload.from_stage) {
    enrichedPayload.from_stage_label = STAGE_LABELS[enrichedPayload.from_stage as string] || enrichedPayload.from_stage;
  }
  if (enrichedPayload.to_stage) {
    enrichedPayload.to_stage_label = STAGE_LABELS[enrichedPayload.to_stage as string] || enrichedPayload.to_stage;
  }

  // --- Enrich: block reason label ---
  if (enrichedPayload.reason) {
    enrichedPayload.block_reason_label = BLOCK_REASON_LABELS[enrichedPayload.reason as string] || enrichedPayload.reason;
  }

  // --- Enrich: ownership change names ---
  if (params.eventType === 'ownership_change') {
    if (enrichedPayload.from_id) {
      const { data: fromUser } = await supabase
        .from('users').select('full_name').eq('id', enrichedPayload.from_id as string).single();
      enrichedPayload.from_owner_name = fromUser?.full_name || 'Unknown User';
    }
    if (enrichedPayload.to_id) {
      const { data: toUser } = await supabase
        .from('users').select('full_name').eq('id', enrichedPayload.to_id as string).single();
      enrichedPayload.to_owner_name = toUser?.full_name || 'Unknown User';
    }
  }

  // --- Insert event ---
  const { data: event, error } = await supabase
    .from("order_events")
    .insert({
      order_id: params.orderId,
      order_item_id: params.orderItemId || null,
      actor_id: params.actorId || null,
      event_type: params.eventType,
      payload: enrichedPayload,
    })
    .select('id')
    .single();

  if (error) {
    console.error(`[logOrderEvent] Failed to log ${params.eventType}:`, error);
    return null;
  }

  // --- Trigger notification (awaited, but errors caught) ---
  if (event) {
    await sendNotification({
      eventId: event.id,
      orderId: params.orderId,
      orderItemId: params.orderItemId,
      eventType: params.eventType,
      payload: enrichedPayload,
    }).catch(err => console.error('[Telegram] Notification failed:', err));
  }

  return event;
}

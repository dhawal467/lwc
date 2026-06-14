/**
 * Notification Orchestrator
 *
 * Builds the message from templates, sends via Telegram,
 * logs the result, and queues failures for retry.
 */

import { createServiceRoleClient } from '@/lib/supabase/service';
import { getConfig, sendTextMessage, sendPhotoMessage } from './telegram';
import { buildTemplate } from './templates';

export async function sendNotification(params: {
  eventId: string;
  orderId: string;
  orderItemId?: string;
  eventType: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    // 1. Check Telegram configuration
    const config = getConfig();
    if (!config) return; // Local dev — no Telegram configured

    // 2. Build message from template
    const template = buildTemplate(params.eventType, params.payload);

    // 3. Resolve item photo if we have an orderItemId and template didn't provide one
    let photoUrl = template.photoUrl;
    if (params.orderItemId && !photoUrl) {
      const supabase = createServiceRoleClient();
      const { data: item } = await supabase
        .from('order_items')
        .select('photo_url')
        .eq('id', params.orderItemId)
        .single();
      if (item?.photo_url) photoUrl = item.photo_url;
    }

    // 4. Send via Telegram
    const result = photoUrl
      ? await sendPhotoMessage(photoUrl, template.text)
      : await sendTextMessage(template.text);

    // 5. Log the result
    const supabase = createServiceRoleClient();
    await supabase.from('notification_log').insert({
      order_id: params.orderId,
      order_item_id: params.orderItemId || null,
      event_id: params.eventId,
      channel: 'telegram',
      message_type: params.eventType,
      message_content: template.text,
      photo_url: photoUrl || null,
      status: result.ok ? 'sent' : 'failed',
      error_message: result.error || null,
      telegram_message_id: result.messageId || null,
    });

    // 6. On failure, queue for retry
    if (!result.ok) {
      await supabase.from('notification_queue').insert({
        event_id: params.eventId,
        order_id: params.orderId,
        order_item_id: params.orderItemId || null,
        event_type: params.eventType,
        payload: params.payload,
        photo_url: photoUrl || null,
        status: 'pending',
        retry_count: 0,
        max_retries: 3,
      });
    }
  } catch (err) {
    console.error('[Notification] Failed to process notification:', err);
  }
}

/**
 * Notification Message Templates
 *
 * One builder function per event type. Each returns { text, photoUrl }.
 * All text uses HTML formatting for Telegram (bold, links, etc.).
 */

import { STAGE_LABELS, BLOCK_REASON_LABELS } from '@/lib/design-constants';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app';

function orderLink(orderId: string): string {
  return `${APP_URL}/dashboard/orders/${orderId}`;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stageLabel(key: string): string {
  return STAGE_LABELS[key] || key.replace(/_/g, ' ');
}

function blockReasonLabel(reason: string): string {
  return BLOCK_REASON_LABELS[reason] || reason.replace(/_/g, ' ');
}

function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₹${num.toLocaleString('en-IN')}`;
}

export interface NotificationTemplate {
  text: string;
  photoUrl: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Payload = Record<string, any>;

export function buildTemplate(eventType: string, payload: Payload): NotificationTemplate {
  switch (eventType) {
    case 'order_created':
      return orderCreated(payload);
    case 'order_confirmed':
      return orderConfirmed(payload);
    case 'order_hold':
      return orderHold(payload);
    case 'order_resume':
      return orderResume(payload);
    case 'hold_status':
      return payload.action === 'resume' || payload.status === 'resumed' || payload.resumed
        ? orderResume(payload)
        : orderHold(payload);
    case 'stage_change':
      return stageChange(payload);
    case 'blocked':
      return itemBlocked(payload);
    case 'unblocked':
      return itemUnblocked(payload);
    case 'payment':
    case 'payment_recorded':
      return paymentRecorded(payload);
    case 'qc_result':
      return payload.passed ? qcPassed(payload) : qcFailed(payload);
    case 'order_dispatched':
      return orderDispatched(payload);
    case 'order_completed':
      return orderCompleted(payload);
    case 'order_cancelled':
      return orderCancelled(payload);
    case 'item_added':
      return itemAdded(payload);
    case 'item_confirmed':
      return itemConfirmed(payload);
    case 'ownership_change':
      return ownershipChange(payload);
    case 'delivery_date_changed':
      return deliveryDateChanged(payload);
    case 'note':
      return noteAdded(payload);
    default:
      return genericEvent(eventType, payload);
  }
}

export function formatNotificationMessage(eventType: string, payload: Payload): string {
  return buildTemplate(eventType, payload).text;
}

export function buildCustomerWhatsAppUrl(order: {
  order_number: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_date?: string | null;
}): string {
  const cleanPhone = (order.customer_phone || '').replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const deliveryPart = order.delivery_date
    ? ` Delivery scheduled for ${order.delivery_date}.`
    : '';
  const message = `Hello ${order.customer_name || 'Customer'}, your furniture order #${order.order_number} from Laxmi Wood Craft is ready for dispatch!${deliveryPart} Please let us know if you need any assistance.`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

// ─── Individual Template Builders ────────────────────────────────

function orderCreated(p: Payload): NotificationTemplate {
  const lines = [
    `📋 <b>New Order Created — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `Customer: ${escapeHtml(p.customer_name || 'N/A')}`,
    p.delivery_date ? `Delivery: ${new Date(p.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : null,
    `Owner: ${escapeHtml(p.owner_name || p.actor_name || 'N/A')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ].filter(Boolean);

  return { text: lines.join('\n'), photoUrl: null };
}

function orderConfirmed(p: Payload): NotificationTemplate {
  const lines = [
    `✅ <b>Order Confirmed — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `Entering production on Track ${escapeHtml(p.track || '')}`,
    `First stage: ${stageLabel(p.first_stage || '')}`,
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ];

  return { text: lines.join('\n'), photoUrl: null };
}

function orderHold(p: Payload): NotificationTemplate {
  const lines = [
    `⏸ <b>Order On Hold — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ];

  return { text: lines.join('\n'), photoUrl: null };
}

function orderResume(p: Payload): NotificationTemplate {
  const lines = [
    `▶️ <b>Order Resumed — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ];

  return { text: lines.join('\n'), photoUrl: null };
}

function stageChange(p: Payload): NotificationTemplate {
  const lines = [
    `⚡ <b>Stage Change — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `Item: ${escapeHtml(p.item_name || '')}`,
    `Moved: ${stageLabel(p.from_stage || '')} → ${stageLabel(p.to_stage || '')}`,
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ];

  return { text: lines.join('\n'), photoUrl: p.item_photo_url || null };
}

function itemBlocked(p: Payload): NotificationTemplate {
  const lines = [
    `🚫 <b>Item Blocked — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `Item: ${escapeHtml(p.item_name || '')}`,
    `Reason: ${blockReasonLabel(p.reason || '')}`,
    p.note ? `Note: ${escapeHtml(p.note)}` : null,
    `Blocked by: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ].filter(Boolean);

  return { text: lines.join('\n'), photoUrl: p.item_photo_url || null };
}

function itemUnblocked(p: Payload): NotificationTemplate {
  const blockedDuration = p.blocked_hours
    ? p.blocked_hours >= 24
      ? `${Math.round(p.blocked_hours / 24)} days`
      : `${Math.round(p.blocked_hours)} hours`
    : '';

  const lines = [
    `✅ <b>Item Unblocked — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `Item: ${escapeHtml(p.item_name || '')}`,
    blockedDuration ? `Was blocked for: ${blockedDuration}` : null,
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ].filter(Boolean);

  return { text: lines.join('\n'), photoUrl: p.item_photo_url || null };
}

function paymentRecorded(p: Payload): NotificationTemplate {
  const typeLabel = p.payment_type
    ? p.payment_type.charAt(0).toUpperCase() + p.payment_type.slice(1)
    : '';

  const lines = [
    `💰 <b>Payment Received — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    p.customer_name ? `Customer: ${escapeHtml(p.customer_name)}` : null,
    `Amount: ${formatCurrency(p.amount || 0)} (${typeLabel})`,
    `Recorded by: ${escapeHtml(p.actor_name || 'Unknown')}`,
    p.balance_due !== undefined ? `Balance due: ${formatCurrency(p.balance_due)}` : null,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ].filter(Boolean);

  return { text: lines.join('\n'), photoUrl: null };
}

function qcPassed(p: Payload): NotificationTemplate {
  const lines = [
    `✅ <b>QC Passed — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `Item: ${escapeHtml(p.item_name || '')}`,
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ];

  return { text: lines.join('\n'), photoUrl: p.qc_photo_url || p.item_photo_url || null };
}

function qcFailed(p: Payload): NotificationTemplate {
  const lines = [
    `❌ <b>QC Failed — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `Item: ${escapeHtml(p.item_name || '')}`,
    p.notes ? `Notes: ${escapeHtml(p.notes)}` : null,
    p.returned_to_stage ? `Returned to: ${stageLabel(p.returned_to_stage)}` : null,
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ].filter(Boolean);

  return { text: lines.join('\n'), photoUrl: p.qc_photo_url || p.item_photo_url || null };
}

function itemAdded(p: Payload): NotificationTemplate {
  const lines = [
    `➕ <b>Item Added — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `Item: ${escapeHtml(p.item_name || '')}`,
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ];

  return { text: lines.join('\n'), photoUrl: p.item_photo_url || null };
}

function itemConfirmed(p: Payload): NotificationTemplate {
  const lines = [
    `🏭 <b>Item In Production — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `Item: ${escapeHtml(p.item_name || '')}`,
    `Starting at: ${stageLabel(p.first_stage || '')}`,
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ];

  return { text: lines.join('\n'), photoUrl: p.item_photo_url || null };
}

function ownershipChange(p: Payload): NotificationTemplate {
  const lines = [
    `👤 <b>Owner Changed — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `From: ${escapeHtml(p.from_owner_name || 'Unknown')}`,
    `To: ${escapeHtml(p.to_owner_name || 'Unknown')}`,
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ];

  return { text: lines.join('\n'), photoUrl: null };
}

function deliveryDateChanged(p: Payload): NotificationTemplate {
  const fromDate = p.from ? new Date(p.from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set';
  const toDate = p.to ? new Date(p.to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Removed';

  const lines = [
    `📅 <b>Delivery Date Changed — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `From: ${fromDate}`,
    `To: ${toDate}`,
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ];

  return { text: lines.join('\n'), photoUrl: null };
}

function noteAdded(p: Payload): NotificationTemplate {
  const lines = [
    `📝 <b>Note Added — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `"${escapeHtml(p.content || '')}"`,
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ];

  return { text: lines.join('\n'), photoUrl: null };
}

function orderDispatched(p: Payload): NotificationTemplate {
  const lines = [
    `🚚 <b>Order Dispatched — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    p.customer_name ? `Customer: ${escapeHtml(p.customer_name)}` : null,
    p.item_name ? `Item: ${escapeHtml(p.item_name)}` : null,
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ].filter(Boolean);

  return { text: lines.join('\n'), photoUrl: p.photo_url || null };
}

function orderCompleted(p: Payload): NotificationTemplate {
  const lines = [
    `🎉 <b>Order Completed — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    p.customer_name ? `Customer: ${escapeHtml(p.customer_name)}` : null,
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ].filter(Boolean);

  return { text: lines.join('\n'), photoUrl: null };
}

function orderCancelled(p: Payload): NotificationTemplate {
  const lines = [
    `❌ <b>Order Cancelled — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    p.reason ? `Reason: ${escapeHtml(p.reason)}` : null,
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ].filter(Boolean);

  return { text: lines.join('\n'), photoUrl: null };
}

function genericEvent(eventType: string, p: Payload): NotificationTemplate {
  const label = eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const lines = [
    `📌 <b>${escapeHtml(label)} — #${escapeHtml(p.order_number || '')}</b>`,
    '',
    `By: ${escapeHtml(p.actor_name || 'System')}`,
    '',
    `🔗 <a href="${orderLink(p.order_id)}">View Order</a>`,
  ];

  return { text: lines.join('\n'), photoUrl: null };
}

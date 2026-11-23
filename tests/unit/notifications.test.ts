import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  formatNotificationMessage,
  buildTemplate,
  buildCustomerWhatsAppUrl,
} from '@/lib/notifications/templates';

describe('Notification Utilities & Templates', () => {
  describe('escapeHtml', () => {
    it('escapes all HTML special characters: <, >, &, ", \'', () => {
      const input = '<div class="test" data-val=\'sample\'>Tom & Jerry</div>';
      const expected = '&lt;div class=&quot;test&quot; data-val=&#39;sample&#39;&gt;Tom &amp; Jerry&lt;/div&gt;';
      expect(escapeHtml(input)).toBe(expected);
    });

    it('escapes standalone special characters individually', () => {
      expect(escapeHtml('<')).toBe('&lt;');
      expect(escapeHtml('>')).toBe('&gt;');
      expect(escapeHtml('&')).toBe('&amp;');
      expect(escapeHtml('"')).toBe('&quot;');
      expect(escapeHtml("'")).toBe('&#39;');
    });

    it('returns clean string without modification when no special chars are present', () => {
      expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
    });

    it('handles empty string properly', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('formatNotificationMessage - All 8 Event Types', () => {
    it('formats order_created with placeholders and non-empty output', () => {
      const payload = {
        order_id: 'ord-123',
        order_number: 'ORD-2026-001',
        customer_name: 'John Doe',
        delivery_date: '2026-12-01',
        owner_name: 'Jane Smith',
      };
      const message = formatNotificationMessage('order_created', payload);

      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('New Order Created — #ORD-2026-001');
      expect(message).toContain('Customer: John Doe');
      expect(message).toContain('Owner: Jane Smith');
      expect(message).toContain('View Order');
    });

    it('formats stage_change with placeholders and non-empty output', () => {
      const payload = {
        order_id: 'ord-123',
        order_number: 'ORD-2026-001',
        item_name: 'Oak Dining Table',
        from_stage: 'carpentry',
        to_stage: 'polish',
        actor_name: 'Lead Carpenter',
      };
      const message = formatNotificationMessage('stage_change', payload);

      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('Stage Change — #ORD-2026-001');
      expect(message).toContain('Item: Oak Dining Table');
      expect(message).toContain('Moved:');
      expect(message).toContain('By: Lead Carpenter');
    });

    it('formats qc_result (pass) with placeholders and non-empty output', () => {
      const payload = {
        order_id: 'ord-123',
        order_number: 'ORD-2026-001',
        item_name: 'Oak Dining Table',
        passed: true,
        actor_name: 'QC Inspector A',
      };
      const message = formatNotificationMessage('qc_result', payload);

      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('QC Passed — #ORD-2026-001');
      expect(message).toContain('Item: Oak Dining Table');
      expect(message).toContain('By: QC Inspector A');
    });

    it('formats qc_result (fail) with failure notes and returned stage', () => {
      const payload = {
        order_id: 'ord-123',
        order_number: 'ORD-2026-001',
        item_name: 'Oak Dining Table',
        passed: false,
        notes: 'Surface roughness exceeds tolerance',
        returned_to_stage: 'carpentry',
        actor_name: 'QC Inspector A',
      };
      const message = formatNotificationMessage('qc_result', payload);

      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('QC Failed — #ORD-2026-001');
      expect(message).toContain('Item: Oak Dining Table');
      expect(message).toContain('Notes: Surface roughness exceeds tolerance');
      expect(message).toContain('Returned to:');
      expect(message).toContain('By: QC Inspector A');
    });

    it('formats hold_status (hold) with placeholders and non-empty output', () => {
      const payload = {
        order_id: 'ord-123',
        order_number: 'ORD-2026-001',
        action: 'hold',
        actor_name: 'Plant Manager',
      };
      const message = formatNotificationMessage('hold_status', payload);

      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('Order On Hold — #ORD-2026-001');
      expect(message).toContain('By: Plant Manager');
    });

    it('formats hold_status (resume) with placeholders and non-empty output', () => {
      const payload = {
        order_id: 'ord-123',
        order_number: 'ORD-2026-001',
        action: 'resume',
        actor_name: 'Plant Manager',
      };
      const message = formatNotificationMessage('hold_status', payload);

      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('Order Resumed — #ORD-2026-001');
      expect(message).toContain('By: Plant Manager');
    });

    it('formats payment_recorded with currency, payment type, and balance', () => {
      const payload = {
        order_id: 'ord-123',
        order_number: 'ORD-2026-001',
        customer_name: 'John Doe',
        amount: 25000,
        payment_type: 'advance',
        balance_due: 15000,
        actor_name: 'Finance Desk',
      };
      const message = formatNotificationMessage('payment_recorded', payload);

      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('Payment Received — #ORD-2026-001');
      expect(message).toContain('Customer: John Doe');
      expect(message).toContain('Amount: ₹25,000 (Advance)');
      expect(message).toContain('Balance due: ₹15,000');
      expect(message).toContain('Recorded by: Finance Desk');
    });

    it('formats order_dispatched with placeholders and non-empty output', () => {
      const payload = {
        order_id: 'ord-123',
        order_number: 'ORD-2026-001',
        customer_name: 'John Doe',
        item_name: 'Oak Dining Table',
        actor_name: 'Logistics Desk',
      };
      const message = formatNotificationMessage('order_dispatched', payload);

      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('Order Dispatched — #ORD-2026-001');
      expect(message).toContain('Customer: John Doe');
      expect(message).toContain('Item: Oak Dining Table');
      expect(message).toContain('By: Logistics Desk');
    });

    it('formats order_completed with placeholders and non-empty output', () => {
      const payload = {
        order_id: 'ord-123',
        order_number: 'ORD-2026-001',
        customer_name: 'John Doe',
        actor_name: 'Final Delivery Agent',
      };
      const message = formatNotificationMessage('order_completed', payload);

      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('Order Completed — #ORD-2026-001');
      expect(message).toContain('Customer: John Doe');
      expect(message).toContain('By: Final Delivery Agent');
    });

    it('formats order_cancelled with reason and non-empty output', () => {
      const payload = {
        order_id: 'ord-123',
        order_number: 'ORD-2026-001',
        reason: 'Customer requested cancellation prior to production',
        actor_name: 'Admin Support',
      };
      const message = formatNotificationMessage('order_cancelled', payload);

      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('Order Cancelled — #ORD-2026-001');
      expect(message).toContain('Reason: Customer requested cancellation prior to production');
      expect(message).toContain('By: Admin Support');
    });
  });

  describe('buildTemplate direct return structure', () => {
    it('returns both text and photoUrl for supported templates', () => {
      const template = buildTemplate('stage_change', {
        order_id: 'ord-1',
        order_number: 'ORD-1',
        item_name: 'Chair',
        from_stage: 'carpentry',
        to_stage: 'polish',
        item_photo_url: 'https://example.com/item.jpg',
      });

      expect(template.text).toContain('Stage Change');
      expect(template.photoUrl).toBe('https://example.com/item.jpg');
    });
  });

  describe('buildCustomerWhatsAppUrl', () => {
    it('prepends 91 to a 10-digit phone number', () => {
      const url = buildCustomerWhatsAppUrl({
        order_number: 'ORD-2026-001',
        customer_name: 'John Doe',
        customer_phone: '9876543210',
        delivery_date: '2026-12-01',
      });

      expect(url).toContain('https://wa.me/919876543210?text=');
    });

    it('keeps 12-digit international phone unchanged (e.g. 919876543210)', () => {
      const url = buildCustomerWhatsAppUrl({
        order_number: 'ORD-2026-002',
        customer_name: 'Jane Smith',
        customer_phone: '919876543210',
      });

      expect(url).toContain('https://wa.me/919876543210?text=');
    });

    it('strips non-digit special characters (e.g. +91 (987) 65-43210)', () => {
      const url = buildCustomerWhatsAppUrl({
        order_number: 'ORD-2026-003',
        customer_name: 'Alice',
        customer_phone: '+91 (987) 65-43210',
      });

      expect(url).toContain('https://wa.me/919876543210?text=');
    });

    it('strips special characters from 10-digit phone and prepends 91', () => {
      const url = buildCustomerWhatsAppUrl({
        order_number: 'ORD-2026-004',
        customer_name: 'Bob',
        customer_phone: '(987) 654-3210',
      });

      expect(url).toContain('https://wa.me/919876543210?text=');
    });

    it('constructs valid URL structure and encoded text content with delivery date', () => {
      const url = buildCustomerWhatsAppUrl({
        order_number: 'ORD-100',
        customer_name: 'Rahul Sharma',
        customer_phone: '9876543210',
        delivery_date: '2026-12-10',
      });

      const parsed = new URL(url);
      expect(parsed.origin).toBe('https://wa.me');
      expect(parsed.pathname).toBe('/919876543210');
      const textParam = parsed.searchParams.get('text');
      expect(textParam).toBe(
        'Hello Rahul Sharma, your furniture order #ORD-100 from Laxmi Wood Craft is ready for dispatch! Delivery scheduled for 2026-12-10. Please let us know if you need any assistance.'
      );
    });

    it('defaults customer name to Customer and handles omitted delivery date', () => {
      const url = buildCustomerWhatsAppUrl({
        order_number: 'ORD-200',
        customer_phone: '9876543210',
      });

      const parsed = new URL(url);
      const textParam = parsed.searchParams.get('text');
      expect(textParam).toBe(
        'Hello Customer, your furniture order #ORD-200 from Laxmi Wood Craft is ready for dispatch! Please let us know if you need any assistance.'
      );
    });

    it('handles empty or missing customer phone safely', () => {
      const url = buildCustomerWhatsAppUrl({
        order_number: 'ORD-300',
        customer_phone: null,
      });

      const parsed = new URL(url);
      expect(parsed.origin).toBe('https://wa.me');
      expect(parsed.pathname).toBe('/');
    });
  });
});

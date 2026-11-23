import { describe, it, expect } from 'vitest';
import QRCode from 'qrcode';

describe('Print Job Card QR Code Scan-to-Advance [DIR-01]', () => {
  it('generates the scan-to-advance URL matching specifications', () => {
    const orderId = 'order-123';
    const itemId = 'item-456';
    const appUrl = 'https://app.example.com';

    const qrUrl = `${appUrl}/dashboard/orders/${orderId}?item=${itemId}&action=quick_advance`;

    expect(qrUrl).toBe(
      'https://app.example.com/dashboard/orders/order-123?item=item-456&action=quick_advance'
    );

    const parsed = new URL(qrUrl);
    expect(parsed.pathname).toBe('/dashboard/orders/order-123');
    expect(parsed.searchParams.get('item')).toBe('item-456');
    expect(parsed.searchParams.get('action')).toBe('quick_advance');
  });

  it('generates a valid SVG QR code string with width 72 and target colors', async () => {
    const qrUrl = 'https://app.example.com/dashboard/orders/order-123?item=item-456&action=quick_advance';
    const qrSvg = await QRCode.toString(qrUrl, {
      type: 'svg',
      margin: 1,
      width: 72,
      color: { dark: '#111827', light: '#ffffff' },
    });

    expect(typeof qrSvg).toBe('string');
    expect(qrSvg).toContain('<svg');
    expect(qrSvg).toContain('width="72"');
    expect(qrSvg).toContain('#111827');
  });
});

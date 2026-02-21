import { MOCK_ORDERS, ORDER_STATUS_CONFIG, getTrackingUrl, type OrderStatus } from '../orders';

describe('Order data model', () => {
  describe('MOCK_ORDERS', () => {
    it('has 4 mock orders', () => {
      expect(MOCK_ORDERS).toHaveLength(4);
    });

    it('each order has required fields', () => {
      for (const order of MOCK_ORDERS) {
        expect(order.id).toBeTruthy();
        expect(order.orderNumber).toBeTruthy();
        expect(order.status).toBeTruthy();
        expect(order.createdAt).toBeTruthy();
        expect(order.items.length).toBeGreaterThan(0);
        expect(order.total).toBeGreaterThan(0);
        expect(order.shippingAddress.name).toBeTruthy();
        expect(order.paymentMethod).toBeTruthy();
      }
    });

    it('totals are consistent (subtotal + shipping + tax = total)', () => {
      for (const order of MOCK_ORDERS) {
        const computed = order.subtotal + order.shipping + order.tax;
        expect(computed).toBeCloseTo(order.total, 2);
      }
    });

    it('line totals match quantity * unitPrice', () => {
      for (const order of MOCK_ORDERS) {
        for (const item of order.items) {
          expect(item.lineTotal).toBe(item.unitPrice * item.quantity);
        }
      }
    });

    it('covers all four statuses', () => {
      const statuses = new Set(MOCK_ORDERS.map((o) => o.status));
      expect(statuses.has('processing')).toBe(true);
      expect(statuses.has('shipped')).toBe(true);
      expect(statuses.has('delivered')).toBe(true);
      expect(statuses.has('cancelled')).toBe(true);
    });
  });

  describe('ORDER_STATUS_CONFIG', () => {
    it('has config for all statuses', () => {
      const statuses: OrderStatus[] = ['processing', 'shipped', 'delivered', 'cancelled'];
      for (const s of statuses) {
        expect(ORDER_STATUS_CONFIG[s].label).toBeTruthy();
        expect(ORDER_STATUS_CONFIG[s].colorToken).toBeTruthy();
      }
    });
  });

  describe('getTrackingUrl', () => {
    it('returns UPS tracking URL', () => {
      const url = getTrackingUrl('UPS', '1Z123');
      expect(url).toBe('https://www.ups.com/track?tracknum=1Z123');
    });

    it('returns FedEx tracking URL', () => {
      const url = getTrackingUrl('FedEx', '794644');
      expect(url).toBe('https://www.fedex.com/fedextrack/?trknbr=794644');
    });

    it('returns USPS tracking URL', () => {
      const url = getTrackingUrl('USPS', '9400111');
      expect(url).toBe('https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111');
    });

    it('returns empty string for unknown carrier', () => {
      expect(getTrackingUrl('DHL', '123')).toBe('');
    });

    it('is case-insensitive', () => {
      expect(getTrackingUrl('ups', '123')).toContain('ups.com');
      expect(getTrackingUrl('fedex', '123')).toContain('fedex.com');
    });
  });
});

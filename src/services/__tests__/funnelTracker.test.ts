import {
  startFunnelTracking,
  getFunnelReport,
  getAllFunnelReports,
  isTracking,
  resetFunnelTracking,
} from '../funnelTracker';
import { trackEvent, clearEventBuffer } from '../analytics';

beforeEach(() => {
  resetFunnelTracking();
  clearEventBuffer();
});

describe('funnelTracker', () => {
  describe('startFunnelTracking', () => {
    it('initializes tracking state', () => {
      expect(isTracking()).toBe(false);
      startFunnelTracking();
      expect(isTracking()).toBe(true);
    });

    it('does not re-initialize if already tracking', () => {
      startFunnelTracking();
      // Second call should be a no-op
      startFunnelTracking();
      expect(isTracking()).toBe(true);
    });
  });

  describe('getFunnelReport', () => {
    beforeEach(() => {
      startFunnelTracking();
    });

    it('returns null for unknown funnel', () => {
      expect(getFunnelReport('nonexistent')).toBeNull();
    });

    it('tracks purchase funnel progression', () => {
      trackEvent('view_product', { product_id: 'futon-1', source: 'shop' });
      trackEvent('add_to_cart', { product_id: 'futon-1', price: 349, quantity: 1 });

      const report = getFunnelReport('purchase');
      expect(report).not.toBeNull();
      expect(report!.steps[0].reached).toBe(true); // view_product
      expect(report!.steps[0].count).toBe(1);
      expect(report!.steps[1].reached).toBe(true); // add_to_cart
      expect(report!.steps[2].reached).toBe(false); // begin_checkout
      expect(report!.steps[3].reached).toBe(false); // purchase
      expect(report!.currentStep).toBe(1);
      expect(report!.dropOffStep).toBe(2);
    });

    it('tracks full purchase funnel completion', () => {
      trackEvent('view_product', { product_id: 'futon-1', source: 'shop' });
      trackEvent('add_to_cart', { product_id: 'futon-1', price: 349, quantity: 1 });
      trackEvent('begin_checkout', { item_count: 1, subtotal: 349 });
      trackEvent('purchase', { order_id: 'ord-1', total: 349, item_count: 1 });

      const report = getFunnelReport('purchase');
      expect(report!.steps.every((s) => s.reached)).toBe(true);
      expect(report!.completionRate).toBe(1); // 1 entry, 1 completion
      expect(report!.currentStep).toBe(3); // last step
      expect(report!.dropOffStep).toBeUndefined();
    });

    it('tracks AR-to-purchase funnel', () => {
      trackEvent('open_ar', { product_id: 'futon-1' });
      trackEvent('ar_furniture_placed', { model_id: 'model-1', plane_id: 'plane-1' });

      const report = getFunnelReport('ar_to_purchase');
      expect(report!.steps[0].reached).toBe(true); // open_ar
      expect(report!.steps[1].reached).toBe(true); // ar_furniture_placed
      expect(report!.steps[2].reached).toBe(false); // ar_add_to_cart
      expect(report!.currentStep).toBe(1);
    });

    it('calculates completion rate correctly', () => {
      // Two entries, one completion
      trackEvent('view_product', { product_id: 'f1', source: 'shop' });
      trackEvent('view_product', { product_id: 'f2', source: 'shop' });
      trackEvent('add_to_cart', { product_id: 'f1', price: 349, quantity: 1 });
      trackEvent('begin_checkout', {});
      trackEvent('purchase', { order_id: 'o1', total: 349, item_count: 1 });

      const report = getFunnelReport('purchase');
      expect(report!.entries).toBe(2); // two view_product events
      expect(report!.completionRate).toBe(0.5); // 1 purchase / 2 entries
    });

    it('records firstReachedAt timestamps', () => {
      const beforeTime = Date.now();
      trackEvent('view_product', { product_id: 'f1', source: 'shop' });

      const report = getFunnelReport('purchase');
      expect(report!.steps[0].firstReachedAt).toBeDefined();
      expect(report!.steps[0].firstReachedAt!).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('getAllFunnelReports', () => {
    it('returns reports for all defined funnels', () => {
      startFunnelTracking();
      const reports = getAllFunnelReports();
      expect(reports).toHaveLength(4); // purchase, ar_to_purchase, browse, wishlist
      expect(reports.map((r) => r.id)).toEqual([
        'purchase',
        'ar_to_purchase',
        'browse',
        'wishlist',
      ]);
    });
  });

  describe('resetFunnelTracking', () => {
    it('clears all tracking state', () => {
      startFunnelTracking();
      trackEvent('view_product', { product_id: 'f1', source: 'shop' });

      resetFunnelTracking();
      clearEventBuffer();
      expect(isTracking()).toBe(false);

      // After reset and restart, state should be fresh
      startFunnelTracking();
      const report = getFunnelReport('purchase');
      expect(report!.steps[0].count).toBe(0);
    });
  });
});

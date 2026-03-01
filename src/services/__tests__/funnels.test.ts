import { trackFunnelStep, funnelEvents, FUNNELS } from '../funnels';
import { getEventBuffer, clearEventBuffer, setEnabled } from '../analytics';

beforeEach(() => {
  clearEventBuffer();
  setEnabled(true);
});

describe('funnels', () => {
  describe('FUNNELS definitions', () => {
    it('defines purchase funnel with 4 steps', () => {
      expect(FUNNELS.purchase.steps).toHaveLength(4);
      expect(FUNNELS.purchase.id).toBe('purchase_funnel');
    });

    it('defines AR to purchase funnel with 5 steps', () => {
      expect(FUNNELS.arToPurchase.steps).toHaveLength(5);
      expect(FUNNELS.arToPurchase.id).toBe('ar_to_purchase_funnel');
    });

    it('defines browse to purchase funnel with 4 steps', () => {
      expect(FUNNELS.browseToPurchase.steps).toHaveLength(4);
    });

    it('defines wishlist conversion funnel with 4 steps', () => {
      expect(FUNNELS.wishlistConversion.steps).toHaveLength(4);
    });
  });

  describe('trackFunnelStep', () => {
    it('attaches funnel metadata to events', () => {
      trackFunnelStep('purchase_funnel', 'view_product', { product_id: 'abc' });
      const buffer = getEventBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].name).toBe('view_product');
      expect(buffer[0].properties).toEqual({
        product_id: 'abc',
        funnel_id: 'purchase_funnel',
        funnel_name: 'Purchase Funnel',
        funnel_step: 1,
        funnel_step_name: 'View Product',
        funnel_total_steps: 4,
      });
    });

    it('tracks correct step number for later steps', () => {
      trackFunnelStep('purchase_funnel', 'purchase', { order_id: 'ord-1' });
      const buffer = getEventBuffer();
      expect(buffer[0].properties).toMatchObject({
        funnel_step: 4,
        funnel_step_name: 'Purchase',
      });
    });

    it('ignores unknown funnel IDs', () => {
      trackFunnelStep('nonexistent_funnel', 'add_to_cart');
      expect(getEventBuffer()).toHaveLength(0);
    });

    it('ignores events not in the funnel', () => {
      trackFunnelStep('purchase_funnel', 'search');
      expect(getEventBuffer()).toHaveLength(0);
    });
  });

  describe('funnelEvents convenience helpers', () => {
    it('purchaseStep tracks with purchase funnel context', () => {
      funnelEvents.purchaseStep('add_to_cart', { product_id: 'p1' });
      const ev = getEventBuffer()[0];
      expect(ev.properties).toMatchObject({
        funnel_id: 'purchase_funnel',
        funnel_step: 2,
      });
    });

    it('arPurchaseStep tracks with AR funnel context', () => {
      funnelEvents.arPurchaseStep('open_ar', { product_id: 'p1' });
      const ev = getEventBuffer()[0];
      expect(ev.properties).toMatchObject({
        funnel_id: 'ar_to_purchase_funnel',
        funnel_step: 1,
      });
    });

    it('browseStep tracks with browse funnel context', () => {
      funnelEvents.browseStep('search', { query: 'futon' });
      const ev = getEventBuffer()[0];
      expect(ev.properties).toMatchObject({
        funnel_id: 'browse_to_purchase_funnel',
        funnel_step: 1,
      });
    });

    it('wishlistStep tracks with wishlist funnel context', () => {
      funnelEvents.wishlistStep('add_to_wishlist', { product_id: 'p1' });
      const ev = getEventBuffer()[0];
      expect(ev.properties).toMatchObject({
        funnel_id: 'wishlist_conversion_funnel',
        funnel_step: 1,
      });
    });
  });
});

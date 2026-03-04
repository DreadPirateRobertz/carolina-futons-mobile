import {
  purchaseFunnel,
  arToPurchaseFunnel,
  browseFunnel,
  wishlistFunnel,
  allFunnels,
} from '../funnels';

describe('funnels', () => {
  it('purchaseFunnel has 4 steps ending with purchase', () => {
    expect(purchaseFunnel.id).toBe('purchase');
    expect(purchaseFunnel.steps).toHaveLength(4);
    expect(purchaseFunnel.steps[0].event).toBe('view_product');
    expect(purchaseFunnel.steps[3].event).toBe('purchase');
  });

  it('arToPurchaseFunnel has 5 steps starting with open_ar', () => {
    expect(arToPurchaseFunnel.id).toBe('ar_to_purchase');
    expect(arToPurchaseFunnel.steps).toHaveLength(5);
    expect(arToPurchaseFunnel.steps[0].event).toBe('open_ar');
    expect(arToPurchaseFunnel.steps[4].event).toBe('purchase');
  });

  it('browseFunnel has 4 steps starting with search', () => {
    expect(browseFunnel.id).toBe('browse');
    expect(browseFunnel.steps).toHaveLength(4);
    expect(browseFunnel.steps[0].event).toBe('search');
  });

  it('wishlistFunnel has 4 steps including add_to_wishlist', () => {
    expect(wishlistFunnel.id).toBe('wishlist');
    expect(wishlistFunnel.steps).toHaveLength(4);
    expect(wishlistFunnel.steps[1].event).toBe('add_to_wishlist');
  });

  it('allFunnels contains all 4 funnels', () => {
    expect(allFunnels).toHaveLength(4);
    const ids = allFunnels.map((f) => f.id);
    expect(ids).toEqual(['purchase', 'ar_to_purchase', 'browse', 'wishlist']);
  });

  it('every funnel has unique id, name, and description', () => {
    const ids = new Set(allFunnels.map((f) => f.id));
    const names = new Set(allFunnels.map((f) => f.name));
    expect(ids.size).toBe(allFunnels.length);
    expect(names.size).toBe(allFunnels.length);
    for (const f of allFunnels) {
      expect(f.description.length).toBeGreaterThan(0);
    }
  });

  it('every step has name and valid event', () => {
    for (const funnel of allFunnels) {
      for (const step of funnel.steps) {
        expect(step.name.length).toBeGreaterThan(0);
        expect(typeof step.event).toBe('string');
      }
    }
  });
});

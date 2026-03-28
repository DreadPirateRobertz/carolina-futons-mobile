/**
 * @module funnelActivation.test
 *
 * Integration test: verifies startFunnelTracking is called at app init
 * and that the full purchase funnel fires in sequence when analytics
 * events occur in order.
 *
 * cfutons_mobile-5vs
 */

import {
  startFunnelTracking,
  getFunnelReport,
  resetFunnelTracking,
  isTracking,
} from '../funnelTracker';
import { trackEvent, clearEventBuffer } from '../analytics';

beforeEach(() => {
  resetFunnelTracking();
  clearEventBuffer();
});

describe('funnel activation (cfutons_mobile-5vs)', () => {
  it('startFunnelTracking activates tracking', () => {
    expect(isTracking()).toBe(false);
    startFunnelTracking();
    expect(isTracking()).toBe(true);
  });

  it('purchase funnel fires in correct sequence: PDP → cart → checkout → purchase', () => {
    startFunnelTracking();

    // Step 1: View product (PDP)
    trackEvent('view_product', { product_id: 'asheville-full', source: 'product_detail' });

    let report = getFunnelReport('purchase')!;
    expect(report.entries).toBe(1);
    expect(report.steps[0].reached).toBe(true);
    expect(report.steps[1].reached).toBe(false);
    expect(report.dropOffStep).toBe(1);

    // Step 2: Add to cart
    trackEvent('add_to_cart', { product_id: 'asheville-full', price: 349, quantity: 1 });

    report = getFunnelReport('purchase')!;
    expect(report.steps[1].reached).toBe(true);
    expect(report.steps[2].reached).toBe(false);
    expect(report.dropOffStep).toBe(2);

    // Step 3: Begin checkout
    trackEvent('begin_checkout', { item_count: 1, subtotal: 349 });

    report = getFunnelReport('purchase')!;
    expect(report.steps[2].reached).toBe(true);
    expect(report.steps[3].reached).toBe(false);
    expect(report.dropOffStep).toBe(3);

    // Step 4: Purchase
    trackEvent('purchase', { order_id: 'ord-123', total: 349, item_count: 1 });

    report = getFunnelReport('purchase')!;
    expect(report.steps.every((s) => s.reached)).toBe(true);
    expect(report.completionRate).toBe(1);
    expect(report.dropOffStep).toBeUndefined();
  });

  it('captures drop-off when user abandons at cart (never checks out)', () => {
    startFunnelTracking();

    trackEvent('view_product', { product_id: 'asheville-full', source: 'product_detail' });
    trackEvent('add_to_cart', { product_id: 'asheville-full', price: 349, quantity: 1 });
    // User navigates away — no begin_checkout or purchase

    const report = getFunnelReport('purchase')!;
    expect(report.entries).toBe(1);
    expect(report.currentStep).toBe(1); // add_to_cart
    expect(report.dropOffStep).toBe(2); // begin_checkout never reached
    expect(report.completionRate).toBe(0);
  });

  it('captures drop-off when user abandons at checkout (never completes purchase)', () => {
    startFunnelTracking();

    trackEvent('view_product', { product_id: 'asheville-full', source: 'product_detail' });
    trackEvent('add_to_cart', { product_id: 'asheville-full', price: 349, quantity: 1 });
    trackEvent('begin_checkout', { item_count: 1, subtotal: 349 });
    // User abandons checkout — no purchase

    const report = getFunnelReport('purchase')!;
    expect(report.currentStep).toBe(2); // begin_checkout
    expect(report.dropOffStep).toBe(3); // purchase never reached
    expect(report.completionRate).toBe(0);
  });

  it('tracks multiple funnel entries with partial completion', () => {
    startFunnelTracking();

    // User 1: views + adds to cart + purchases
    trackEvent('view_product', { product_id: 'f1', source: 'shop' });
    trackEvent('add_to_cart', { product_id: 'f1', price: 349, quantity: 1 });
    trackEvent('begin_checkout', { item_count: 1, subtotal: 349 });
    trackEvent('purchase', { order_id: 'o1', total: 349, item_count: 1 });

    // User 2 (same session): views but doesn't buy
    trackEvent('view_product', { product_id: 'f2', source: 'shop' });

    const report = getFunnelReport('purchase')!;
    expect(report.entries).toBe(2);
    expect(report.completionRate).toBe(0.5); // 1 of 2 completed
  });

  it('does not track events when startFunnelTracking was never called', () => {
    // No startFunnelTracking() call
    trackEvent('view_product', { product_id: 'f1', source: 'shop' });

    expect(isTracking()).toBe(false);
    expect(getFunnelReport('purchase')).toBeNull();
  });
});

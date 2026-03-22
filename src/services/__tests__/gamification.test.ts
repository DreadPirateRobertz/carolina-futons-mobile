/**
 * Tests for gamification event emitter — cm-sxw.
 *
 * Covers all 3 event paths + hasPhoto variants.
 */
import { addToCart, submitReview, referralShared } from '../gamification';
import { getEventBuffer, clearEventBuffer } from '@/services/analytics';

beforeEach(() => {
  clearEventBuffer();
});

describe('addToCart', () => {
  it('fires gamification_add_to_cart event', () => {
    addToCart('prod-123', 349);
    const events = getEventBuffer().filter((e) => e.name === 'gamification_add_to_cart');
    expect(events).toHaveLength(1);
  });

  it('includes product_id and price', () => {
    addToCart('futon-xl', 599.99);
    const ev = getEventBuffer().find((e) => e.name === 'gamification_add_to_cart');
    expect(ev?.properties?.product_id).toBe('futon-xl');
    expect(ev?.properties?.price).toBe(599.99);
  });

  it('handles zero price', () => {
    addToCart('sample', 0);
    const ev = getEventBuffer().find((e) => e.name === 'gamification_add_to_cart');
    expect(ev?.properties?.price).toBe(0);
  });
});

describe('submitReview', () => {
  it('fires gamification_submit_review with hasPhoto=true when photo present', () => {
    submitReview('prod-abc', 5, true);
    const ev = getEventBuffer().find((e) => e.name === 'gamification_submit_review');
    expect(ev).toBeDefined();
    expect(ev?.properties?.has_photo).toBe(true);
  });

  it('fires gamification_submit_review with hasPhoto=false when no photo', () => {
    submitReview('prod-abc', 4, false);
    const ev = getEventBuffer().find((e) => e.name === 'gamification_submit_review');
    expect(ev).toBeDefined();
    expect(ev?.properties?.has_photo).toBe(false);
  });

  it('includes product_id and rating', () => {
    submitReview('futon-queen', 3, false);
    const ev = getEventBuffer().find((e) => e.name === 'gamification_submit_review');
    expect(ev?.properties?.product_id).toBe('futon-queen');
    expect(ev?.properties?.rating).toBe(3);
  });
});

describe('referralShared', () => {
  it('fires gamification_referral_shared event', () => {
    referralShared('FUTON-XK7P');
    const events = getEventBuffer().filter((e) => e.name === 'gamification_referral_shared');
    expect(events).toHaveLength(1);
  });

  it('includes the referral code', () => {
    referralShared('CAMP-A1B2');
    const ev = getEventBuffer().find((e) => e.name === 'gamification_referral_shared');
    expect(ev?.properties?.referral_code).toBe('CAMP-A1B2');
  });
});

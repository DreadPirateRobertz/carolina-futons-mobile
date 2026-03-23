/**
 * Tests for gamification event emitter — cm-sxw.
 *
 * Covers all event paths, hasPhoto variants, and rate limit guard (hq-74nry).
 */
import { addToCart, submitReview, referralShared, arUsed, wishlistAdd } from '../gamification';
import { getEventBuffer, clearEventBuffer } from '@/services/analytics';
import { gamificationRateLimiter } from '@/utils/gamificationRateLimit';

beforeEach(() => {
  jest.useFakeTimers();
  clearEventBuffer();
  gamificationRateLimiter.reset();
});

afterEach(() => {
  jest.useRealTimers();
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

// Phase 4 events — cm-b7zsx
describe('arUsed', () => {
  it('fires gamification_ar_used event', () => {
    arUsed('prod-asheville');
    const events = getEventBuffer().filter((e) => e.name === 'gamification_ar_used');
    expect(events).toHaveLength(1);
  });

  it('includes product_id', () => {
    arUsed('futon-queen');
    const ev = getEventBuffer().find((e) => e.name === 'gamification_ar_used');
    expect(ev?.properties?.product_id).toBe('futon-queen');
  });
});

describe('wishlistAdd', () => {
  it('fires gamification_wishlist_add event after debounce delay', () => {
    wishlistAdd('prod-123');
    jest.advanceTimersByTime(300);
    const events = getEventBuffer().filter((e) => e.name === 'gamification_wishlist_add');
    expect(events).toHaveLength(1);
  });

  it('collapses rapid wishlistAdd calls into a single event', () => {
    wishlistAdd('prod-123');
    wishlistAdd('prod-123');
    wishlistAdd('prod-123');
    jest.advanceTimersByTime(300);
    const events = getEventBuffer().filter((e) => e.name === 'gamification_wishlist_add');
    expect(events).toHaveLength(1);
  });

  it('includes product_id', () => {
    wishlistAdd('blue-ridge');
    jest.advanceTimersByTime(300);
    const ev = getEventBuffer().find((e) => e.name === 'gamification_wishlist_add');
    expect(ev?.properties?.product_id).toBe('blue-ridge');
  });
});

// ── Rate limit guard (hq-74nry) ────────────────────────────────────────
describe('rate limit guard', () => {
  it('drops addToCart when rolling window is exhausted', () => {
    for (let i = 0; i < 20; i++) {
      gamificationRateLimiter.recordEmission();
    }
    addToCart('prod-x', 100);
    const events = getEventBuffer().filter((e) => e.name === 'gamification_add_to_cart');
    expect(events).toHaveLength(0);
  });

  it('drops submitReview when at limit', () => {
    for (let i = 0; i < 20; i++) {
      gamificationRateLimiter.recordEmission();
    }
    submitReview('prod-x', 5, false);
    const events = getEventBuffer().filter((e) => e.name === 'gamification_submit_review');
    expect(events).toHaveLength(0);
  });

  it('drops referralShared when at limit', () => {
    for (let i = 0; i < 20; i++) {
      gamificationRateLimiter.recordEmission();
    }
    referralShared('CODE-XYZ');
    const events = getEventBuffer().filter((e) => e.name === 'gamification_referral_shared');
    expect(events).toHaveLength(0);
  });

  it('drops arUsed when at limit', () => {
    for (let i = 0; i < 20; i++) {
      gamificationRateLimiter.recordEmission();
    }
    arUsed('prod-x');
    const events = getEventBuffer().filter((e) => e.name === 'gamification_ar_used');
    expect(events).toHaveLength(0);
  });

  it('allows events again after window expires', () => {
    for (let i = 0; i < 20; i++) {
      gamificationRateLimiter.recordEmission();
    }
    jest.advanceTimersByTime(61_000);
    addToCart('prod-x', 100);
    const events = getEventBuffer().filter((e) => e.name === 'gamification_add_to_cart');
    expect(events).toHaveLength(1);
  });

  it('drops debounced wishlistAdd when at limit at time of fire', () => {
    wishlistAdd('prod-x');
    // Fill up window before debounce fires
    for (let i = 0; i < 20; i++) {
      gamificationRateLimiter.recordEmission();
    }
    jest.advanceTimersByTime(300);
    const events = getEventBuffer().filter((e) => e.name === 'gamification_wishlist_add');
    expect(events).toHaveLength(0);
  });
});

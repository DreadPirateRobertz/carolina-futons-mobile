/**
 * gamificationRateLimit TDD tests — hq-74nry
 *
 * Tests written BEFORE implementation per CLAUDE.md mandate.
 * Client-side guard: rolling 60s window cap (20 max) + per-event debounce.
 */

import { GamificationRateLimiter, createGamificationRateLimiter } from '../gamificationRateLimit';

describe('GamificationRateLimiter', () => {
  let limiter: GamificationRateLimiter;

  beforeEach(() => {
    jest.useFakeTimers();
    limiter = createGamificationRateLimiter();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── canEmit (rolling window) ────────────────────────────────────────

  it('allows emission when window is empty', () => {
    expect(limiter.canEmit()).toBe(true);
  });

  it('allows up to 20 events in 60 seconds', () => {
    for (let i = 0; i < 20; i++) {
      expect(limiter.canEmit()).toBe(true);
      limiter.recordEmission();
    }
  });

  it('blocks the 21st event in a 60s window', () => {
    for (let i = 0; i < 20; i++) {
      limiter.recordEmission();
    }
    expect(limiter.canEmit()).toBe(false);
  });

  it('allows emission again after oldest event expires (>60s)', () => {
    for (let i = 0; i < 20; i++) {
      limiter.recordEmission();
    }
    expect(limiter.canEmit()).toBe(false);

    // Advance 61 seconds — all entries expire
    jest.advanceTimersByTime(61_000);
    expect(limiter.canEmit()).toBe(true);
  });

  it('allows a new event when only the oldest slot expires', () => {
    // Record 20 events spread over time so only 1 expires
    limiter.recordEmission();
    jest.advanceTimersByTime(61_000); // first event now expires
    for (let i = 0; i < 19; i++) {
      limiter.recordEmission();
    }
    // 19 fresh + 1 expired = 19 active → can emit
    expect(limiter.canEmit()).toBe(true);
    limiter.recordEmission(); // now 20
    expect(limiter.canEmit()).toBe(false);
  });

  it('counts all events regardless of event name (global cap)', () => {
    for (let i = 0; i < 20; i++) {
      limiter.recordEmission();
    }
    // Even a different "type" is blocked
    expect(limiter.canEmit()).toBe(false);
  });

  // ── debounce ────────────────────────────────────────────────────────

  it('debounce calls fn after delay', () => {
    const fn = jest.fn();
    limiter.debounce('wishlist_add', fn, 300);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('debounce collapses rapid calls — only last fires', () => {
    const fn = jest.fn();
    limiter.debounce('wishlist_add', fn, 300);
    limiter.debounce('wishlist_add', fn, 300);
    limiter.debounce('wishlist_add', fn, 300);
    jest.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('debounce keys are independent — different events do not interfere', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    limiter.debounce('wishlist_add', fn1, 300);
    limiter.debounce('ar_used', fn2, 300);
    jest.advanceTimersByTime(300);
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('debounce resets timer on each call within window', () => {
    const fn = jest.fn();
    limiter.debounce('wishlist_add', fn, 300);
    jest.advanceTimersByTime(200);
    limiter.debounce('wishlist_add', fn, 300); // resets
    jest.advanceTimersByTime(200); // only 200ms since last call — not yet fired
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100); // now 300ms from last call
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // ── reset (for testing / logout) ────────────────────────────────────

  it('reset clears all recorded emissions', () => {
    for (let i = 0; i < 20; i++) {
      limiter.recordEmission();
    }
    expect(limiter.canEmit()).toBe(false);
    limiter.reset();
    expect(limiter.canEmit()).toBe(true);
  });
});

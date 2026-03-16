import { calculateShipping } from '../shippingService';

describe('calculateShipping', () => {
  it('returns free shipping for orders >= $499', async () => {
    const result = await calculateShipping({
      subtotal: 499,
      shippingZip: '28202',
      isPremium: false,
    });

    expect(result.shippingCost).toBe(0);
    expect(result.freeShippingApplied).toBe(true);
    expect(result.freeShippingReason).toBe('threshold');
  });

  it('returns free shipping for premium members regardless of subtotal', async () => {
    const result = await calculateShipping({
      subtotal: 100,
      shippingZip: '28202',
      isPremium: true,
    });

    expect(result.shippingCost).toBe(0);
    expect(result.freeShippingApplied).toBe(true);
    expect(result.freeShippingReason).toBe('premium');
  });

  it('returns flat rate when subtotal < $499 and not premium', async () => {
    const result = await calculateShipping({
      subtotal: 200,
      shippingZip: '28202',
      isPremium: false,
    });

    expect(result.shippingCost).toBe(49.99);
    expect(result.freeShippingApplied).toBe(false);
    expect(result.fallback).toBe(true);
  });

  it('returns estimated delivery days', async () => {
    const result = await calculateShipping({
      subtotal: 200,
      shippingZip: '28202',
      isPremium: false,
    });

    expect(result.estimatedDays).toBeGreaterThan(0);
  });

  it('handles exactly at threshold boundary', async () => {
    const below = await calculateShipping({
      subtotal: 498.99,
      shippingZip: '28202',
      isPremium: false,
    });
    const at = await calculateShipping({
      subtotal: 499,
      shippingZip: '28202',
      isPremium: false,
    });

    expect(below.shippingCost).toBe(49.99);
    expect(at.shippingCost).toBe(0);
  });

  it('premium + above threshold still reports premium as reason', async () => {
    const result = await calculateShipping({
      subtotal: 1000,
      shippingZip: '28202',
      isPremium: true,
    });

    expect(result.shippingCost).toBe(0);
    expect(result.freeShippingReason).toBe('premium');
  });

  it('handles zero subtotal for non-premium', async () => {
    const result = await calculateShipping({
      subtotal: 0,
      shippingZip: '28202',
      isPremium: false,
    });

    expect(result.shippingCost).toBe(49.99);
    expect(result.freeShippingApplied).toBe(false);
  });
});

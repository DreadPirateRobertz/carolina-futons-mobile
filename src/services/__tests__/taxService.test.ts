import { calculateTax } from '../taxService';

describe('calculateTax', () => {
  it('calculates tax for NC address (7% state rate)', async () => {
    const result = await calculateTax({
      subtotal: 499,
      shippingAddress: { state: 'NC', zip: '28202', country: 'US' },
    });

    expect(result.taxAmount).toBeCloseTo(34.93, 2);
    expect(result.taxRate).toBeCloseTo(0.07, 2);
    expect(result.jurisdiction).toBe('NC');
  });

  it('returns zero tax for tax-free states', async () => {
    const taxFreeStates = ['OR', 'MT', 'NH', 'DE', 'AK'];

    for (const state of taxFreeStates) {
      const result = await calculateTax({
        subtotal: 499,
        shippingAddress: { state, zip: '00000', country: 'US' },
      });

      expect(result.taxAmount).toBe(0);
      expect(result.taxRate).toBe(0);
      expect(result.jurisdiction).toBe(state);
    }
  });

  it('includes all expected fields in result', async () => {
    const result = await calculateTax({
      subtotal: 1000,
      shippingAddress: { state: 'NC', zip: '28202', country: 'US' },
    });

    expect(result).toHaveProperty('taxAmount');
    expect(result).toHaveProperty('taxRate');
    expect(result).toHaveProperty('jurisdiction');
    expect(result).toHaveProperty('fallback');
    expect(typeof result.taxAmount).toBe('number');
  });

  it('uses fallback rate for known states', async () => {
    const result = await calculateTax({
      subtotal: 100,
      shippingAddress: { state: 'TX', zip: '75001', country: 'US' },
    });

    expect(result.taxRate).toBeCloseTo(0.0625, 4);
    expect(result.taxAmount).toBeCloseTo(6.25, 2);
    expect(result.fallback).toBe(true);
  });

  it('uses default 7% rate for unknown states', async () => {
    const result = await calculateTax({
      subtotal: 100,
      shippingAddress: { state: 'ZZ', zip: '00000', country: 'US' },
    });

    expect(result.taxRate).toBeCloseTo(0.07, 2);
    expect(result.taxAmount).toBeCloseTo(7.0, 2);
    expect(result.fallback).toBe(true);
  });

  it('handles case-insensitive state codes', async () => {
    const result = await calculateTax({
      subtotal: 100,
      shippingAddress: { state: 'nc', zip: '28202', country: 'US' },
    });

    expect(result.taxRate).toBeCloseTo(0.07, 2);
    expect(result.jurisdiction).toBe('NC');
  });

  it('handles zero subtotal', async () => {
    const result = await calculateTax({
      subtotal: 0,
      shippingAddress: { state: 'NC', zip: '28202', country: 'US' },
    });

    expect(result.taxAmount).toBe(0);
  });

  it('rounds tax amount to 2 decimal places', async () => {
    // 333 * 0.07 = 23.31 exactly
    const result = await calculateTax({
      subtotal: 333,
      shippingAddress: { state: 'NC', zip: '28202', country: 'US' },
    });

    const decimals = result.taxAmount.toString().split('.')[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

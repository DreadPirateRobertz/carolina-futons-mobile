import { calculateCheckoutTotals } from '../payment';

import { calculateTax } from '../taxService';
import { calculateShipping } from '../shippingService';

// Mock the tax and shipping services
jest.mock('../taxService', () => ({
  calculateTax: jest.fn(),
}));
jest.mock('../shippingService', () => ({
  calculateShipping: jest.fn(),
}));

const mockCalculateTax = calculateTax as jest.MockedFunction<typeof calculateTax>;
const mockCalculateShipping = calculateShipping as jest.MockedFunction<typeof calculateShipping>;

beforeEach(() => {
  jest.clearAllMocks();

  mockCalculateTax.mockResolvedValue({
    taxAmount: 34.93,
    taxRate: 0.07,
    jurisdiction: 'NC',
    fallback: true,
  });

  mockCalculateShipping.mockResolvedValue({
    shippingCost: 0,
    freeShippingApplied: true,
    freeShippingReason: 'threshold',
    fallback: false,
    estimatedDays: 5,
    deliveryTier: 'parcel',
  });
});

describe('calculateCheckoutTotals', () => {
  const address = { state: 'NC', zip: '28202', country: 'US' };

  it('combines tax and shipping into totals', async () => {
    const result = await calculateCheckoutTotals(499, false, address);

    expect(result.subtotal).toBe(499);
    expect(result.tax).toBeCloseTo(34.93, 2);
    expect(result.shipping).toBe(0);
    expect(result.total).toBeCloseTo(533.93, 2);
  });

  it('includes tax jurisdiction', async () => {
    const result = await calculateCheckoutTotals(499, false, address);
    expect(result.taxJurisdiction).toBe('NC');
  });

  it('includes free shipping flag', async () => {
    const result = await calculateCheckoutTotals(499, false, address);
    expect(result.freeShippingApplied).toBe(true);
  });

  it('passes isPremium to shipping service', async () => {
    await calculateCheckoutTotals(100, true, address);
    expect(mockCalculateShipping).toHaveBeenCalledWith({
      subtotal: 100,
      shippingZip: '28202',
      isPremium: true,
      itemWeightLbs: 0,
    });
  });

  it('passes address to tax service', async () => {
    await calculateCheckoutTotals(499, false, address);
    expect(mockCalculateTax).toHaveBeenCalledWith({
      subtotal: 499,
      shippingAddress: address,
    });
  });

  it('calls tax and shipping in parallel', async () => {
    // Both should be called (we can't directly verify parallelism but can verify both are invoked)
    await calculateCheckoutTotals(499, false, address);
    expect(mockCalculateTax).toHaveBeenCalledTimes(1);
    expect(mockCalculateShipping).toHaveBeenCalledTimes(1);
  });

  it('computes total correctly with non-zero shipping', async () => {
    mockCalculateShipping.mockResolvedValue({
      shippingCost: 49.99,
      freeShippingApplied: false,
      fallback: true,
      estimatedDays: 7,
      deliveryTier: 'parcel',
    });
    mockCalculateTax.mockResolvedValue({
      taxAmount: 14.0,
      taxRate: 0.07,
      jurisdiction: 'NC',
      fallback: true,
    });

    const result = await calculateCheckoutTotals(200, false, address);

    expect(result.subtotal).toBe(200);
    expect(result.shipping).toBe(49.99);
    expect(result.tax).toBe(14.0);
    expect(result.total).toBeCloseTo(263.99, 2);
  });
});

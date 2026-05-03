import { calculateShipping } from '../shippingService';

const NC_ZIP = '28202';
const NON_NC_ZIP = '30301'; // Georgia

describe('calculateShipping — free shipping rules', () => {
  it('returns free shipping for orders >= $499', async () => {
    const result = await calculateShipping({
      subtotal: 499,
      shippingZip: NON_NC_ZIP,
      isPremium: false,
      itemWeightLbs: 10,
    });
    expect(result.shippingCost).toBe(0);
    expect(result.freeShippingApplied).toBe(true);
    expect(result.freeShippingReason).toBe('threshold');
  });

  it('returns free shipping for premium members regardless of subtotal', async () => {
    const result = await calculateShipping({
      subtotal: 100,
      shippingZip: NON_NC_ZIP,
      isPremium: true,
      itemWeightLbs: 10,
    });
    expect(result.shippingCost).toBe(0);
    expect(result.freeShippingApplied).toBe(true);
    expect(result.freeShippingReason).toBe('premium');
  });

  it('returns flat rate when subtotal < $499 and not premium', async () => {
    const result = await calculateShipping({
      subtotal: 200,
      shippingZip: NON_NC_ZIP,
      isPremium: false,
      itemWeightLbs: 10,
    });
    expect(result.shippingCost).toBe(49.99);
    expect(result.freeShippingApplied).toBe(false);
    expect(result.fallback).toBe(true);
  });

  it('returns estimated delivery days', async () => {
    const result = await calculateShipping({
      subtotal: 200,
      shippingZip: NON_NC_ZIP,
      isPremium: false,
      itemWeightLbs: 10,
    });
    expect(result.estimatedDays).toBeGreaterThan(0);
  });

  it('handles exactly at threshold boundary', async () => {
    const below = await calculateShipping({
      subtotal: 498.99,
      shippingZip: NON_NC_ZIP,
      isPremium: false,
      itemWeightLbs: 10,
    });
    const at = await calculateShipping({
      subtotal: 499,
      shippingZip: NON_NC_ZIP,
      isPremium: false,
      itemWeightLbs: 10,
    });
    expect(below.shippingCost).toBe(49.99);
    expect(at.shippingCost).toBe(0);
  });

  it('premium + above threshold still reports premium as reason', async () => {
    const result = await calculateShipping({
      subtotal: 1000,
      shippingZip: NON_NC_ZIP,
      isPremium: true,
      itemWeightLbs: 10,
    });
    expect(result.shippingCost).toBe(0);
    expect(result.freeShippingReason).toBe('premium');
  });

  it('handles zero subtotal for non-premium', async () => {
    const result = await calculateShipping({
      subtotal: 0,
      shippingZip: NON_NC_ZIP,
      isPremium: false,
      itemWeightLbs: 10,
    });
    expect(result.shippingCost).toBe(49.99);
    expect(result.freeShippingApplied).toBe(false);
  });
});

describe('calculateShipping — input validation', () => {
  it('throws for negative itemWeightLbs', async () => {
    await expect(
      calculateShipping({
        subtotal: 200,
        shippingZip: NON_NC_ZIP,
        isPremium: false,
        itemWeightLbs: -1,
      }),
    ).rejects.toThrow('itemWeightLbs must be >= 0');
  });

  it('accepts zero weight', async () => {
    const result = await calculateShipping({
      subtotal: 200,
      shippingZip: NON_NC_ZIP,
      isPremium: false,
      itemWeightLbs: 0,
    });
    expect(result.deliveryTier).toBe('parcel');
  });

  it('non-numeric zip string does not crash (treated as non-NC)', async () => {
    const result = await calculateShipping({
      subtotal: 200,
      shippingZip: 'INVALID',
      isPremium: false,
      itemWeightLbs: 10,
    });
    expect(result.deliveryTier).toBe('parcel');
  });

  it('empty zip string does not crash (treated as non-NC)', async () => {
    const result = await calculateShipping({
      subtotal: 200,
      shippingZip: '',
      isPremium: false,
      itemWeightLbs: 10,
    });
    expect(result.deliveryTier).toBe('parcel');
  });
});

describe('calculateShipping — weight-based delivery tiers', () => {
  const base = { subtotal: 200, isPremium: false, shippingZip: NON_NC_ZIP };

  it('assigns parcel tier for weight < 70 lbs', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 69.9 });
    expect(result.deliveryTier).toBe('parcel');
  });

  it('assigns ltl tier at exactly 70 lbs (boundary)', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 70 });
    expect(result.deliveryTier).toBe('ltl');
  });

  it('assigns ltl tier for weight between 70 and 500 lbs', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 250 });
    expect(result.deliveryTier).toBe('ltl');
  });

  it('assigns ltl tier at exactly 500 lbs (boundary)', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 500 });
    expect(result.deliveryTier).toBe('ltl');
  });

  it('assigns ltl tier at 499.9 lbs (just under freight boundary)', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 499.9 });
    expect(result.deliveryTier).toBe('ltl');
  });

  it('assigns freight tier for weight > 500 lbs', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 500.1 });
    expect(result.deliveryTier).toBe('freight');
  });

  it('assigns freight tier for very heavy items', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 1200 });
    expect(result.deliveryTier).toBe('freight');
  });

  it('always includes deliveryTier in result', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 10 });
    expect(result.deliveryTier).toBeDefined();
  });
});

describe('calculateShipping — NC zip white-glove override', () => {
  const base = { subtotal: 200, isPremium: false, itemWeightLbs: 600 };

  it('assigns white_glove for NC zip starting with 27 regardless of weight', async () => {
    const result = await calculateShipping({ ...base, shippingZip: '27601' });
    expect(result.deliveryTier).toBe('white_glove');
  });

  it('assigns white_glove for NC zip starting with 28 regardless of weight', async () => {
    const result = await calculateShipping({ ...base, shippingZip: '28202' });
    expect(result.deliveryTier).toBe('white_glove');
  });

  it('white_glove overrides freight tier (>500 lbs in NC)', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 999, shippingZip: '27701' });
    expect(result.deliveryTier).toBe('white_glove');
  });

  it('white_glove overrides parcel tier (<70 lbs in NC)', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 5, shippingZip: '28205' });
    expect(result.deliveryTier).toBe('white_glove');
  });

  it('non-NC zip does not get white_glove', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 10, shippingZip: '29201' }); // SC
    expect(result.deliveryTier).not.toBe('white_glove');
  });

  it('zip starting with 29 is not NC', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 10, shippingZip: '29201' });
    expect(result.deliveryTier).toBe('parcel');
  });

  it('assigns white_glove at NC range lower boundary 27000', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 10, shippingZip: '27000' });
    expect(result.deliveryTier).toBe('white_glove');
  });

  it('assigns white_glove at NC range upper boundary 27999', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 10, shippingZip: '27999' });
    expect(result.deliveryTier).toBe('white_glove');
  });

  it('assigns white_glove at NC range lower boundary 28000', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 10, shippingZip: '28000' });
    expect(result.deliveryTier).toBe('white_glove');
  });

  it('assigns white_glove at NC range upper boundary 28999', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 10, shippingZip: '28999' });
    expect(result.deliveryTier).toBe('white_glove');
  });

  it('zip 26999 just outside NC range is not white_glove', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 10, shippingZip: '26999' });
    expect(result.deliveryTier).not.toBe('white_glove');
  });

  it('zip 29000 just outside NC range is not white_glove', async () => {
    const result = await calculateShipping({ ...base, itemWeightLbs: 10, shippingZip: '29000' });
    expect(result.deliveryTier).not.toBe('white_glove');
  });

  it('white_glove still applies free shipping for premium NC member', async () => {
    const result = await calculateShipping({
      subtotal: 100,
      isPremium: true,
      itemWeightLbs: 300,
      shippingZip: '27601',
    });
    expect(result.deliveryTier).toBe('white_glove');
    expect(result.shippingCost).toBe(0);
    expect(result.freeShippingReason).toBe('premium');
  });
});

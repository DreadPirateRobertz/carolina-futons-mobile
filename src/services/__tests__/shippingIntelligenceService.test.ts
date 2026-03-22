/**
 * Tests for shippingIntelligenceService — cm-z5f
 *
 * Validates the service wrapper that calls the Wix shippingIntelligence
 * webMethod and returns aligned option data.
 */

import { fetchShippingOptions, normalizeShippingOption } from '../shippingIntelligenceService';
import { WixClient } from '@/services/wix/wixClient';

// ── Fixtures ────────────────────────────────────────────────────────────────

const LOCAL_DELIVERY_OPTION = {
  code: 'local-delivery-asheville',
  title: '🚚 Asheville Area Delivery',
  price: '0.00',
  currency: 'USD',
  deliveryTime: '2–3 business days',
  badge: 'Local Love',
  badgeStyle: 'local',
  upsellMessage: 'Free delivery in Asheville!',
  highlight: true,
  icon: '🚚',
};

const WHITE_GLOVE_OPTION = {
  code: 'white-glove-asheville',
  title: '✨ White Glove Delivery',
  price: '149.00',
  currency: 'USD',
  deliveryTime: '2–3 business days',
  badge: 'Premium Experience',
  badgeStyle: 'premium',
  upsellMessage: 'We set it up for you!',
  highlight: false,
  icon: '✨',
  terrainSurcharge: 25,
};

const UPS_GROUND_OPTION = {
  code: 'UPS_GROUND',
  title: '📦 UPS Ground',
  price: '49.00',
  currency: 'USD',
  deliveryTime: '5–7 business days',
  badge: null,
  badgeStyle: null,
  upsellMessage: null,
  highlight: false,
  icon: '📦',
  isEstimate: true,
};

const LTL_FREIGHT_OPTION = {
  code: 'WWEX_LTL_STANDARD',
  title: '🚛 LTL Freight',
  price: '299.00',
  currency: 'USD',
  deliveryTime: '7–10 business days',
  badge: null,
  badgeStyle: 'freight',
  upsellMessage: null,
  highlight: false,
  icon: '🚛',
  isLTL: true,
  isEstimate: false,
};

const SUCCESS_RESULT = {
  success: true,
  options: [LOCAL_DELIVERY_OPTION, WHITE_GLOVE_OPTION, UPS_GROUND_OPTION],
};

const CART_ITEMS = [{ productId: 'prod-123', quantity: 1, price: 89900 }];

// ── Mock WixClient ────────────────────────────────────────────────────────

function makeMockClient(response: unknown) {
  return {
    callFunction: jest.fn().mockResolvedValue(response),
  } as unknown as WixClient;
}

function makeFailingClient(error: Error) {
  return {
    callFunction: jest.fn().mockRejectedValue(error),
  } as unknown as WixClient;
}

// ── fetchShippingOptions ──────────────────────────────────────────────────

describe('fetchShippingOptions', () => {
  it('returns options array on success', async () => {
    const client = makeMockClient(SUCCESS_RESULT);
    const result = await fetchShippingOptions(client, '28801', CART_ITEMS);
    expect(result.success).toBe(true);
    expect(result.options).toHaveLength(3);
  });

  it('calls the correct Wix function path', async () => {
    const client = makeMockClient(SUCCESS_RESULT);
    await fetchShippingOptions(client, '28801', CART_ITEMS);
    expect(client.callFunction).toHaveBeenCalledWith(
      '/_functions/shippingIntelligence/calculateBundleQuote',
      'POST',
      expect.objectContaining({ zip: '28801', items: CART_ITEMS }),
    );
  });

  it('passes zip and items to the API', async () => {
    const client = makeMockClient(SUCCESS_RESULT);
    const items = [
      { productId: 'a', quantity: 2, price: 50000 },
      { productId: 'b', quantity: 1, price: 75000 },
    ];
    await fetchShippingOptions(client, '27703', items);
    expect(client.callFunction).toHaveBeenCalledWith(
      expect.any(String),
      'POST',
      expect.objectContaining({ zip: '27703', items }),
    );
  });

  it('returns error result when API returns success:false', async () => {
    const client = makeMockClient({ success: false, error: 'Invalid ZIP', options: [] });
    const result = await fetchShippingOptions(client, '00000', CART_ITEMS);
    expect(result.success).toBe(false);
    expect(result.options).toEqual([]);
    expect(result.error).toBe('Invalid ZIP');
  });

  it('returns error result on network failure', async () => {
    const client = makeFailingClient(new Error('Network error'));
    const result = await fetchShippingOptions(client, '28801', CART_ITEMS);
    expect(result.success).toBe(false);
    expect(result.options).toEqual([]);
    expect(result.error).toMatch(/network|unavailable/i);
  });

  it('returns error result on timeout', async () => {
    const client = makeFailingClient(
      Object.assign(new Error('Request timeout after 10000ms'), { statusCode: undefined }),
    );
    const result = await fetchShippingOptions(client, '28801', CART_ITEMS);
    expect(result.success).toBe(false);
    expect(result.options).toEqual([]);
  });

  it('handles empty items array gracefully', async () => {
    const client = makeMockClient(SUCCESS_RESULT);
    const result = await fetchShippingOptions(client, '28801', []);
    expect(result.success).toBe(true);
  });

  it('rejects invalid ZIP (non-5-digit)', async () => {
    const client = makeMockClient(SUCCESS_RESULT);
    const result = await fetchShippingOptions(client, 'ABCDE', CART_ITEMS);
    expect(result.success).toBe(false);
    expect(client.callFunction).not.toHaveBeenCalled();
  });

  it('rejects empty ZIP', async () => {
    const client = makeMockClient(SUCCESS_RESULT);
    const result = await fetchShippingOptions(client, '', CART_ITEMS);
    expect(result.success).toBe(false);
    expect(client.callFunction).not.toHaveBeenCalled();
  });

  it('accepts ZIP+4 format', async () => {
    const client = makeMockClient(SUCCESS_RESULT);
    const result = await fetchShippingOptions(client, '28801-1234', CART_ITEMS);
    expect(result.success).toBe(true);
    expect(client.callFunction).toHaveBeenCalled();
  });
});

// ── normalizeShippingOption ───────────────────────────────────────────────

describe('normalizeShippingOption', () => {
  it('maps code as the option id', () => {
    const norm = normalizeShippingOption(LOCAL_DELIVERY_OPTION);
    expect(norm.id).toBe('local-delivery-asheville');
  });

  it('maps title with icon', () => {
    const norm = normalizeShippingOption(LOCAL_DELIVERY_OPTION);
    expect(norm.label).toBe('🚚 Asheville Area Delivery');
  });

  it('maps price as cents (string "0.00" → 0)', () => {
    const norm = normalizeShippingOption(LOCAL_DELIVERY_OPTION);
    expect(norm.priceCents).toBe(0);
  });

  it('maps price "149.00" as cents → 14900', () => {
    const norm = normalizeShippingOption(WHITE_GLOVE_OPTION);
    expect(norm.priceCents).toBe(14900);
  });

  it('maps badge text', () => {
    const norm = normalizeShippingOption(LOCAL_DELIVERY_OPTION);
    expect(norm.badge).toBe('Local Love');
  });

  it('maps null badge', () => {
    const norm = normalizeShippingOption(UPS_GROUND_OPTION);
    expect(norm.badge).toBeNull();
  });

  it('maps badgeStyle', () => {
    const norm = normalizeShippingOption(WHITE_GLOVE_OPTION);
    expect(norm.badgeStyle).toBe('premium');
  });

  it('maps null badgeStyle', () => {
    const norm = normalizeShippingOption(UPS_GROUND_OPTION);
    expect(norm.badgeStyle).toBeNull();
  });

  it('maps upsellMessage', () => {
    const norm = normalizeShippingOption(LOCAL_DELIVERY_OPTION);
    expect(norm.upsellMessage).toBe('Free delivery in Asheville!');
  });

  it('maps null upsellMessage', () => {
    const norm = normalizeShippingOption(UPS_GROUND_OPTION);
    expect(norm.upsellMessage).toBeNull();
  });

  it('maps highlight flag', () => {
    const norm = normalizeShippingOption(LOCAL_DELIVERY_OPTION);
    expect(norm.highlight).toBe(true);
  });

  it('maps highlight false', () => {
    const norm = normalizeShippingOption(UPS_GROUND_OPTION);
    expect(norm.highlight).toBe(false);
  });

  it('maps terrainSurcharge when present', () => {
    const norm = normalizeShippingOption(WHITE_GLOVE_OPTION);
    expect(norm.terrainSurcharge).toBe(25);
  });

  it('maps terrainSurcharge undefined when absent', () => {
    const norm = normalizeShippingOption(LOCAL_DELIVERY_OPTION);
    expect(norm.terrainSurcharge).toBeUndefined();
  });

  it('maps isLTL flag', () => {
    const norm = normalizeShippingOption(LTL_FREIGHT_OPTION);
    expect(norm.isLTL).toBe(true);
  });

  it('maps deliveryTime', () => {
    const norm = normalizeShippingOption(LOCAL_DELIVERY_OPTION);
    expect(norm.deliveryTime).toBe('2–3 business days');
  });

  it('maps icon', () => {
    const norm = normalizeShippingOption(UPS_GROUND_OPTION);
    expect(norm.icon).toBe('📦');
  });

  // ── cm-o4i: requiresLiftgate + carrier fields ──────────────────────────────

  it('maps requiresLiftgate: true', () => {
    const norm = normalizeShippingOption({ ...LTL_FREIGHT_OPTION, requiresLiftgate: true });
    expect(norm.requiresLiftgate).toBe(true);
  });

  it('maps requiresLiftgate: false', () => {
    const norm = normalizeShippingOption({ ...LTL_FREIGHT_OPTION, requiresLiftgate: false });
    expect(norm.requiresLiftgate).toBe(false);
  });

  it('maps requiresLiftgate: undefined → undefined', () => {
    const norm = normalizeShippingOption(UPS_GROUND_OPTION);
    expect(norm.requiresLiftgate).toBeUndefined();
  });

  it('maps carrier field when present', () => {
    const norm = normalizeShippingOption({ ...LTL_FREIGHT_OPTION, carrier: 'R+L Carriers' });
    expect(norm.carrier).toBe('R+L Carriers');
  });

  it('maps carrier field as undefined when absent', () => {
    const norm = normalizeShippingOption(UPS_GROUND_OPTION);
    expect(norm.carrier).toBeUndefined();
  });
});

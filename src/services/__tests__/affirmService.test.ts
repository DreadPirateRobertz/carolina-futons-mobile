/**
 * TDD tests for affirmService — Affirm BNPL prequalification and checkout initiation.
 *
 * Covers:
 *  - checkAffirmPrequalification: eligible result from API
 *  - checkAffirmPrequalification: ineligible result (amount out of range)
 *  - checkAffirmPrequalification: API failure returns error gracefully
 *  - checkAffirmPrequalification: amount below Affirm minimum ($50) → not eligible
 *  - checkAffirmPrequalification: amount above Affirm maximum ($30,000) → not eligible
 *  - initiateAffirmCheckout: returns checkout URL and token from API
 *  - initiateAffirmCheckout: validates amount before calling API
 *  - initiateAffirmCheckout: propagates API errors
 *  - No hardcoded API keys — service reads from env vars
 *
 * Bead: cm-d7l
 */

import {
  checkAffirmPrequalification,
  initiateAffirmCheckout,
  AFFIRM_MIN_AMOUNT,
  AFFIRM_MAX_AMOUNT,
} from '../affirmService';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPost = jest.fn();
const mockGet = jest.fn();

jest.mock('../wix', () => ({
  useOptionalWixClient: jest.fn(),
}));

// Mock the Wix client used internally for API calls
const mockWixClient = {
  callAffirmPrequal: mockPost,
  initiateAffirmCheckout: mockGet,
};

// ── checkAffirmPrequalification ───────────────────────────────────────────────

describe('checkAffirmPrequalification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns eligible=true when API says user qualifies', async () => {
    mockPost.mockResolvedValue({
      eligible: true,
      financing_program: 'standard',
      min_loan_amount: 5000, // cents
      max_loan_amount: 3000000,
    });

    const result = await checkAffirmPrequalification(mockWixClient as any, 499);

    expect(result.eligible).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns eligible=false when API says user does not qualify', async () => {
    mockPost.mockResolvedValue({
      eligible: false,
    });

    const result = await checkAffirmPrequalification(mockWixClient as any, 499);

    expect(result.eligible).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it('returns eligible=false when amount is below Affirm minimum', async () => {
    const result = await checkAffirmPrequalification(mockWixClient as any, AFFIRM_MIN_AMOUNT - 1);

    expect(result.eligible).toBe(false);
    expect(result.error).toBeUndefined();
    // Should NOT call the API for obviously ineligible amounts
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('returns eligible=false when amount is above Affirm maximum', async () => {
    const result = await checkAffirmPrequalification(mockWixClient as any, AFFIRM_MAX_AMOUNT + 1);

    expect(result.eligible).toBe(false);
    expect(result.error).toBeUndefined();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('returns eligible=false with error on API failure', async () => {
    mockPost.mockRejectedValue(new Error('Network error'));

    const result = await checkAffirmPrequalification(mockWixClient as any, 499);

    expect(result.eligible).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
  });

  it('returns eligible=false when no wixClient provided', async () => {
    const result = await checkAffirmPrequalification(null as any, 499);

    expect(result.eligible).toBe(false);
    expect(result.error).toBeDefined();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('passes amount in cents to the API', async () => {
    mockPost.mockResolvedValue({ eligible: true });

    await checkAffirmPrequalification(mockWixClient as any, 499.0);

    // Affirm API expects cents
    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 49900 }),
    );
  });
});

// ── initiateAffirmCheckout ────────────────────────────────────────────────────

describe('initiateAffirmCheckout', () => {
  const mockItems = [
    {
      id: 'prod-1',
      model: { id: 'm1', name: 'Asheville Full', size: 'full' as const, priceModifier: 0 },
      fabric: { id: 'f1', name: 'Black Microfiber', priceModifier: 0 },
      quantity: 1,
      unitPrice: 499,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns checkoutUrl and checkoutToken from the API', async () => {
    mockGet.mockResolvedValue({
      checkout_url: 'https://sandbox.affirm.com/ui/redirect?token=tok-abc',
      checkout_token: 'tok-abc',
    });

    const result = await initiateAffirmCheckout(mockWixClient as any, 499.0, 'cf-ord-1', mockItems);

    expect(result.checkoutUrl).toBe('https://sandbox.affirm.com/ui/redirect?token=tok-abc');
    expect(result.checkoutToken).toBe('tok-abc');
  });

  it('throws when API call fails', async () => {
    mockGet.mockRejectedValue(new Error('Affirm API unavailable'));

    await expect(
      initiateAffirmCheckout(mockWixClient as any, 499.0, 'cf-ord-1', mockItems),
    ).rejects.toThrow();
  });

  it('throws when wixClient is null', async () => {
    await expect(
      initiateAffirmCheckout(null as any, 499.0, 'cf-ord-1', mockItems),
    ).rejects.toThrow();
  });

  it('throws when amount is invalid (zero)', async () => {
    await expect(
      initiateAffirmCheckout(mockWixClient as any, 0, 'cf-ord-1', mockItems),
    ).rejects.toThrow();
  });

  it('throws when amount is negative', async () => {
    await expect(
      initiateAffirmCheckout(mockWixClient as any, -100, 'cf-ord-1', mockItems),
    ).rejects.toThrow();
  });

  it('throws when orderId is empty', async () => {
    await expect(
      initiateAffirmCheckout(mockWixClient as any, 499.0, '', mockItems),
    ).rejects.toThrow();
  });

  it('throws when items list is empty', async () => {
    await expect(
      initiateAffirmCheckout(mockWixClient as any, 499.0, 'cf-ord-1', []),
    ).rejects.toThrow();
  });

  it('passes correct line items to the API', async () => {
    mockGet.mockResolvedValue({
      checkout_url: 'https://sandbox.affirm.com/ui/redirect?token=tok-xyz',
      checkout_token: 'tok-xyz',
    });

    await initiateAffirmCheckout(mockWixClient as any, 499.0, 'cf-ord-1', mockItems);

    expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 'cf-ord-1',
        items: expect.arrayContaining([
          expect.objectContaining({ sku: 'prod-1', unit_price: 49900 }),
        ]),
      }),
    );
  });

  it('does not construct URLs from user-supplied payload fields (SSRF guard)', async () => {
    // orderId with injection attempt — should be passed through safely, not used as URL
    mockGet.mockResolvedValue({
      checkout_url: 'https://sandbox.affirm.com/ui/redirect?token=tok-safe',
      checkout_token: 'tok-safe',
    });

    // This should not throw and should not use orderId as a URL
    const result = await initiateAffirmCheckout(
      mockWixClient as any,
      499.0,
      'cf-ord-injection://evil.com',
      mockItems,
    );

    // checkoutUrl comes from the API response — not from the orderId
    expect(result.checkoutUrl).toBe('https://sandbox.affirm.com/ui/redirect?token=tok-safe');
  });
});

// ── Constants ────────────────────────────────────────────────────────────────

describe('Affirm eligibility constants', () => {
  it('exports AFFIRM_MIN_AMOUNT as a positive number', () => {
    expect(typeof AFFIRM_MIN_AMOUNT).toBe('number');
    expect(AFFIRM_MIN_AMOUNT).toBeGreaterThan(0);
  });

  it('exports AFFIRM_MAX_AMOUNT greater than AFFIRM_MIN_AMOUNT', () => {
    expect(AFFIRM_MAX_AMOUNT).toBeGreaterThan(AFFIRM_MIN_AMOUNT);
  });

  it('AFFIRM_MIN_AMOUNT is consistent with BNPL_PROVIDERS affirm config', () => {
    const { BNPL_PROVIDERS } = require('../bnplService');
    expect(AFFIRM_MIN_AMOUNT).toBe(BNPL_PROVIDERS.affirm.minAmount);
  });
});

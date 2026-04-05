/**
 * TDD tests for useCompleteTheLook hook — cm-mmy.
 *
 * Schema change: ProductRecommendations collection is now one row per
 * productId (not one row per recommendedProductId). The row contains:
 *   - productId: string
 *   - recommendedProductIds: JSON-encoded string array
 *   - pairingType: 'complete_the_look' | 'bundle' | 'style_match'
 *   - sortOrder: number
 *   - updatedAt: string (ISO 8601)
 *
 * This hook filters pairingType === 'complete_the_look' and expands the
 * recommendedProductIds array into resolved Product objects.
 *
 * Covers:
 *  - isLoading true during fetch, false after
 *  - Queries ProductRecommendations filtered by productId + pairingType=complete_the_look
 *  - Sorts by sortOrder ASC
 *  - Parses recommendedProductIds JSON array and resolves against PRODUCTS catalog
 *  - Caps results at 4 products
 *  - Returns empty array when no row exists for productId
 *  - Skips unknown product IDs (not in local catalog)
 *  - Graceful fallback on Wix error (empty array, error message set)
 *  - Returns empty array when no Wix client available
 *  - Does not fetch when productId is empty string
 *  - Re-fetches when productId changes
 *  - Handles malformed recommendedProductIds (non-array JSON, invalid JSON)
 *
 * @bead cm-mmy
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useCompleteTheLook } from '../useCompleteTheLook';
import { PRODUCTS } from '@/data/products';

// ── Mock Wix provider ─────────────────────────────────────────────────────────

const mockQueryData = jest.fn();
const mockWixClient = { queryData: mockQueryData };

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: jest.fn(),
}));

import { useOptionalWixClient } from '@/services/wix/wixProvider';
const mockUseOptionalWixClient = useOptionalWixClient as jest.Mock;

// ── Mock crashReporting ───────────────────────────────────────────────────────

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const SOURCE_PRODUCT_ID = PRODUCTS[0].id;
const COMPLEMENT_1 = PRODUCTS[1];
const COMPLEMENT_2 = PRODUCTS[2];
const COMPLEMENT_3 = PRODUCTS[3];
const COMPLEMENT_4 = PRODUCTS[4];

/**
 * Build a Wix row in the new schema (one row per productId).
 * recommendedProductIds is JSON-encoded as stored in Wix CMS text field.
 */
function makeWixRow(
  productId: string,
  recommendedProducts: (typeof PRODUCTS)[number][],
  overrides: { pairingType?: string; sortOrder?: number } = {},
) {
  return {
    id: `rec-${productId}`,
    data: {
      productId,
      recommendedProductIds: JSON.stringify(recommendedProducts.map((p) => p.id)),
      pairingType: overrides.pairingType ?? 'complete_the_look',
      sortOrder: overrides.sortOrder ?? 1,
      updatedAt: '2026-04-05T00:00:00.000Z',
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCompleteTheLook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptionalWixClient.mockReturnValue(mockWixClient);
  });

  // ── Loading state ───────────────────────────────────────────────────────────

  it('starts with isLoading true and empty products', () => {
    mockQueryData.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.products).toEqual([]);
  });

  it('sets isLoading false after fetch completes', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  // ── Query shape ─────────────────────────────────────────────────────────────

  it('queries ProductRecommendations collection', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    expect(mockQueryData).toHaveBeenCalledWith('ProductRecommendations', expect.any(Object));
  });

  it('filters by productId', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    expect(mockQueryData).toHaveBeenCalledWith(
      'ProductRecommendations',
      expect.objectContaining({
        filter: expect.objectContaining({ productId: { $eq: SOURCE_PRODUCT_ID } }),
      }),
    );
  });

  it('filters pairingType = complete_the_look', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    expect(mockQueryData).toHaveBeenCalledWith(
      'ProductRecommendations',
      expect.objectContaining({
        filter: expect.objectContaining({ pairingType: { $eq: 'complete_the_look' } }),
      }),
    );
  });

  it('sorts by sortOrder ASC', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    expect(mockQueryData).toHaveBeenCalledWith(
      'ProductRecommendations',
      expect.objectContaining({
        sort: expect.arrayContaining([
          expect.objectContaining({ fieldName: 'sortOrder', order: 'ASC' }),
        ]),
      }),
    );
  });

  // ── Result resolution ───────────────────────────────────────────────────────

  it('parses recommendedProductIds JSON array and resolves products from catalog', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeWixRow(SOURCE_PRODUCT_ID, [COMPLEMENT_1, COMPLEMENT_2])],
      totalResults: 1,
    });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toHaveLength(2);
    expect(result.current.products.map((p) => p.id)).toContain(COMPLEMENT_1.id);
    expect(result.current.products.map((p) => p.id)).toContain(COMPLEMENT_2.id);
    expect(result.current.error).toBeNull();
  });

  it('returns empty array when no row exists for productId', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('caps results at 4 products when recommendedProductIds has more than 4 entries', async () => {
    const manyProducts = PRODUCTS.slice(1, 9); // 8 products
    mockQueryData.mockResolvedValue({
      items: [makeWixRow(SOURCE_PRODUCT_ID, manyProducts)],
      totalResults: 1,
    });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeLessThanOrEqual(4);
  });

  it('returns at least 2 products when CMS has them', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeWixRow(SOURCE_PRODUCT_ID, [COMPLEMENT_1, COMPLEMENT_2])],
      totalResults: 1,
    });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeGreaterThanOrEqual(2);
  });

  it('skips unknown product IDs not present in local catalog', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        {
          id: 'rec-mixed',
          data: {
            productId: SOURCE_PRODUCT_ID,
            recommendedProductIds: JSON.stringify(['unknown-ghost-9999', COMPLEMENT_1.id]),
            pairingType: 'complete_the_look',
            sortOrder: 1,
            updatedAt: '2026-04-05T00:00:00.000Z',
          },
        },
      ],
      totalResults: 1,
    });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].id).toBe(COMPLEMENT_1.id);
  });

  it('respects sortOrder — products returned in sortOrder ASC by row order', async () => {
    // Two rows: sortOrder 2 returned first (simulate unsorted Wix response),
    // sortOrder 1 returned second. The hook sorts by sortOrder.
    mockQueryData.mockResolvedValue({
      items: [
        makeWixRow(SOURCE_PRODUCT_ID, [COMPLEMENT_2], { sortOrder: 2 }),
        makeWixRow(SOURCE_PRODUCT_ID, [COMPLEMENT_1], { sortOrder: 1 }),
      ],
      totalResults: 2,
    });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // COMPLEMENT_1 (sortOrder 1) should come before COMPLEMENT_2 (sortOrder 2)
    const ids = result.current.products.map((p) => p.id);
    expect(ids.indexOf(COMPLEMENT_1.id)).toBeLessThan(ids.indexOf(COMPLEMENT_2.id));
  });

  it('handles multiple rows with one row per productId — flattens all recommendedProductIds', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeWixRow(SOURCE_PRODUCT_ID, [COMPLEMENT_1, COMPLEMENT_2], { sortOrder: 1 }),
        makeWixRow(SOURCE_PRODUCT_ID, [COMPLEMENT_3, COMPLEMENT_4], { sortOrder: 2 }),
      ],
      totalResults: 2,
    });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should include products from both rows, capped at 4
    expect(result.current.products.length).toBeGreaterThanOrEqual(2);
    expect(result.current.products.length).toBeLessThanOrEqual(4);
  });

  // ── Error handling ──────────────────────────────────────────────────────────

  it('sets error and returns empty array on Wix fetch failure', async () => {
    mockQueryData.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });

  it('handles malformed JSON in recommendedProductIds gracefully', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        {
          id: 'rec-broken',
          data: {
            productId: SOURCE_PRODUCT_ID,
            recommendedProductIds: 'NOT_VALID_JSON{{',
            pairingType: 'complete_the_look',
            sortOrder: 1,
            updatedAt: '2026-04-05T00:00:00.000Z',
          },
        },
      ],
      totalResults: 1,
    });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should not throw — returns empty array for that row
    expect(result.current.products).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('handles non-array JSON in recommendedProductIds gracefully', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        {
          id: 'rec-scalar',
          data: {
            productId: SOURCE_PRODUCT_ID,
            recommendedProductIds: JSON.stringify('single-string-not-array'),
            pairingType: 'complete_the_look',
            sortOrder: 1,
            updatedAt: '2026-04-05T00:00:00.000Z',
          },
        },
      ],
      totalResults: 1,
    });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  // ── No client / empty productId ─────────────────────────────────────────────

  it('returns empty array when no Wix client available', async () => {
    mockUseOptionalWixClient.mockReturnValue(null);

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toEqual([]);
    expect(mockQueryData).not.toHaveBeenCalled();
  });

  it('does not fetch when productId is empty string', async () => {
    const { result } = renderHook(() => useCompleteTheLook(''));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockQueryData).not.toHaveBeenCalled();
    expect(result.current.products).toEqual([]);
  });

  // ── Re-fetch on productId change ────────────────────────────────────────────

  it('re-fetches when productId changes', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

    const { result, rerender } = renderHook(
      ({ productId }: { productId: string }) => useCompleteTheLook(productId),
      { initialProps: { productId: SOURCE_PRODUCT_ID } },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockQueryData).toHaveBeenCalledTimes(1);

    const secondProductId = PRODUCTS[5].id;
    rerender({ productId: secondProductId });

    await waitFor(() => expect(mockQueryData).toHaveBeenCalledTimes(2));
    expect(mockQueryData).toHaveBeenLastCalledWith(
      'ProductRecommendations',
      expect.objectContaining({
        filter: expect.objectContaining({ productId: { $eq: secondProductId } }),
      }),
    );
  });
});

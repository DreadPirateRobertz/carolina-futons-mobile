/**
 * TDD tests for useCompleteTheLook hook.
 *
 * Covers:
 *  - Returns 2-4 complementary products from Wix ProductRecommendations collection
 *  - Queries with productId filter
 *  - isLoading true during fetch, false after
 *  - Returns empty array when no recommendations exist
 *  - Falls back gracefully on Wix error (empty array, error message set)
 *  - Skips Wix when client unavailable — returns empty array
 *  - Caps results at 4 items
 *  - Does not fetch when productId is empty
 *
 * cm-3n3: Complete the look — complementary product recommendations on PDP.
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

function makeWixRecommendationItem(recommendedProduct: (typeof PRODUCTS)[0]) {
  return {
    id: `rec-${recommendedProduct.id}`,
    data: {
      productId: SOURCE_PRODUCT_ID,
      recommendedProductId: recommendedProduct.id,
      position: 1,
    },
    _updatedDate: new Date().toISOString(),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCompleteTheLook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptionalWixClient.mockReturnValue(mockWixClient);
  });

  it('starts with isLoading true', () => {
    mockQueryData.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.products).toEqual([]);
  });

  it('fetches from ProductRecommendations collection keyed by productId', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeWixRecommendationItem(COMPLEMENT_1)],
      totalResults: 1,
    });

    renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));

    await waitFor(() => {
      expect(mockQueryData).toHaveBeenCalledWith(
        'ProductRecommendations',
        expect.objectContaining({
          filter: expect.objectContaining({ productId: { $eq: SOURCE_PRODUCT_ID } }),
        }),
      );
    });
  });

  it('returns matching products from PRODUCTS catalog', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeWixRecommendationItem(COMPLEMENT_1), makeWixRecommendationItem(COMPLEMENT_2)],
      totalResults: 2,
    });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toHaveLength(2);
    expect(result.current.products.map((p) => p.id)).toContain(COMPLEMENT_1.id);
    expect(result.current.products.map((p) => p.id)).toContain(COMPLEMENT_2.id);
    expect(result.current.error).toBeNull();
  });

  it('sets isLoading false after fetch completes', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('returns empty array when no recommendations exist in CMS', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('caps results at 4 products', async () => {
    const manyItems = PRODUCTS.slice(1, 8).map(makeWixRecommendationItem);
    mockQueryData.mockResolvedValue({ items: manyItems, totalResults: manyItems.length });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeLessThanOrEqual(4);
  });

  it('returns at least 2 products when CMS has them', async () => {
    const items = PRODUCTS.slice(1, 3).map(makeWixRecommendationItem);
    mockQueryData.mockResolvedValue({ items, totalResults: 2 });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeGreaterThanOrEqual(2);
  });

  it('sets error and returns empty array on Wix fetch failure', async () => {
    mockQueryData.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });

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

  it('skips CMS items where recommendedProductId is not in local catalog', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        { id: 'rec-ghost', data: { productId: SOURCE_PRODUCT_ID, recommendedProductId: 'unknown-product-9999', position: 1 } },
        makeWixRecommendationItem(COMPLEMENT_1),
      ],
      totalResults: 2,
    });

    const { result } = renderHook(() => useCompleteTheLook(SOURCE_PRODUCT_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Only returns the known product, skips ghost
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].id).toBe(COMPLEMENT_1.id);
  });

  it('re-fetches when productId changes', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

    const { result, rerender } = renderHook(
      ({ productId }: { productId: string }) => useCompleteTheLook(productId),
      { initialProps: { productId: SOURCE_PRODUCT_ID } },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockQueryData).toHaveBeenCalledTimes(1);

    const secondProductId = PRODUCTS[1].id;
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

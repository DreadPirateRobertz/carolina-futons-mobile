/**
 * @module useProductRecommendations.test
 *
 * TDD tests for the Wix CMS-backed product recommendations hook — hq-bzb.
 *
 * Schema (confirmed, cm-mmy):
 *   - productId: string           — the source product
 *   - recommendedProductIds: string  — JSON-encoded string[]
 *   - pairingType: 'recommended_for_you' | ...
 *   - sortOrder: number           — display order (ASC)
 *   - updatedAt: string           — ISO 8601
 *
 * Covered:
 *   - Empty productId → empty result, no fetch
 *   - No Wix client → static fallback (category + price filter)
 *   - Queries ProductRecommendations filtered by productId + pairingType
 *   - Sorts rows by sortOrder ASC
 *   - Parses recommendedProductIds JSON array, resolves against local catalog
 *   - Skips product IDs not in local catalog
 *   - Multiple rows flattened and capped at 8
 *   - Malformed recommendedProductIds JSON → empty (non-fatal)
 *   - Re-fetches when productId changes
 *   - Cache hit within TTL → no refetch
 *   - Cache expires after TTL → refetches
 *   - Wix error → static fallback + error message set
 *   - Static fallback excludes source product
 *   - Static fallback only returns same-category products within ±50% price
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProductRecommendations, clearRecommendationsCache } from '../useProductRecommendations';
import { PRODUCTS } from '@/data/products';

// ── Mock Wix provider ──────────────────────────────────────────────────────────

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

const SOURCE_PRODUCT = PRODUCTS[0];
const SOURCE_ID = SOURCE_PRODUCT.id;
const REC_1 = PRODUCTS[1];
const REC_2 = PRODUCTS[2];

/**
 * Build a mock CMS row in the confirmed ProductRecommendations schema.
 * queryData spreads item.data — rows are returned as flat objects.
 * recommendedProductIds is JSON-encoded as stored in Wix CMS text field.
 */
function makeRow(
  productId: string,
  recommendedProducts: (typeof PRODUCTS)[number][],
  overrides: { pairingType?: string; sortOrder?: number } = {},
) {
  return {
    productId,
    recommendedProductIds: JSON.stringify(recommendedProducts.map((p) => p.id)),
    pairingType: overrides.pairingType ?? 'recommended_for_you',
    sortOrder: overrides.sortOrder ?? 1,
    updatedAt: '2026-04-12T00:00:00.000Z',
  };
}

describe('useProductRecommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRecommendationsCache();
    mockUseOptionalWixClient.mockReturnValue(null);
  });

  // ── Empty / no-client cases ──────────────────────────────────────────────

  describe('empty productId', () => {
    it('returns empty array and no error for empty string', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      const { result } = renderHook(() => useProductRecommendations(''));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(mockQueryData).not.toHaveBeenCalled();
    });
  });

  // ── No Wix client → static fallback ─────────────────────────────────────

  describe('no Wix client', () => {
    it('returns static fallback when no client is available', async () => {
      mockUseOptionalWixClient.mockReturnValue(null);
      const { result } = renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      // Static fallback: same-category products within ±50% price
      expect(
        result.current.recommendations.every((p) => p.category === SOURCE_PRODUCT.category),
      ).toBe(true);
      expect(result.current.recommendations.find((p) => p.id === SOURCE_ID)).toBeUndefined();
      expect(result.current.error).toBeNull();
    });

    it('does not query Wix when no client', async () => {
      mockUseOptionalWixClient.mockReturnValue(null);
      renderHook(() => useProductRecommendations(SOURCE_ID));
      await act(async () => {});
      expect(mockQueryData).not.toHaveBeenCalled();
    });
  });

  // ── CMS query shape ──────────────────────────────────────────────────────

  describe('Wix CMS query shape', () => {
    it('queries ProductRecommendations collection with correct filters', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(mockQueryData).toHaveBeenCalled());

      const [collection, options] = mockQueryData.mock.calls[0];
      expect(collection).toBe('ProductRecommendations');
      expect(options.filter).toEqual(
        expect.objectContaining({
          productId: { $eq: SOURCE_ID },
          pairingType: { $eq: 'recommended_for_you' },
        }),
      );
    });

    it('requests sortOrder ASC', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(mockQueryData).toHaveBeenCalled());

      const [, options] = mockQueryData.mock.calls[0];
      expect(options.sort).toEqual(
        expect.arrayContaining([{ fieldName: 'sortOrder', order: 'ASC' }]),
      );
    });
  });

  // ── JSON parsing and resolution ──────────────────────────────────────────

  describe('recommendedProductIds parsing', () => {
    it('resolves recommended product IDs from local catalog', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      mockQueryData.mockResolvedValue({
        items: [makeRow(SOURCE_ID, [REC_1, REC_2])],
        totalResults: 1,
      });

      const { result } = renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.recommendations.map((p) => p.id)).toContain(REC_1.id);
      expect(result.current.recommendations.map((p) => p.id)).toContain(REC_2.id);
    });

    it('skips product IDs not found in local catalog', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      const row = makeRow(SOURCE_ID, [REC_1]);
      // Inject an unknown ID into the JSON
      row.recommendedProductIds = JSON.stringify([REC_1.id, 'unknown-id-xyz']);
      mockQueryData.mockResolvedValue({ items: [row], totalResults: 1 });

      const { result } = renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.recommendations.map((p) => p.id)).toContain(REC_1.id);
      expect(result.current.recommendations.find((p) => p.id === 'unknown-id-xyz')).toBeUndefined();
    });

    it('returns empty array when row has no matching IDs', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      mockQueryData.mockResolvedValue({
        items: [makeRow(SOURCE_ID, [])],
        totalResults: 1,
      });

      const { result } = renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.recommendations).toEqual([]);
    });

    it('returns empty array when no CMS row exists for productId', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const { result } = renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.recommendations).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles malformed JSON in recommendedProductIds gracefully', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      const row = {
        productId: SOURCE_ID,
        recommendedProductIds: 'NOT_JSON',
        pairingType: 'recommended_for_you',
        sortOrder: 1,
        updatedAt: '',
      };
      mockQueryData.mockResolvedValue({ items: [row], totalResults: 1 });

      const { result } = renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.recommendations).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles non-array JSON in recommendedProductIds gracefully', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      const row = {
        productId: SOURCE_ID,
        recommendedProductIds: '"not-an-array"',
        pairingType: 'recommended_for_you',
        sortOrder: 1,
        updatedAt: '',
      };
      mockQueryData.mockResolvedValue({ items: [row], totalResults: 1 });

      const { result } = renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.recommendations).toEqual([]);
    });
  });

  // ── Sorting ──────────────────────────────────────────────────────────────

  describe('sortOrder', () => {
    it('sorts results by sortOrder ASC client-side defensively', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      // Return rows in reverse order — hook must sort them
      mockQueryData.mockResolvedValue({
        items: [
          makeRow(SOURCE_ID, [REC_2], { sortOrder: 2 }),
          makeRow(SOURCE_ID, [REC_1], { sortOrder: 1 }),
        ],
        totalResults: 2,
      });

      const { result } = renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const ids = result.current.recommendations.map((p) => p.id);
      // REC_1 (sortOrder 1) should come before REC_2 (sortOrder 2)
      expect(ids.indexOf(REC_1.id)).toBeLessThan(ids.indexOf(REC_2.id));
    });
  });

  // ── Cap at MAX_RESULTS ───────────────────────────────────────────────────

  describe('result cap', () => {
    it('caps results at 8', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      // 10 products in a single row
      const allProds = PRODUCTS.slice(0, 10);
      mockQueryData.mockResolvedValue({
        items: [makeRow(SOURCE_ID, allProds)],
        totalResults: 1,
      });

      const { result } = renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.recommendations.length).toBeLessThanOrEqual(8);
    });

    it('flattens multiple rows and caps at 8 total', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      const batch1 = PRODUCTS.slice(0, 5);
      const batch2 = PRODUCTS.slice(5, 10);
      mockQueryData.mockResolvedValue({
        items: [
          makeRow(SOURCE_ID, batch1, { sortOrder: 1 }),
          makeRow(SOURCE_ID, batch2, { sortOrder: 2 }),
        ],
        totalResults: 2,
      });

      const { result } = renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.recommendations.length).toBeLessThanOrEqual(8);
    });
  });

  // ── productId change → re-fetch ──────────────────────────────────────────

  describe('productId change', () => {
    it('re-fetches when productId changes', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const { rerender } = renderHook(({ id }: { id: string }) => useProductRecommendations(id), {
        initialProps: { id: SOURCE_ID },
      });
      await waitFor(() => expect(mockQueryData).toHaveBeenCalledTimes(1));

      rerender({ id: REC_1.id });
      await waitFor(() => expect(mockQueryData).toHaveBeenCalledTimes(2));
    });
  });

  // ── Cache ────────────────────────────────────────────────────────────────

  describe('cache', () => {
    it('does not re-fetch within TTL', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const { unmount } = renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(mockQueryData).toHaveBeenCalledTimes(1));
      unmount();

      renderHook(() => useProductRecommendations(SOURCE_ID));
      await act(async () => {});
      expect(mockQueryData).toHaveBeenCalledTimes(1);
    });

    it('re-fetches after TTL expires (1 hour)', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const realDateNow = Date.now;
      try {
        Date.now = jest.fn().mockReturnValue(0);
        const { unmount } = renderHook(() => useProductRecommendations(SOURCE_ID));
        await waitFor(() => expect(mockQueryData).toHaveBeenCalledTimes(1));
        unmount();

        // Advance past 1-hour TTL
        Date.now = jest.fn().mockReturnValue(2 * 60 * 60 * 1000);
        renderHook(() => useProductRecommendations(SOURCE_ID));
        await waitFor(() => expect(mockQueryData).toHaveBeenCalledTimes(2));
      } finally {
        Date.now = realDateNow;
      }
    });
  });

  // ── Wix error → static fallback ──────────────────────────────────────────

  describe('Wix API failure — static fallback', () => {
    it('returns static fallback on Wix error', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      mockQueryData.mockRejectedValue(new Error('network error'));

      const { result } = renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(
        result.current.recommendations.every((p) => p.category === SOURCE_PRODUCT.category),
      ).toBe(true);
    });

    it('sets error field on Wix failure', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      mockQueryData.mockRejectedValue(new Error('timeout'));

      const { result } = renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).not.toBeNull();
    });

    it('static fallback excludes the source product', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);
      mockQueryData.mockRejectedValue(new Error('timeout'));

      const { result } = renderHook(() => useProductRecommendations(SOURCE_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.recommendations.find((p) => p.id === SOURCE_ID)).toBeUndefined();
    });
  });

  // ── isLoading transitions ─────────────────────────────────────────────────

  describe('loading state', () => {
    it('is true while fetching, false after', async () => {
      mockUseOptionalWixClient.mockReturnValue(mockWixClient);

      let resolveQuery!: (v: unknown) => void;
      mockQueryData.mockReturnValue(
        new Promise((res) => {
          resolveQuery = res;
        }),
      );

      const { result } = renderHook(() => useProductRecommendations(SOURCE_ID));
      expect(result.current.isLoading).toBe(true);

      act(() => resolveQuery({ items: [], totalResults: 0 }));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });
});

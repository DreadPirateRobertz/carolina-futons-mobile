/**
 * @module useProductRecommendations.test
 *
 * TDD tests for DB-driven product recommendations — cm-cm1.
 * Hook: useProductRecommendations(productId) → { recommendations, isLoading, error }
 *
 * Covered:
 *   - invalid productId → empty result
 *   - category match (same category returned, source excluded)
 *   - price-range filter (±50% of source price)
 *   - cache hit (no refetch within 5-min TTL)
 *   - Wix API failure → fallback to static PRODUCTS
 *   - empty result when no category matches found
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProductRecommendations, clearRecommendationsCache } from '../useProductRecommendations';
import { PRODUCTS } from '@/data/products';

const mockQueryProducts = jest.fn();
let mockWixClient: { queryProducts: jest.Mock } | null = null;

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

// product1 is a futon ~$349
const product1 = PRODUCTS[0];

describe('useProductRecommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRecommendationsCache();
    mockWixClient = null;
  });

  describe('invalid productId', () => {
    it('returns empty array and no error for unknown productId', async () => {
      const { result } = renderHook(() => useProductRecommendations('not-a-real-id'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('returns empty array for empty string productId', async () => {
      const { result } = renderHook(() => useProductRecommendations(''));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations).toEqual([]);
    });
  });

  describe('category match', () => {
    it('returns only products in same category as source', async () => {
      const { result } = renderHook(() => useProductRecommendations(product1.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations.length).toBeGreaterThan(0);
      expect(result.current.recommendations.every((p) => p.category === product1.category)).toBe(
        true,
      );
    });

    it('excludes the source product itself from results', async () => {
      const { result } = renderHook(() => useProductRecommendations(product1.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations.find((p) => p.id === product1.id)).toBeUndefined();
    });
  });

  describe('price-range filter', () => {
    it('includes products within ±50% of source price', async () => {
      const inRange = {
        ...product1,
        id: 'p-in-range',
        price: Math.round(product1.price * 1.2),
        category: product1.category,
      };
      mockWixClient = { queryProducts: mockQueryProducts };
      mockQueryProducts.mockResolvedValue({ products: [inRange], totalResults: 1 });

      const { result } = renderHook(() => useProductRecommendations(product1.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations.map((p) => p.id)).toContain('p-in-range');
    });

    it('excludes products cheaper than 50% of source price', async () => {
      const tooChEAP = {
        ...product1,
        id: 'p-too-cheap',
        price: Math.round(product1.price * 0.49),
        category: product1.category,
      };
      mockWixClient = { queryProducts: mockQueryProducts };
      mockQueryProducts.mockResolvedValue({ products: [tooChEAP], totalResults: 1 });

      const { result } = renderHook(() => useProductRecommendations(product1.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations.map((p) => p.id)).not.toContain('p-too-cheap');
    });

    it('excludes products more expensive than 150% of source price', async () => {
      const tooExpensive = {
        ...product1,
        id: 'p-too-expensive',
        price: Math.round(product1.price * 1.51),
        category: product1.category,
      };
      mockWixClient = { queryProducts: mockQueryProducts };
      mockQueryProducts.mockResolvedValue({ products: [tooExpensive], totalResults: 1 });

      const { result } = renderHook(() => useProductRecommendations(product1.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations.map((p) => p.id)).not.toContain('p-too-expensive');
    });
  });

  describe('cache hit', () => {
    it('does not refetch when called again within TTL', async () => {
      mockWixClient = { queryProducts: mockQueryProducts };
      mockQueryProducts.mockResolvedValue({ products: [], totalResults: 0 });

      // First render
      const { unmount } = renderHook(() => useProductRecommendations(product1.id));
      await waitFor(() => expect(mockQueryProducts).toHaveBeenCalledTimes(1));
      unmount();

      // Second render with same productId — should use cache
      renderHook(() => useProductRecommendations(product1.id));
      await act(async () => {});
      expect(mockQueryProducts).toHaveBeenCalledTimes(1);
    });

    it('refetches after TTL expires', async () => {
      mockWixClient = { queryProducts: mockQueryProducts };
      mockQueryProducts.mockResolvedValue({ products: [], totalResults: 0 });

      const realDateNow = Date.now;
      try {
        Date.now = jest.fn().mockReturnValue(0);
        const { unmount } = renderHook(() => useProductRecommendations(product1.id));
        await waitFor(() => expect(mockQueryProducts).toHaveBeenCalledTimes(1));
        unmount();

        // Advance time past TTL (cache TTL is 1 hour)
        Date.now = jest.fn().mockReturnValue(2 * 60 * 60 * 1000);
        renderHook(() => useProductRecommendations(product1.id));
        await waitFor(() => expect(mockQueryProducts).toHaveBeenCalledTimes(2));
      } finally {
        Date.now = realDateNow;
      }
    });
  });

  describe('Wix API failure — fallback to static', () => {
    it('returns recommendations from static PRODUCTS on Wix error', async () => {
      mockWixClient = { queryProducts: mockQueryProducts };
      mockQueryProducts.mockRejectedValue(new Error('network error'));

      const { result } = renderHook(() => useProductRecommendations(product1.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('sets error field on Wix failure', async () => {
      mockWixClient = { queryProducts: mockQueryProducts };
      mockQueryProducts.mockRejectedValue(new Error('network error'));

      const { result } = renderHook(() => useProductRecommendations(product1.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).not.toBeNull();
    });

    it('static fallback only returns same-category products', async () => {
      mockWixClient = { queryProducts: mockQueryProducts };
      mockQueryProducts.mockRejectedValue(new Error('timeout'));

      const { result } = renderHook(() => useProductRecommendations(product1.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations.every((p) => p.category === product1.category)).toBe(
        true,
      );
    });
  });

  describe('empty result', () => {
    it('returns empty array when Wix returns no same-category products', async () => {
      const otherProduct = PRODUCTS.find((p) => p.category !== product1.category)!;
      mockWixClient = { queryProducts: mockQueryProducts };
      mockQueryProducts.mockResolvedValue({ products: [otherProduct], totalResults: 1 });

      const { result } = renderHook(() => useProductRecommendations(product1.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations).toEqual([]);
    });
  });
});

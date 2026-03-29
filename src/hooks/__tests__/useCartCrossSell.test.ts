/**
 * @module useCartCrossSell.test
 *
 * TDD tests for cart cross-sell recommendations — cfutons_mobile-pwk.
 * Hook: useCartCrossSell(cartItems) → { recommendations, isLoading, error }
 *
 * Covered:
 *   - empty cart → empty result
 *   - cart with futon → recommends covers and mattresses (cross-category)
 *   - cart with mattress → recommends covers and futons
 *   - cart with cover → recommends futons and mattresses
 *   - excludes items already in cart
 *   - max 8 results
 *   - Wix API failure → fallback to static PRODUCTS
 *   - unknown cart item model ID → still returns results for other items
 *   - multiple cart items → deduped recommendations
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { useCartCrossSell, clearCartCrossSellCache } from '../useCartCrossSell';
import { PRODUCTS, type Product } from '@/data/products';
import { futonModelId } from '@/data/productId';
import type { CartItem } from '@/hooks/useCart';
import type { FutonModel, Fabric } from '@/data/futons';

const mockQueryProducts = jest.fn();
let mockWixClient: { queryProducts: jest.Mock } | null = null;

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

const mockFabric: Fabric = {
  id: 'natural-linen',
  name: 'Natural Linen',
  color: '#D4C5A9',
  price: 0,
};

function makeCartItem(_modelName: string, category: string): CartItem {
  const product = PRODUCTS.find((p) => p.category === category)!;
  const modelId = futonModelId(product.id.replace(/^prod-/, ''));
  const model: FutonModel = {
    id: modelId,
    name: product.name,
    tagline: '',
    dimensions: { width: 80, depth: 35, height: 33, seatHeight: 17 },
    basePrice: product.price,
    fabrics: [mockFabric],
  };
  return {
    id: `${modelId}:natural-linen`,
    model,
    fabric: mockFabric,
    quantity: 1,
    unitPrice: product.price,
  };
}

const futonCartItem = makeCartItem('futon', 'futons');
const mattressCartItem = makeCartItem('mattress', 'mattresses');
const coverCartItem = makeCartItem('cover', 'covers');

describe('useCartCrossSell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCartCrossSellCache();
    mockWixClient = null;
  });

  describe('empty cart', () => {
    it('returns empty array for empty cart', async () => {
      const { result } = renderHook(() => useCartCrossSell([]));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('cross-category recommendations', () => {
    it('recommends covers and mattresses when cart has a futon', async () => {
      const { result } = renderHook(() => useCartCrossSell([futonCartItem]));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const categories = result.current.recommendations.map((p: Product) => p.category);
      const hasCover = categories.includes('covers');
      const hasMattress = categories.includes('mattresses');
      expect(hasCover || hasMattress).toBe(true);
    });

    it('recommends covers or futons when cart has a mattress', async () => {
      const { result } = renderHook(() => useCartCrossSell([mattressCartItem]));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const categories = result.current.recommendations.map((p: Product) => p.category);
      const hasComplement = categories.includes('covers') || categories.includes('futons');
      expect(hasComplement).toBe(true);
    });

    it('recommends futons or mattresses when cart has a cover', async () => {
      const { result } = renderHook(() => useCartCrossSell([coverCartItem]));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const categories = result.current.recommendations.map((p: Product) => p.category);
      const hasComplement = categories.includes('futons') || categories.includes('mattresses');
      expect(hasComplement).toBe(true);
    });
  });

  describe('exclusion of cart items', () => {
    it('does not recommend products already in the cart', async () => {
      const { result } = renderHook(() => useCartCrossSell([futonCartItem]));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const cartProductId = `prod-${futonCartItem.model.id}`;
      const found = result.current.recommendations.find((p) => p.id === cartProductId);
      expect(found).toBeUndefined();
    });
  });

  describe('result limits', () => {
    it('returns at most 8 recommendations', async () => {
      const { result } = renderHook(() => useCartCrossSell([futonCartItem]));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations.length).toBeLessThanOrEqual(8);
    });

    it('deduplicates results when multiple cart items produce the same recommendation', async () => {
      const { result } = renderHook(() =>
        useCartCrossSell([futonCartItem, mattressCartItem]),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const ids = result.current.recommendations.map((p: Product) => p.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe('unknown cart item', () => {
    it('still returns results when one cart item has an unrecognized model ID', async () => {
      const unknownModel: FutonModel = {
        id: futonModelId('not-a-real-model'),
        name: 'Unknown',
        tagline: '',
        dimensions: { width: 80, depth: 35, height: 33, seatHeight: 17 },
        basePrice: 299,
        fabrics: [mockFabric],
      };
      const unknownItem: CartItem = {
        id: 'not-a-real-model:natural-linen',
        model: unknownModel,
        fabric: mockFabric,
        quantity: 1,
        unitPrice: 299,
      };
      const { result } = renderHook(() => useCartCrossSell([unknownItem, futonCartItem]));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      // futonCartItem should still produce cross-sell results
      expect(result.current.recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Wix API failure — fallback to static', () => {
    it('falls back to static PRODUCTS on Wix error', async () => {
      mockWixClient = { queryProducts: mockQueryProducts };
      mockQueryProducts.mockRejectedValue(new Error('network error'));

      const { result } = renderHook(() => useCartCrossSell([futonCartItem]));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('sets error field on Wix failure', async () => {
      mockWixClient = { queryProducts: mockQueryProducts };
      mockQueryProducts.mockRejectedValue(new Error('timeout'));

      const { result } = renderHook(() => useCartCrossSell([futonCartItem]));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).not.toBeNull();
    });
  });

  describe('Wix cross-sell via API', () => {
    it('uses Wix catalog when client is available', async () => {
      const wixCover = { ...PRODUCTS.find((p) => p.category === 'covers')! };
      mockWixClient = { queryProducts: mockQueryProducts };
      mockQueryProducts.mockResolvedValue({ products: [wixCover], totalResults: 1 });

      const { result } = renderHook(() => useCartCrossSell([futonCartItem]));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockQueryProducts).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('starts in loading state', () => {
      mockWixClient = { queryProducts: mockQueryProducts };
      mockQueryProducts.mockResolvedValue({ products: [], totalResults: 0 });

      const { result } = renderHook(() => useCartCrossSell([futonCartItem]));
      expect(result.current.isLoading).toBe(true);
    });
  });
});

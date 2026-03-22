import { renderHook, waitFor } from '@testing-library/react-native';
import { useBundleDeals } from '../useBundleDeals';
import { PRODUCTS } from '@/data/products';

// Mock wixProvider
const mockQueryData = jest.fn();
const mockUseOptionalWixClient = jest.fn(() => null);
jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

/** First two real product IDs from the catalog for use in test fixtures */
const PRODUCT_A = PRODUCTS[0];
const PRODUCT_B = PRODUCTS[1];

/** A BundleDeals data item for a given productId */
function makeBundleData(productId: string, relatedProductIds: string[]): Record<string, unknown> {
  return { productId, relatedProductIds };
}

describe('useBundleDeals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptionalWixClient.mockReturnValue(null);
  });

  describe('without Wix client', () => {
    it('returns empty bundleProducts and isLoading=false when no wix client', async () => {
      const { result } = renderHook(() => useBundleDeals(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.bundleProducts).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('does not call queryData when no wix client', async () => {
      const { result } = renderHook(() => useBundleDeals(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockQueryData).not.toHaveBeenCalled();
    });
  });

  describe('with Wix client', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue({ queryData: mockQueryData } as any);
    });

    it('fetches from BundleDeals collection filtered by productId', async () => {
      mockQueryData.mockResolvedValue({
        items: [makeBundleData(PRODUCT_A.id, [PRODUCT_B.id])],
        totalResults: 1,
      });

      const { result } = renderHook(() => useBundleDeals(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockQueryData).toHaveBeenCalledWith(
        'BundleDeals',
        expect.objectContaining({
          filter: { productId: { $eq: PRODUCT_A.id } },
        }),
      );
    });

    it('returns Product objects matching relatedProductIds', async () => {
      mockQueryData.mockResolvedValue({
        items: [makeBundleData(PRODUCT_A.id, [PRODUCT_B.id])],
        totalResults: 1,
      });

      const { result } = renderHook(() => useBundleDeals(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.bundleProducts).toHaveLength(1);
      expect(result.current.bundleProducts[0].id).toBe(PRODUCT_B.id);
    });

    it('returns multiple bundle products when relatedProductIds has multiple entries', async () => {
      const relatedIds = PRODUCTS.slice(2, 4).map((p) => p.id);
      mockQueryData.mockResolvedValue({
        items: [makeBundleData(PRODUCT_A.id, relatedIds)],
        totalResults: 1,
      });

      const { result } = renderHook(() => useBundleDeals(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.bundleProducts).toHaveLength(2);
      expect(result.current.bundleProducts.map((p) => p.id)).toEqual(relatedIds);
    });

    it('returns empty array when no BundleDeals entry exists for product', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const { result } = renderHook(() => useBundleDeals(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.bundleProducts).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('filters out unknown product IDs silently', async () => {
      mockQueryData.mockResolvedValue({
        items: [makeBundleData(PRODUCT_A.id, ['not-a-real-id', PRODUCT_B.id])],
        totalResults: 1,
      });

      const { result } = renderHook(() => useBundleDeals(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.bundleProducts).toHaveLength(1);
      expect(result.current.bundleProducts[0].id).toBe(PRODUCT_B.id);
    });

    it('sets isLoading=true then false on success', async () => {
      let resolveQuery!: (value: { items: unknown[]; totalResults: number }) => void;
      mockQueryData.mockReturnValue(
        new Promise((res) => {
          resolveQuery = res;
        }),
      );

      const { result } = renderHook(() => useBundleDeals(PRODUCT_A.id));
      expect(result.current.isLoading).toBe(true);

      resolveQuery({ items: [], totalResults: 0 });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('sets error and empty products on Wix API failure', async () => {
      mockQueryData.mockRejectedValue(new Error('Wix API unavailable'));

      const { result } = renderHook(() => useBundleDeals(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toEqual(new Error('Wix API unavailable'));
      expect(result.current.bundleProducts).toEqual([]);
    });

    it('wraps non-Error rejections in an Error object', async () => {
      mockQueryData.mockRejectedValue('string error');

      const { result } = renderHook(() => useBundleDeals(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('clears error on subsequent successful fetch', async () => {
      mockQueryData.mockRejectedValueOnce(new Error('first failure'));

      const { result, rerender } = renderHook(({ id }) => useBundleDeals(id), {
        initialProps: { id: PRODUCT_A.id },
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).not.toBeNull();

      mockQueryData.mockResolvedValueOnce({ items: [], totalResults: 0 });
      rerender({ id: PRODUCT_B.id });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeNull();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue({ queryData: mockQueryData } as any);
    });

    it('returns empty and skips fetch when productId is empty string', async () => {
      const { result } = renderHook(() => useBundleDeals(''));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockQueryData).not.toHaveBeenCalled();
      expect(result.current.bundleProducts).toEqual([]);
    });

    it('re-fetches when productId changes', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const { result, rerender } = renderHook(({ id }) => useBundleDeals(id), {
        initialProps: { id: PRODUCT_A.id },
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockQueryData).toHaveBeenCalledTimes(1);

      rerender({ id: PRODUCT_B.id });
      await waitFor(() => expect(mockQueryData).toHaveBeenCalledTimes(2));
    });

    it('handles entry with undefined relatedProductIds gracefully', async () => {
      mockQueryData.mockResolvedValue({
        items: [{ productId: PRODUCT_A.id }],
        totalResults: 1,
      });

      const { result } = renderHook(() => useBundleDeals(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.bundleProducts).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles entry with empty relatedProductIds array', async () => {
      mockQueryData.mockResolvedValue({
        items: [makeBundleData(PRODUCT_A.id, [])],
        totalResults: 1,
      });

      const { result } = renderHook(() => useBundleDeals(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.bundleProducts).toEqual([]);
    });
  });
});

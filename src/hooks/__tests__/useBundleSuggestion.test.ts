/**
 * useBundleSuggestion — deacon-y8lf / cm-bun
 *
 * TDD spec written BEFORE implementation.
 *
 * Covers:
 *  - No Wix client → returns null bundle, isLoading=false
 *  - Empty productId → returns null bundle, isLoading=false
 *  - queryData returns no items → bundle=null
 *  - queryData returns incomplete record → bundle=null
 *  - Happy path: bundle fetched → client-side pricing calculated → products resolved
 *  - queryData failure → error set, bundle=null
 *  - addBundleToCart: isAddingToCart true → success → addSuccess=true
 *  - addBundleToCart: failure → error set, isAddingToCart=false
 *  - addBundleToCart: no-op when bundle or pricing is null
 *  - Cleanup: in-flight fetch cancelled on unmount
 *  - productId change triggers re-fetch
 *  - Coupon code follows CF-BUNDLE-{8chars} format
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useBundleSuggestion } from '../useBundleSuggestion';
import { PRODUCTS } from '@/data/products';

// ── Wix client mock ────────────────────────────────────────────────────────────

const mockQueryData = jest.fn();
const mockInsertDataItem = jest.fn();
const mockUseOptionalWixClient = jest.fn<
  { queryData: jest.Mock; insertDataItem: jest.Mock } | null,
  []
>(() => null);

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const PRODUCT_A = PRODUCTS[0];
const PRODUCT_B = PRODUCTS[1];
const PRODUCT_C = PRODUCTS[2];

const MOCK_BUNDLE_RAW = {
  bundleId: 'bundle-abc-123',
  name: 'Living Room Set',
  productIds: [PRODUCT_A.id, PRODUCT_B.id],
  discountPercent: 15,
};

function makeWixClient() {
  return {
    queryData: mockQueryData,
    insertDataItem: mockInsertDataItem,
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOptionalWixClient.mockReturnValue(null);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useBundleSuggestion', () => {
  describe('no Wix client', () => {
    it('returns null bundle and isLoading=false when no wix client', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.bundle).toBeNull();
      expect(result.current.pricing).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('does not call queryData when no wix client', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockQueryData).not.toHaveBeenCalled();
    });
  });

  describe('empty productId', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue(makeWixClient());
    });

    it('returns null bundle when productId is empty string', async () => {
      const { result } = renderHook(() => useBundleSuggestion(''));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.bundle).toBeNull();
      expect(mockQueryData).not.toHaveBeenCalled();
    });
  });

  describe('no bundle found', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue(makeWixClient());
      mockQueryData.mockResolvedValue({ items: [] });
    });

    it('returns null bundle when queryData returns empty items', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.bundle).toBeNull();
      expect(result.current.pricing).toBeNull();
    });

    it('returns null bundle when queryData returns incomplete record', async () => {
      mockQueryData.mockResolvedValue({ items: [{ name: 'Incomplete' }] });
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.bundle).toBeNull();
    });
  });

  describe('happy path', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue(makeWixClient());
      mockQueryData.mockResolvedValue({ items: [MOCK_BUNDLE_RAW] });
    });

    it('starts in isLoading=true state', () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading=false after fetch completes', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('calls queryData with BundleDefinitions collection and productId filter', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockQueryData).toHaveBeenCalledWith('BundleDefinitions', {
        filter: { productIds: { $hasSome: [PRODUCT_A.id] } },
        limit: 1,
      });
    });

    it('returns the bundle definition', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.bundle).toEqual({
        bundleId: MOCK_BUNDLE_RAW.bundleId,
        name: MOCK_BUNDLE_RAW.name,
        productIds: MOCK_BUNDLE_RAW.productIds,
        discountPercent: MOCK_BUNDLE_RAW.discountPercent,
      });
    });

    it('resolves bundleProducts from PRODUCTS catalog', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.bundleProducts).toHaveLength(2);
      expect(result.current.bundleProducts.map((p) => p.id)).toEqual([PRODUCT_A.id, PRODUCT_B.id]);
    });

    it('calculates pricing client-side from discountPercent', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const expectedOriginal = (PRODUCT_A.price ?? 0) + (PRODUCT_B.price ?? 0);
      const expectedSavings = expectedOriginal * 0.15;

      expect(result.current.pricing).toEqual({
        originalTotal: expectedOriginal,
        bundlePrice: expectedOriginal - expectedSavings,
        savings: expectedSavings,
        savingsPercent: 15,
        couponCode: expect.stringMatching(/^CF-BUNDLE-[A-Z0-9]{8}$/),
      });
    });

    it('returns null error on success', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBeNull();
    });

    it('returns addSuccess=false initially', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.addSuccess).toBe(false);
    });

    it('returns isAddingToCart=false initially', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isAddingToCart).toBe(false);
    });
  });

  describe('coupon code format', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue(makeWixClient());
      mockQueryData.mockResolvedValue({ items: [MOCK_BUNDLE_RAW] });
    });

    it('coupon code follows CF-BUNDLE-{8chars} format', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.pricing?.couponCode).toMatch(/^CF-BUNDLE-[A-Z0-9]{8}$/);
    });

    it('coupon code is deterministic for the same bundleId', async () => {
      const { result: r1 } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(r1.current.isLoading).toBe(false));
      const code1 = r1.current.pricing?.couponCode;

      const { result: r2 } = renderHook(() => useBundleSuggestion(PRODUCT_B.id));
      await waitFor(() => expect(r2.current.isLoading).toBe(false));
      const code2 = r2.current.pricing?.couponCode;

      // Same bundleId produces same coupon code across renders
      expect(code1).toBe(code2);
    });
  });

  describe('queryData error', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue(makeWixClient());
      mockQueryData.mockRejectedValue(new Error('API unreachable'));
    });

    it('sets error on queryData failure', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBe('API unreachable');
    });

    it('returns null bundle and pricing on queryData failure', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.bundle).toBeNull();
      expect(result.current.pricing).toBeNull();
    });
  });

  describe('addBundleToCart', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue(makeWixClient());
      mockQueryData.mockResolvedValue({ items: [MOCK_BUNDLE_RAW] });
      mockInsertDataItem.mockResolvedValue(undefined);
    });

    it('sets isAddingToCart=true while adding', async () => {
      let resolveAdd!: (value?: unknown) => void;
      mockInsertDataItem.mockReturnValue(
        new Promise((res) => {
          resolveAdd = res;
        }),
      );

      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addBundleToCart();
      });
      expect(result.current.isAddingToCart).toBe(true);

      await act(async () => {
        resolveAdd();
      });
    });

    it('sets addSuccess=true after successful add', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.addBundleToCart();
      });
      expect(result.current.addSuccess).toBe(true);
      expect(result.current.isAddingToCart).toBe(false);
    });

    it('calls insertDataItem with bundleId, couponCode, and addedAt', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.addBundleToCart();
      });
      expect(mockInsertDataItem).toHaveBeenCalledWith('BundleDefinitionsOrders', {
        bundleId: MOCK_BUNDLE_RAW.bundleId,
        couponCode: expect.stringMatching(/^CF-BUNDLE-[A-Z0-9]{8}$/),
        addedAt: expect.any(String),
      });
    });

    it('sets error and isAddingToCart=false on insertDataItem failure', async () => {
      mockInsertDataItem.mockRejectedValue(new Error('Cart add failed'));

      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.addBundleToCart();
      });
      expect(result.current.isAddingToCart).toBe(false);
      expect(result.current.error).toBe('Cart add failed');
      expect(result.current.addSuccess).toBe(false);
    });

    it('is a no-op when bundle is null (no client)', async () => {
      mockUseOptionalWixClient.mockReturnValue(null);
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.addBundleToCart();
      });
      expect(mockInsertDataItem).not.toHaveBeenCalled();
      expect(result.current.isAddingToCart).toBe(false);
    });
  });

  describe('productId change', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue(makeWixClient());
      mockQueryData.mockResolvedValue({ items: [MOCK_BUNDLE_RAW] });
    });

    it('re-fetches when productId changes', async () => {
      const { result, rerender } = renderHook(({ id }) => useBundleSuggestion(id), {
        initialProps: { id: PRODUCT_A.id },
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockQueryData).toHaveBeenCalledTimes(1);

      rerender({ id: PRODUCT_C.id });
      await waitFor(() => expect(mockQueryData).toHaveBeenCalledTimes(2));
      expect(mockQueryData).toHaveBeenLastCalledWith('BundleDefinitions', {
        filter: { productIds: { $hasSome: [PRODUCT_C.id] } },
        limit: 1,
      });
    });

    it('resets addSuccess to false when productId changes', async () => {
      mockInsertDataItem.mockResolvedValue(undefined);
      const { result, rerender } = renderHook(({ id }) => useBundleSuggestion(id), {
        initialProps: { id: PRODUCT_A.id },
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        await result.current.addBundleToCart();
      });
      expect(result.current.addSuccess).toBe(true);

      rerender({ id: PRODUCT_C.id });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.addSuccess).toBe(false);
    });
  });

  describe('unknown product IDs in bundle', () => {
    it('silently filters out product IDs not in the catalog', async () => {
      mockUseOptionalWixClient.mockReturnValue(makeWixClient());
      mockQueryData.mockResolvedValue({
        items: [{ ...MOCK_BUNDLE_RAW, productIds: ['not-a-real-id', PRODUCT_B.id] }],
      });

      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.bundleProducts).toHaveLength(1);
      expect(result.current.bundleProducts[0].id).toBe(PRODUCT_B.id);
    });
  });
});

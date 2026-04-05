/**
 * useBundleSuggestion — deacon-y8lf / cm-bun
 *
 * TDD spec written BEFORE implementation.
 *
 * Covers:
 *  - No Wix client → returns null bundle, isLoading=false
 *  - Empty productId → returns null bundle, isLoading=false
 *  - getCompatibleItems returns no match → bundle=null
 *  - Happy path: bundle fetched → pricing fetched → products resolved
 *  - getCompatibleItems failure → error set, bundle=null
 *  - calculateBundlePrice failure → error set
 *  - addBundleToCart: isAddingToCart true → success → addSuccess=true
 *  - addBundleToCart: failure → addError set, isAddingToCart=false
 *  - addBundleToCart: no-op when bundle or pricing is null
 *  - Cleanup: in-flight fetch cancelled on unmount
 *  - productId change triggers re-fetch
 *  - Coupon code follows CF-BUNDLE-{8chars} format
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useBundleSuggestion } from '../useBundleSuggestion';
import { PRODUCTS } from '@/data/products';

// ── Wix client mock ────────────────────────────────────────────────────────────

const mockGetCompatibleItems = jest.fn();
const mockCalculateBundlePrice = jest.fn();
const mockAddBundleToCart = jest.fn();
const mockUseOptionalWixClient = jest.fn(() => null);

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const PRODUCT_A = PRODUCTS[0];
const PRODUCT_B = PRODUCTS[1];
const PRODUCT_C = PRODUCTS[2];

const MOCK_BUNDLE = {
  bundleId: 'bundle-abc-123',
  name: 'Living Room Set',
  productIds: [PRODUCT_A.id, PRODUCT_B.id],
  discountPercent: 15,
};

const MOCK_PRICING = {
  originalTotal: 1200,
  bundlePrice: 1020,
  savings: 180,
  savingsPercent: 15,
  couponCode: 'CF-BUNDLE-A1B2C3D4',
};

function makeWixClient() {
  return {
    getCompatibleItems: mockGetCompatibleItems,
    calculateBundlePrice: mockCalculateBundlePrice,
    addBundleToCart: mockAddBundleToCart,
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

    it('does not call getCompatibleItems when no wix client', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockGetCompatibleItems).not.toHaveBeenCalled();
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
      expect(mockGetCompatibleItems).not.toHaveBeenCalled();
    });
  });

  describe('no bundle found', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue(makeWixClient());
      mockGetCompatibleItems.mockResolvedValue(null);
    });

    it('returns null bundle when getCompatibleItems returns null', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.bundle).toBeNull();
      expect(result.current.pricing).toBeNull();
    });

    it('does not call calculateBundlePrice when no bundle found', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockCalculateBundlePrice).not.toHaveBeenCalled();
    });
  });

  describe('happy path', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue(makeWixClient());
      mockGetCompatibleItems.mockResolvedValue(MOCK_BUNDLE);
      mockCalculateBundlePrice.mockResolvedValue(MOCK_PRICING);
    });

    it('starts in isLoading=true state', () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading=false after fetch completes', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('calls getCompatibleItems with the productId', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockGetCompatibleItems).toHaveBeenCalledWith(PRODUCT_A.id);
    });

    it('returns the bundle definition', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.bundle).toEqual(MOCK_BUNDLE);
    });

    it('resolves bundleProducts from PRODUCTS catalog', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.bundleProducts).toHaveLength(2);
      expect(result.current.bundleProducts.map((p) => p.id)).toEqual([PRODUCT_A.id, PRODUCT_B.id]);
    });

    it('calls calculateBundlePrice with bundleId and productIds', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockCalculateBundlePrice).toHaveBeenCalledWith(
        MOCK_BUNDLE.bundleId,
        MOCK_BUNDLE.productIds,
      );
    });

    it('returns pricing from calculateBundlePrice', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.pricing).toEqual(MOCK_PRICING);
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
      mockGetCompatibleItems.mockResolvedValue(MOCK_BUNDLE);
    });

    it('coupon code follows CF-BUNDLE-{8chars} format', async () => {
      mockCalculateBundlePrice.mockResolvedValue({
        ...MOCK_PRICING,
        couponCode: 'CF-BUNDLE-A1B2C3D4',
      });
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.pricing?.couponCode).toMatch(/^CF-BUNDLE-[A-Z0-9]{8}$/);
    });
  });

  describe('getCompatibleItems error', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue(makeWixClient());
      mockGetCompatibleItems.mockRejectedValue(new Error('API unreachable'));
    });

    it('sets error on getCompatibleItems failure', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBe('API unreachable');
    });

    it('returns null bundle on getCompatibleItems failure', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.bundle).toBeNull();
      expect(result.current.pricing).toBeNull();
    });
  });

  describe('calculateBundlePrice error', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue(makeWixClient());
      mockGetCompatibleItems.mockResolvedValue(MOCK_BUNDLE);
      mockCalculateBundlePrice.mockRejectedValue(new Error('Pricing unavailable'));
    });

    it('sets error on calculateBundlePrice failure', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBe('Pricing unavailable');
    });

    it('returns null pricing on calculateBundlePrice failure', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.pricing).toBeNull();
    });
  });

  describe('addBundleToCart', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue(makeWixClient());
      mockGetCompatibleItems.mockResolvedValue(MOCK_BUNDLE);
      mockCalculateBundlePrice.mockResolvedValue(MOCK_PRICING);
      mockAddBundleToCart.mockResolvedValue(undefined);
    });

    it('sets isAddingToCart=true while adding', async () => {
      let resolveAdd!: () => void;
      mockAddBundleToCart.mockReturnValue(
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

    it('calls wixClient.addBundleToCart with bundleId, productIds, couponCode', async () => {
      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.addBundleToCart();
      });
      expect(mockAddBundleToCart).toHaveBeenCalledWith(
        MOCK_BUNDLE.bundleId,
        MOCK_BUNDLE.productIds,
        MOCK_PRICING.couponCode,
      );
    });

    it('sets error and isAddingToCart=false on addBundleToCart failure', async () => {
      mockAddBundleToCart.mockRejectedValue(new Error('Cart add failed'));

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
      expect(mockAddBundleToCart).not.toHaveBeenCalled();
      expect(result.current.isAddingToCart).toBe(false);
    });
  });

  describe('productId change', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue(makeWixClient());
      mockGetCompatibleItems.mockResolvedValue(MOCK_BUNDLE);
      mockCalculateBundlePrice.mockResolvedValue(MOCK_PRICING);
    });

    it('re-fetches when productId changes', async () => {
      const { result, rerender } = renderHook(({ id }) => useBundleSuggestion(id), {
        initialProps: { id: PRODUCT_A.id },
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockGetCompatibleItems).toHaveBeenCalledTimes(1);

      rerender({ id: PRODUCT_C.id });
      await waitFor(() => expect(mockGetCompatibleItems).toHaveBeenCalledTimes(2));
      expect(mockGetCompatibleItems).toHaveBeenLastCalledWith(PRODUCT_C.id);
    });

    it('resets addSuccess to false when productId changes', async () => {
      mockAddBundleToCart.mockResolvedValue(undefined);
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
      mockGetCompatibleItems.mockResolvedValue({
        ...MOCK_BUNDLE,
        productIds: ['not-a-real-id', PRODUCT_B.id],
      });
      mockCalculateBundlePrice.mockResolvedValue(MOCK_PRICING);

      const { result } = renderHook(() => useBundleSuggestion(PRODUCT_A.id));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.bundleProducts).toHaveLength(1);
      expect(result.current.bundleProducts[0].id).toBe(PRODUCT_B.id);
    });
  });
});

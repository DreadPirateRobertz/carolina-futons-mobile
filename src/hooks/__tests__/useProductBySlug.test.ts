import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProductBySlug } from '../useProduct';
import { PRODUCTS, type Product } from '@/data/products';

// ── Mocks ──────────────────────────────────────────────────────

const mockGetProductBySlug = jest.fn<Promise<Product | null>, [string]>();

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: jest.fn(() => null),
}));

jest.mock('@/services/wix/config', () => ({
  isWixConfigured: jest.fn(() => false),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useOptionalWixClient } = require('@/services/wix/wixProvider') as {
  useOptionalWixClient: jest.Mock;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { isWixConfigured } = require('@/services/wix/config') as {
  isWixConfigured: jest.Mock;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { captureException } = require('@/services/crashReporting') as {
  captureException: jest.Mock;
};

// ── Helpers ────────────────────────────────────────────────────

const knownProduct = PRODUCTS[0];
const knownSlug = knownProduct.slug;

/** A product that only exists on the "server" (not in PRODUCTS). */
const wixOnlyProduct: Product = {
  ...knownProduct,
  id: 'wix-only-product' as Product['id'],
  name: 'Wix-Only Futon',
  slug: 'wix-only-futon',
};

function enableWix() {
  isWixConfigured.mockReturnValue(true);
  useOptionalWixClient.mockReturnValue({ getProductBySlug: mockGetProductBySlug });
}

function disableWix() {
  isWixConfigured.mockReturnValue(false);
  useOptionalWixClient.mockReturnValue(null);
}

// ── Setup / Teardown ───────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  disableWix();
  mockGetProductBySlug.mockReset();
});

// ── Tests ──────────────────────────────────────────────────────

describe('useProductBySlug', () => {
  // --- Static match (no Wix) ---

  describe('static PRODUCTS match', () => {
    it('returns a product matching a known slug', () => {
      const { result } = renderHook(() => useProductBySlug(knownSlug));
      expect(result.current.product).toEqual(knownProduct);
    });

    it('returns isLoading=false immediately for static match', () => {
      const { result } = renderHook(() => useProductBySlug(knownSlug));
      expect(result.current.isLoading).toBe(false);
    });

    it('returns error=null for static match', () => {
      const { result } = renderHook(() => useProductBySlug(knownSlug));
      expect(result.current.error).toBeNull();
    });

    it('does NOT call Wix API when static match exists (even if Wix enabled)', () => {
      enableWix();
      renderHook(() => useProductBySlug(knownSlug));
      expect(mockGetProductBySlug).not.toHaveBeenCalled();
    });

    it('finds every product in catalog by slug', () => {
      for (const expected of PRODUCTS) {
        const { result } = renderHook(() => useProductBySlug(expected.slug));
        expect(result.current.product).toEqual(expected);
      }
    });
  });

  // --- Empty / invalid slug ---

  describe('empty slug', () => {
    it('returns product=null for empty string', () => {
      const { result } = renderHook(() => useProductBySlug(''));
      expect(result.current.product).toBeNull();
    });

    it('returns isLoading=false for empty string', () => {
      const { result } = renderHook(() => useProductBySlug(''));
      expect(result.current.isLoading).toBe(false);
    });

    it('returns error=null for empty string', () => {
      const { result } = renderHook(() => useProductBySlug(''));
      expect(result.current.error).toBeNull();
    });

    it('does not call Wix API for empty slug even if Wix enabled', () => {
      enableWix();
      renderHook(() => useProductBySlug(''));
      expect(mockGetProductBySlug).not.toHaveBeenCalled();
    });
  });

  // --- No static match, no Wix ---

  describe('unknown slug without Wix', () => {
    it('returns product=null for unknown slug', () => {
      const { result } = renderHook(() => useProductBySlug('no-such-futon'));
      expect(result.current.product).toBeNull();
    });

    it('returns isLoading=false (no fetch to perform)', () => {
      const { result } = renderHook(() => useProductBySlug('no-such-futon'));
      expect(result.current.isLoading).toBe(false);
    });
  });

  // --- Wix API fetch ---

  describe('Wix API fetch (no static match)', () => {
    beforeEach(() => {
      enableWix();
    });

    it('calls getProductBySlug with the slug', async () => {
      mockGetProductBySlug.mockResolvedValue(wixOnlyProduct);
      renderHook(() => useProductBySlug('wix-only-futon'));

      await waitFor(() => {
        expect(mockGetProductBySlug).toHaveBeenCalledWith('wix-only-futon');
      });
    });

    it('sets isLoading=true while fetching', () => {
      mockGetProductBySlug.mockReturnValue(new Promise(() => {})); // never resolves
      const { result } = renderHook(() => useProductBySlug('wix-only-futon'));
      expect(result.current.isLoading).toBe(true);
    });

    it('returns the fetched product after resolve', async () => {
      mockGetProductBySlug.mockResolvedValue(wixOnlyProduct);
      const { result } = renderHook(() => useProductBySlug('wix-only-futon'));

      await waitFor(() => {
        expect(result.current.product).toEqual(wixOnlyProduct);
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('returns product=null when API returns null', async () => {
      mockGetProductBySlug.mockResolvedValue(null);
      const { result } = renderHook(() => useProductBySlug('wix-only-futon'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.product).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  // --- Error handling ---

  describe('error handling', () => {
    beforeEach(() => {
      enableWix();
    });

    it('sets error on API rejection (Error instance)', async () => {
      const apiError = new Error('Network failure');
      mockGetProductBySlug.mockRejectedValue(apiError);
      const { result } = renderHook(() => useProductBySlug('wix-only-futon'));

      await waitFor(() => {
        expect(result.current.error).toBe(apiError);
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.product).toBeNull();
    });

    it('wraps non-Error rejection in Error', async () => {
      mockGetProductBySlug.mockRejectedValue('string error');
      const { result } = renderHook(() => useProductBySlug('wix-only-futon'));

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('string error');
      });
    });

    it('calls captureException on API error', async () => {
      const apiError = new Error('Server error');
      mockGetProductBySlug.mockRejectedValue(apiError);
      renderHook(() => useProductBySlug('wix-only-futon'));

      await waitFor(() => {
        expect(captureException).toHaveBeenCalledWith(
          apiError,
          'error',
          expect.objectContaining({ action: 'wix-product-by-slug', slug: 'wix-only-futon' }),
        );
      });
    });
  });

  // --- Abort / cleanup on unmount ---

  describe('abort controller cleanup', () => {
    beforeEach(() => {
      enableWix();
    });

    it('does not update state after unmount (aborted fetch)', async () => {
      let resolvePromise: (v: Product | null) => void;
      mockGetProductBySlug.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
      );

      const { result, unmount } = renderHook(() => useProductBySlug('wix-only-futon'));
      expect(result.current.isLoading).toBe(true);

      unmount();

      // Resolve after unmount — should not throw or update state
      await act(async () => {
        resolvePromise!(wixOnlyProduct);
      });
      // If we get here without "Can't perform a React state update on an unmounted component"
      // warning, the abort controller is working.
    });

    it('aborts previous fetch when slug changes', async () => {
      let firstResolve: (v: Product | null) => void;
      const firstPromise = new Promise<Product | null>((resolve) => {
        firstResolve = resolve;
      });
      mockGetProductBySlug.mockReturnValueOnce(firstPromise).mockResolvedValueOnce(wixOnlyProduct);

      const { result, rerender } = renderHook(
        ({ slug }: { slug: string }) => useProductBySlug(slug),
        { initialProps: { slug: 'first-slug' } },
      );

      // Change slug before first resolves
      rerender({ slug: 'wix-only-futon' });

      await waitFor(() => {
        expect(result.current.product).toEqual(wixOnlyProduct);
      });

      // Resolve first — should be ignored (aborted)
      await act(async () => {
        firstResolve!(null);
      });

      // Still shows second result, not null from first
      expect(result.current.product).toEqual(wixOnlyProduct);
    });
  });

  // --- Refresh ---

  describe('refresh', () => {
    it('returns a function', () => {
      const { result } = renderHook(() => useProductBySlug(knownSlug));
      expect(typeof result.current.refresh).toBe('function');
    });

    it('triggers re-fetch from Wix API on refresh', async () => {
      enableWix();
      mockGetProductBySlug.mockResolvedValue(wixOnlyProduct);

      const { result } = renderHook(() => useProductBySlug('wix-only-futon'));

      await waitFor(() => {
        expect(mockGetProductBySlug).toHaveBeenCalledTimes(1);
      });

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(mockGetProductBySlug).toHaveBeenCalledTimes(2);
      });
    });

    it('refresh on static-match slug does not throw', () => {
      const { result } = renderHook(() => useProductBySlug(knownSlug));
      expect(() => {
        act(() => {
          result.current.refresh();
        });
      }).not.toThrow();
    });
  });

  // --- Loading states ---

  describe('loading states', () => {
    it('starts with isLoading=true when slug is non-empty', () => {
      // Note: for static match, the effect runs synchronously and sets isLoading=false.
      // But initial state before first render should reflect the constructor: isLoading = !!slug.
      // With a non-static slug and Wix enabled, isLoading should be true.
      enableWix();
      mockGetProductBySlug.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useProductBySlug('wix-only-futon'));
      expect(result.current.isLoading).toBe(true);
    });

    it('isLoading transitions to false after successful fetch', async () => {
      enableWix();
      mockGetProductBySlug.mockResolvedValue(wixOnlyProduct);
      const { result } = renderHook(() => useProductBySlug('wix-only-futon'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('isLoading transitions to false after failed fetch', async () => {
      enableWix();
      mockGetProductBySlug.mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() => useProductBySlug('wix-only-futon'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  // --- Slug change behavior ---

  describe('slug changes', () => {
    it('updates product when slug changes to another static match', () => {
      const { result, rerender } = renderHook(
        ({ slug }: { slug: string }) => useProductBySlug(slug),
        { initialProps: { slug: PRODUCTS[0].slug } },
      );
      expect(result.current.product).toEqual(PRODUCTS[0]);

      rerender({ slug: PRODUCTS[1].slug });
      expect(result.current.product).toEqual(PRODUCTS[1]);
    });

    it('clears product when slug changes to empty', () => {
      const { result, rerender } = renderHook(
        ({ slug }: { slug: string }) => useProductBySlug(slug),
        { initialProps: { slug: knownSlug } },
      );
      expect(result.current.product).not.toBeNull();

      rerender({ slug: '' });
      expect(result.current.product).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('handles slug with special characters gracefully', () => {
      const { result } = renderHook(() => useProductBySlug('<script>alert(1)</script>'));
      expect(result.current.product).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('handles whitespace-only slug', () => {
      const { result } = renderHook(() => useProductBySlug('   '));
      expect(result.current.product).toBeNull();
    });

    it('Wix enabled but client is null — falls back to no-fetch path', () => {
      isWixConfigured.mockReturnValue(true);
      useOptionalWixClient.mockReturnValue(null);
      const { result } = renderHook(() => useProductBySlug('wix-only-futon'));
      expect(result.current.product).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockGetProductBySlug).not.toHaveBeenCalled();
    });
  });
});

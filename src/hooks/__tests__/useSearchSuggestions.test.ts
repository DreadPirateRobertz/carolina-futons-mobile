/**
 * Tests for useSearchSuggestions hook.
 *
 * TDD: tests written before implementation.
 * Bead: cfutons_mobile-57u
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSearchSuggestions } from '../useSearchSuggestions';
import { useOptionalWixClient } from '@/services/wix';
import { isWixConfigured } from '@/services/wix/config';

const mockQueryProducts = jest.fn();

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: jest.fn(),
}));

jest.mock('@/services/wix/config', () => ({
  isWixConfigured: jest.fn(),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

const mockUseOptionalWixClient = useOptionalWixClient as jest.Mock;
const mockIsWixConfigured = isWixConfigured as jest.Mock;

function setupWix(configured: boolean) {
  mockIsWixConfigured.mockReturnValue(configured);
  if (configured) {
    mockUseOptionalWixClient.mockReturnValue({ queryProducts: mockQueryProducts });
  } else {
    mockUseOptionalWixClient.mockReturnValue(null);
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  setupWix(false);
});

describe('useSearchSuggestions', () => {
  const FALLBACK = ['Asheville Futon', 'Bristol Mattress', 'Camden Frame'];

  describe('short / empty queries', () => {
    it('returns empty suggestions when query is empty', () => {
      const { result } = renderHook(() => useSearchSuggestions('', FALLBACK));
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('returns empty suggestions when query is 1 char', () => {
      const { result } = renderHook(() => useSearchSuggestions('a', FALLBACK));
      expect(result.current.suggestions).toEqual([]);
    });

    it('returns empty suggestions for whitespace-only query', () => {
      const { result } = renderHook(() => useSearchSuggestions('  ', FALLBACK));
      expect(result.current.suggestions).toEqual([]);
    });
  });

  describe('local fallback path (Wix not configured)', () => {
    it('returns fallback suggestions when Wix is not configured', async () => {
      setupWix(false);
      const { result } = renderHook(() => useSearchSuggestions('ash', FALLBACK));
      // Local path is synchronous — no loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.suggestions).toEqual(FALLBACK);
    });

    it('returns fallback suggestions when wixClient is null', async () => {
      mockIsWixConfigured.mockReturnValue(true);
      mockUseOptionalWixClient.mockReturnValue(null);
      const { result } = renderHook(() => useSearchSuggestions('ash', FALLBACK));
      expect(result.current.suggestions).toEqual(FALLBACK);
    });

    it('returns empty fallback when fallback array is empty', () => {
      setupWix(false);
      const { result } = renderHook(() => useSearchSuggestions('ash', []));
      expect(result.current.suggestions).toEqual([]);
    });
  });

  describe('Wix API path', () => {
    beforeEach(() => {
      setupWix(true);
    });

    it('calls queryProducts with correct search term', async () => {
      mockQueryProducts.mockResolvedValue({
        products: [
          { id: '1', name: 'Asheville Futon', slug: 'asheville-futon' },
          { id: '2', name: 'Ashley Frame', slug: 'ashley-frame' },
        ],
        totalResults: 2,
      });

      const { result } = renderHook(() => useSearchSuggestions('ash', FALLBACK));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockQueryProducts).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'ash', limit: 5 }),
      );
    });

    it('returns product names from Wix response', async () => {
      mockQueryProducts.mockResolvedValue({
        products: [
          { id: '1', name: 'Asheville Futon', slug: 'asheville-futon' },
          { id: '2', name: 'Ashley Frame', slug: 'ashley-frame' },
        ],
        totalResults: 2,
      });

      const { result } = renderHook(() => useSearchSuggestions('ash', FALLBACK));

      await waitFor(() => {
        expect(result.current.suggestions).toEqual(['Asheville Futon', 'Ashley Frame']);
      });
    });

    it('sets isLoading=true while fetching', async () => {
      let resolve: (v: unknown) => void;
      mockQueryProducts.mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      );

      const { result } = renderHook(() => useSearchSuggestions('ash', FALLBACK));

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolve!({ products: [], totalResults: 0 });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('returns fallback when Wix call throws', async () => {
      mockQueryProducts.mockRejectedValue(new Error('network error'));

      const { result } = renderHook(() => useSearchSuggestions('ash', FALLBACK));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.suggestions).toEqual(FALLBACK);
    });

    it('calls captureException on Wix API error', async () => {
      const { captureException } = jest.requireMock('@/services/crashReporting');
      const error = new Error('network error');
      mockQueryProducts.mockRejectedValue(error);

      renderHook(() => useSearchSuggestions('ash', FALLBACK));

      await waitFor(() => {
        expect(captureException).toHaveBeenCalledWith(error);
      });
    });

    it('returns empty array when Wix returns no products', async () => {
      mockQueryProducts.mockResolvedValue({ products: [], totalResults: 0 });

      const { result } = renderHook(() => useSearchSuggestions('ash', FALLBACK));

      await waitFor(() => {
        expect(result.current.suggestions).toEqual([]);
      });
    });

    it('deduplicates suggestions (case-insensitive)', async () => {
      mockQueryProducts.mockResolvedValue({
        products: [
          { id: '1', name: 'Asheville Futon', slug: 'asheville-futon' },
          { id: '2', name: 'asheville futon', slug: 'asheville-futon-2' },
        ],
        totalResults: 2,
      });

      const { result } = renderHook(() => useSearchSuggestions('ash', FALLBACK));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const names: string[] = result.current.suggestions;
      const lower = names.map((n: string) => n.toLowerCase());
      expect(new Set(lower).size).toBe(names.length);
    });

    it('ignores stale response when query changes', async () => {
      let resolveFirst: (v: unknown) => void;
      let resolveSecond: (v: unknown) => void;

      mockQueryProducts
        .mockReturnValueOnce(
          new Promise((r) => {
            resolveFirst = r;
          }),
        )
        .mockReturnValueOnce(
          new Promise((r) => {
            resolveSecond = r;
          }),
        );

      const { result, rerender } = renderHook(({ q }) => useSearchSuggestions(q, FALLBACK), {
        initialProps: { q: 'ash' },
      });

      // Change query before first resolves
      rerender({ q: 'bri' });

      // Resolve first (stale)
      await act(async () => {
        resolveFirst!({
          products: [{ id: '1', name: 'Asheville Futon', slug: 'a' }],
          totalResults: 1,
        });
      });

      // Resolve second (current)
      await act(async () => {
        resolveSecond!({
          products: [{ id: '2', name: 'Bristol Mattress', slug: 'b' }],
          totalResults: 1,
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should show Bristol (current query), not Asheville (stale)
      expect(result.current.suggestions).toContain('Bristol Mattress');
      expect(result.current.suggestions).not.toContain('Asheville Futon');
    });
  });
});

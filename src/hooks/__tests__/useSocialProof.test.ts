/**
 * Tests for useSocialProof — hq-5yo88
 *
 * AC:
 *  1. PDP shows "X sold this week" badge (if X > 0)
 *  2. PDP shows first Stamped review excerpt (rating + snippet, if available)
 *  3. Graceful empty states: no badge if 0 sold, no excerpt if no reviews
 *  4. Loading skeleton during fetch
 *  5. Signals fetched alongside product data (no extra visible load time)
 *  6. API error handling
 */

import { renderHook, act } from '@testing-library/react-native';
import { useSocialProof } from '../useSocialProof';

// --- Mocks ---

const mockFetchSoldCount = jest.fn();
const mockFetchTopReview = jest.fn();

jest.mock('@/services/socialProofApi', () => ({
  fetchSoldThisWeek: (...args: any[]) => mockFetchSoldCount(...args),
  fetchTopReviewExcerpt: (...args: any[]) => mockFetchTopReview(...args),
}));

// --- Constants ---

const PRODUCT_ID = 'prod-futon-1';

// --- Helpers ---

async function renderLoaded(productId = PRODUCT_ID) {
  const hook = renderHook(() => useSocialProof(productId));
  await act(async () => {});
  return hook;
}

// --- Tests ---

describe('useSocialProof', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchSoldCount.mockResolvedValue(12);
    mockFetchTopReview.mockResolvedValue({
      authorName: 'Jane D.',
      rating: 5,
      body: 'Best futon we ever bought! Super comfortable and looks amazing.',
    });
  });

  // --- AC 1: Sold count ---

  describe('sold this week count', () => {
    it('returns sold count from API', async () => {
      const { result } = await renderLoaded();

      expect(result.current.soldThisWeek).toBe(12);
    });

    it('passes productId to fetchSoldThisWeek', async () => {
      await renderLoaded();

      expect(mockFetchSoldCount).toHaveBeenCalledWith(PRODUCT_ID);
    });

    it('returns 0 when API returns 0', async () => {
      mockFetchSoldCount.mockResolvedValue(0);
      const { result } = await renderLoaded();

      expect(result.current.soldThisWeek).toBe(0);
    });

    it('returns undefined when API fails', async () => {
      mockFetchSoldCount.mockRejectedValue(new Error('Network error'));
      const { result } = await renderLoaded();

      expect(result.current.soldThisWeek).toBeUndefined();
    });
  });

  // --- AC 2: Review excerpt ---

  describe('review excerpt', () => {
    it('returns top review excerpt from API', async () => {
      const { result } = await renderLoaded();

      expect(result.current.topReview).toEqual({
        authorName: 'Jane D.',
        rating: 5,
        body: 'Best futon we ever bought! Super comfortable and looks amazing.',
      });
    });

    it('passes productId to fetchTopReviewExcerpt', async () => {
      await renderLoaded();

      expect(mockFetchTopReview).toHaveBeenCalledWith(PRODUCT_ID);
    });

    it('returns null when no reviews available', async () => {
      mockFetchTopReview.mockResolvedValue(null);
      const { result } = await renderLoaded();

      expect(result.current.topReview).toBeNull();
    });

    it('returns null when API fails', async () => {
      mockFetchTopReview.mockRejectedValue(new Error('Stamped unavailable'));
      const { result } = await renderLoaded();

      expect(result.current.topReview).toBeNull();
    });
  });

  // --- AC 3: Empty states ---

  describe('empty states', () => {
    it('soldThisWeek is 0 when no orders', async () => {
      mockFetchSoldCount.mockResolvedValue(0);
      const { result } = await renderLoaded();

      expect(result.current.soldThisWeek).toBe(0);
    });

    it('topReview is null when no reviews', async () => {
      mockFetchTopReview.mockResolvedValue(null);
      const { result } = await renderLoaded();

      expect(result.current.topReview).toBeNull();
    });

    it('both signals empty — no crash', async () => {
      mockFetchSoldCount.mockResolvedValue(0);
      mockFetchTopReview.mockResolvedValue(null);
      const { result } = await renderLoaded();

      expect(result.current.soldThisWeek).toBe(0);
      expect(result.current.topReview).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  // --- AC 4: Loading state ---

  describe('loading state', () => {
    it('isLoading is true initially', () => {
      // Don't await — check synchronous state
      const { result } = renderHook(() => useSocialProof(PRODUCT_ID));

      expect(result.current.isLoading).toBe(true);
    });

    it('isLoading becomes false after both fetches resolve', async () => {
      const { result } = await renderLoaded();

      expect(result.current.isLoading).toBe(false);
    });

    it('isLoading becomes false even when both fetches fail', async () => {
      mockFetchSoldCount.mockRejectedValue(new Error('fail'));
      mockFetchTopReview.mockRejectedValue(new Error('fail'));
      const { result } = await renderLoaded();

      expect(result.current.isLoading).toBe(false);
    });
  });

  // --- AC 5: Parallel fetching ---

  describe('parallel fetching', () => {
    it('fetches sold count and review excerpt in parallel', async () => {
      let soldResolve: (v: number) => void;
      let reviewResolve: (v: any) => void;

      mockFetchSoldCount.mockReturnValue(
        new Promise((r) => {
          soldResolve = r;
        }),
      );
      mockFetchTopReview.mockReturnValue(
        new Promise((r) => {
          reviewResolve = r;
        }),
      );

      const { result } = renderHook(() => useSocialProof(PRODUCT_ID));

      // Both should be called immediately (parallel)
      expect(mockFetchSoldCount).toHaveBeenCalledTimes(1);
      expect(mockFetchTopReview).toHaveBeenCalledTimes(1);

      // Resolve both
      await act(async () => {
        soldResolve!(8);
        reviewResolve!({ authorName: 'Test', rating: 4, body: 'Great!' });
      });

      expect(result.current.soldThisWeek).toBe(8);
      expect(result.current.topReview?.authorName).toBe('Test');
    });
  });

  // --- AC 6: Error handling ---

  describe('error handling', () => {
    it('sold count error does not block review excerpt', async () => {
      mockFetchSoldCount.mockRejectedValue(new Error('sold error'));
      const { result } = await renderLoaded();

      expect(result.current.soldThisWeek).toBeUndefined();
      expect(result.current.topReview).not.toBeNull();
      expect(result.current.error).toBeNull(); // partial success = no error
    });

    it('review excerpt error does not block sold count', async () => {
      mockFetchTopReview.mockRejectedValue(new Error('review error'));
      const { result } = await renderLoaded();

      expect(result.current.soldThisWeek).toBe(12);
      expect(result.current.topReview).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('both errors set error state', async () => {
      mockFetchSoldCount.mockRejectedValue(new Error('sold error'));
      mockFetchTopReview.mockRejectedValue(new Error('review error'));
      const { result } = await renderLoaded();

      expect(result.current.error).toBeTruthy();
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('does not fetch when productId is empty', async () => {
      await renderLoaded('');

      expect(mockFetchSoldCount).not.toHaveBeenCalled();
      expect(mockFetchTopReview).not.toHaveBeenCalled();
    });

    it('refetches when productId changes', async () => {
      const { rerender } = renderHook(
        ({ id }) => useSocialProof(id),
        { initialProps: { id: 'prod-1' } },
      );
      await act(async () => {});

      expect(mockFetchSoldCount).toHaveBeenCalledWith('prod-1');

      rerender({ id: 'prod-2' });
      await act(async () => {});

      expect(mockFetchSoldCount).toHaveBeenCalledWith('prod-2');
    });
  });
});

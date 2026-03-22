import { renderHook, act } from '@testing-library/react-native';
import { useReviews } from '../useReviews';
import { getEventBuffer, clearEventBuffer } from '@/services/analytics';

// ── Wix client mock ────────────────────────────────────────────
const mockCreateReview = jest.fn();
const mockQueryReviews = jest.fn();
let mockWixClient: any = null;

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

jest.useFakeTimers();

beforeEach(() => {
  clearEventBuffer();
  jest.clearAllMocks();
  mockWixClient = null; // Default: no Wix client (mock-data mode)
});

afterAll(() => {
  jest.useRealTimers();
});

describe('useReviews', () => {
  const productId = 'asheville-full'; // Has 7 mock reviews

  describe('initial state', () => {
    it('returns reviews for the product', () => {
      const { result } = renderHook(() => useReviews(productId));
      expect(result.current.reviews.length).toBeGreaterThan(0);
      expect(result.current.reviews.every((r) => r.productId === productId)).toBe(true);
    });

    it('returns review summary', () => {
      const { result } = renderHook(() => useReviews(productId));
      expect(result.current.summary.totalReviews).toBeGreaterThan(0);
      expect(result.current.summary.averageRating).toBeGreaterThan(0);
      expect(result.current.summary.distribution).toHaveLength(5);
    });

    it('defaults to helpful sort', () => {
      const { result } = renderHook(() => useReviews(productId));
      expect(result.current.sort).toBe('helpful');
    });

    it('is not submitting initially', () => {
      const { result } = renderHook(() => useReviews(productId));
      expect(result.current.isSubmitting).toBe(false);
    });

    it('form is hidden initially', () => {
      const { result } = renderHook(() => useReviews(productId));
      expect(result.current.showForm).toBe(false);
    });

    it('has no submit error initially', () => {
      const { result } = renderHook(() => useReviews(productId));
      expect(result.current.submitError).toBeNull();
    });

    it('submitSuccess is false initially', () => {
      const { result } = renderHook(() => useReviews(productId));
      expect(result.current.submitSuccess).toBe(false);
    });
  });

  describe('sorting', () => {
    it('sorts by helpful (descending helpful count)', () => {
      const { result } = renderHook(() => useReviews(productId));
      act(() => result.current.setSort('helpful'));
      const helpfulCounts = result.current.reviews.map((r) => r.helpful);
      for (let i = 1; i < helpfulCounts.length; i++) {
        expect(helpfulCounts[i]).toBeLessThanOrEqual(helpfulCounts[i - 1]);
      }
    });

    it('sorts by recent (descending date)', () => {
      const { result } = renderHook(() => useReviews(productId));
      act(() => result.current.setSort('recent'));
      const dates = result.current.reviews.map((r) => new Date(r.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
      }
    });

    it('sorts by highest rating', () => {
      const { result } = renderHook(() => useReviews(productId));
      act(() => result.current.setSort('highest'));
      const ratings = result.current.reviews.map((r) => r.rating);
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
      }
    });

    it('sorts by lowest rating', () => {
      const { result } = renderHook(() => useReviews(productId));
      act(() => result.current.setSort('lowest'));
      const ratings = result.current.reviews.map((r) => r.rating);
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i]).toBeGreaterThanOrEqual(ratings[i - 1]);
      }
    });
  });

  describe('submit review (mock-data fallback, no Wix client)', () => {
    it('adds review to the list after submission', async () => {
      const { result } = renderHook(() => useReviews(productId));
      const initialCount = result.current.reviews.length;

      let success: boolean | undefined;
      await act(async () => {
        const promise = result.current.submitReview({
          rating: 5,
          title: 'Amazing futon!',
          body: 'Love it so much.',
          photos: [],
        });
        jest.advanceTimersByTime(600);
        success = await promise;
      });

      expect(success).toBe(true);
      expect(result.current.reviews.length).toBe(initialCount + 1);
    });

    it('new review has correct data', async () => {
      const { result } = renderHook(() => useReviews(productId));

      await act(async () => {
        const promise = result.current.submitReview({
          rating: 4,
          title: 'Great quality',
          body: 'Very impressed with the build.',
          photos: [],
        });
        jest.advanceTimersByTime(600);
        await promise;
      });

      const newReview = result.current.reviews.find((r) => r.title === 'Great quality');
      expect(newReview).toBeDefined();
      expect(newReview!.rating).toBe(4);
      expect(newReview!.body).toBe('Very impressed with the build.');
      expect(newReview!.verified).toBe(true);
      expect(newReview!.authorName).toBe('You');
    });

    it('tracks submit_review analytics event', async () => {
      const { result } = renderHook(() => useReviews(productId));

      await act(async () => {
        const promise = result.current.submitReview({
          rating: 5,
          title: 'Test',
          body: 'Test body',
          photos: [],
        });
        jest.advanceTimersByTime(600);
        await promise;
      });

      const submitEvents = getEventBuffer().filter((e) => e.name === 'submit_review');
      expect(submitEvents.length).toBeGreaterThan(0);
      expect(submitEvents[0].properties?.product_id).toBe(productId);
      expect(submitEvents[0].properties?.rating).toBe(5);
    });

    it('fires gamification_submit_review with has_photo=false when no photos', async () => {
      const { result } = renderHook(() => useReviews(productId));

      await act(async () => {
        const promise = result.current.submitReview({
          rating: 4,
          title: 'No photo review',
          body: 'Great futon',
          photos: [],
        });
        jest.advanceTimersByTime(600);
        await promise;
      });

      const ev = getEventBuffer().find((e) => e.name === 'gamification_submit_review');
      expect(ev).toBeDefined();
      expect(ev?.properties?.has_photo).toBe(false);
    });

    it('fires gamification_submit_review with has_photo=true when photos present', async () => {
      const { result } = renderHook(() => useReviews(productId));

      await act(async () => {
        const promise = result.current.submitReview({
          rating: 5,
          title: 'Photo review',
          body: 'See the photo!',
          photos: ['https://example.com/photo.jpg'],
        });
        jest.advanceTimersByTime(600);
        await promise;
      });

      const ev = getEventBuffer().find((e) => e.name === 'gamification_submit_review');
      expect(ev).toBeDefined();
      expect(ev?.properties?.has_photo).toBe(true);
    });

    it('hides form after successful submission', async () => {
      const { result } = renderHook(() => useReviews(productId));
      act(() => result.current.setShowForm(true));
      expect(result.current.showForm).toBe(true);

      await act(async () => {
        const promise = result.current.submitReview({
          rating: 5,
          title: 'Test',
          body: 'Test body',
          photos: [],
        });
        jest.advanceTimersByTime(600);
        await promise;
      });

      expect(result.current.showForm).toBe(false);
    });

    it('updates summary after submission', async () => {
      const { result } = renderHook(() => useReviews(productId));
      const initialTotal = result.current.summary.totalReviews;

      await act(async () => {
        const promise = result.current.submitReview({
          rating: 5,
          title: 'Another review',
          body: 'Great stuff.',
          photos: [],
        });
        jest.advanceTimersByTime(600);
        await promise;
      });

      expect(result.current.summary.totalReviews).toBe(initialTotal + 1);
    });

    it('sets submitSuccess=true after successful submission', async () => {
      const { result } = renderHook(() => useReviews(productId));

      await act(async () => {
        const promise = result.current.submitReview({
          rating: 5,
          title: 'Great',
          body: 'Loved it.',
          photos: [],
        });
        jest.advanceTimersByTime(600);
        await promise;
      });

      expect(result.current.submitSuccess).toBe(true);
    });
  });

  describe('submit review (Wix client connected)', () => {
    beforeEach(() => {
      mockWixClient = {
        createReview: mockCreateReview,
        queryReviews: mockQueryReviews,
      };
    });

    it('calls wixClient.createReview with correct payload', async () => {
      mockCreateReview.mockResolvedValue({
        id: 'wix-rev-1',
        productId,
        authorName: 'Test User',
        rating: 5,
        title: 'Wix review',
        body: 'Submitted via API.',
        createdAt: new Date().toISOString(),
        helpful: 0,
        verified: false,
        photos: [],
      });

      const { result } = renderHook(() => useReviews(productId));

      await act(async () => {
        await result.current.submitReview({
          rating: 5,
          title: 'Wix review',
          body: 'Submitted via API.',
          photos: ['file:///photo1.jpg'],
        });
      });

      expect(mockCreateReview).toHaveBeenCalledWith({
        productId,
        authorName: expect.any(String),
        rating: 5,
        title: 'Wix review',
        body: 'Submitted via API.',
        photos: ['file:///photo1.jpg'],
      });
    });

    it('adds optimistic review immediately before API resolves', async () => {
      let resolveApi: (val: any) => void;
      const apiPromise = new Promise((resolve) => {
        resolveApi = resolve;
      });
      mockCreateReview.mockReturnValue(apiPromise);

      const { result } = renderHook(() => useReviews(productId));
      const initialCount = result.current.reviews.length;

      // Start submit — should add optimistic review
      let submitPromise: Promise<boolean>;
      act(() => {
        submitPromise = result.current.submitReview({
          rating: 5,
          title: 'Optimistic review',
          body: 'Should appear immediately.',
          photos: [],
        });
      });

      // Review should appear optimistically
      expect(result.current.reviews.length).toBe(initialCount + 1);
      const optimistic = result.current.reviews.find((r) => r.title === 'Optimistic review');
      expect(optimistic).toBeDefined();

      // Resolve API
      await act(async () => {
        resolveApi!({
          id: 'wix-rev-99',
          productId,
          authorName: 'You',
          rating: 5,
          title: 'Optimistic review',
          body: 'Should appear immediately.',
          createdAt: new Date().toISOString(),
          helpful: 0,
          verified: false,
        });
        await submitPromise!;
      });

      // Review should still be there with server ID
      expect(result.current.reviews.length).toBe(initialCount + 1);
    });

    it('rolls back optimistic review on API failure', async () => {
      mockCreateReview.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useReviews(productId));
      const initialCount = result.current.reviews.length;

      await act(async () => {
        await result.current.submitReview({
          rating: 5,
          title: 'Doomed review',
          body: 'This will fail.',
          photos: [],
        });
      });

      // Review should be rolled back
      expect(result.current.reviews.length).toBe(initialCount);
      expect(result.current.reviews.find((r) => r.title === 'Doomed review')).toBeUndefined();
    });

    it('sets submitError on API failure', async () => {
      mockCreateReview.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useReviews(productId));

      await act(async () => {
        await result.current.submitReview({
          rating: 4,
          title: 'Will fail',
          body: 'Error test.',
          photos: [],
        });
      });

      expect(result.current.submitError).toBe('Failed to submit review. Please try again.');
    });

    it('returns false on API failure', async () => {
      mockCreateReview.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useReviews(productId));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.submitReview({
          rating: 4,
          title: 'Will fail',
          body: 'Error test.',
          photos: [],
        });
      });

      expect(success).toBe(false);
    });

    it('clears submitError on next successful submission', async () => {
      // First: fail
      mockCreateReview.mockRejectedValueOnce(new Error('Server error'));

      const { result } = renderHook(() => useReviews(productId));

      await act(async () => {
        await result.current.submitReview({
          rating: 4,
          title: 'Will fail',
          body: 'Error test.',
          photos: [],
        });
      });
      expect(result.current.submitError).not.toBeNull();

      // Second: succeed
      mockCreateReview.mockResolvedValueOnce({
        id: 'wix-rev-2',
        productId,
        authorName: 'You',
        rating: 5,
        title: 'Will succeed',
        body: 'Success test.',
        createdAt: new Date().toISOString(),
        helpful: 0,
        verified: false,
      });

      await act(async () => {
        await result.current.submitReview({
          rating: 5,
          title: 'Will succeed',
          body: 'Success test.',
          photos: [],
        });
      });

      expect(result.current.submitError).toBeNull();
      expect(result.current.submitSuccess).toBe(true);
    });

    it('keeps form open on API failure', async () => {
      mockCreateReview.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useReviews(productId));
      act(() => result.current.setShowForm(true));

      await act(async () => {
        await result.current.submitReview({
          rating: 4,
          title: 'Will fail',
          body: 'Keeps form open.',
          photos: [],
        });
      });

      expect(result.current.showForm).toBe(true);
    });
  });

  describe('clearSubmitStatus', () => {
    it('clears both submitError and submitSuccess', async () => {
      const { result } = renderHook(() => useReviews(productId));

      await act(async () => {
        const promise = result.current.submitReview({
          rating: 5,
          title: 'Test',
          body: 'Test body',
          photos: [],
        });
        jest.advanceTimersByTime(600);
        await promise;
      });

      expect(result.current.submitSuccess).toBe(true);

      act(() => result.current.clearSubmitStatus());

      expect(result.current.submitSuccess).toBe(false);
      expect(result.current.submitError).toBeNull();
    });
  });

  describe('show/hide form', () => {
    it('toggles form visibility', () => {
      const { result } = renderHook(() => useReviews(productId));
      expect(result.current.showForm).toBe(false);
      act(() => result.current.setShowForm(true));
      expect(result.current.showForm).toBe(true);
      act(() => result.current.setShowForm(false));
      expect(result.current.showForm).toBe(false);
    });
  });

  describe('helpful votes', () => {
    it('tracks helpful_vote analytics event', () => {
      const { result } = renderHook(() => useReviews(productId));
      const reviewId = result.current.reviews[0].id;
      act(() => result.current.markHelpful(reviewId));

      const voteEvents = getEventBuffer().filter((e) => e.name === 'helpful_vote');
      expect(voteEvents.length).toBeGreaterThan(0);
      expect(voteEvents[0].properties?.review_id).toBe(reviewId);
    });
  });

  describe('product with no reviews', () => {
    it('returns empty reviews for unknown product', () => {
      const { result } = renderHook(() => useReviews('nonexistent-product'));
      expect(result.current.reviews).toEqual([]);
      expect(result.current.summary.totalReviews).toBe(0);
      expect(result.current.summary.averageRating).toBe(0);
    });

    it('returns hasReviews=false when no reviews', () => {
      const { result } = renderHook(() => useReviews('nonexistent-product'));
      expect(result.current.hasReviews).toBe(false);
    });

    it('returns hasReviews=true when reviews exist', () => {
      const { result } = renderHook(() => useReviews(productId));
      expect(result.current.hasReviews).toBe(true);
    });
  });
});

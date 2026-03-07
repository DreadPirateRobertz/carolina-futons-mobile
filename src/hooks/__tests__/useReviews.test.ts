import { renderHook, act } from '@testing-library/react-native';
import { useReviews } from '../useReviews';
import { getEventBuffer, clearEventBuffer } from '@/services/analytics';

jest.useFakeTimers();

beforeEach(() => {
  clearEventBuffer();
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

  describe('submit review', () => {
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

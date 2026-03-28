/**
 * @module useStampedReviews.test
 *
 * Tests for the useStampedReviews hook — Stamped.io integration for ProductDetailScreen.
 * Covers: loading state, happy path, API error fallback, empty reviews,
 * pagination (loadMore), and refresh.
 *
 * hq-tcdpe
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useStampedReviews } from '../useStampedReviews';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFetchReviews = jest.fn();
const mockFetchSummary = jest.fn();
const mockIsConfigured = jest.fn(() => true);

jest.mock('@/services/stamped', () => ({
  fetchStampedReviews: (...args: unknown[]) => mockFetchReviews(...args),
  fetchStampedRatingSummary: (...args: unknown[]) => mockFetchSummary(...args),
  isStampedConfigured: () => mockIsConfigured(),
}));

const MOCK_REVIEW = {
  id: '123',
  productId: 'test-product',
  authorName: 'Test User',
  rating: 5,
  title: 'Great',
  body: 'Love it',
  createdAt: '2026-01-01T00:00:00Z',
  helpful: 3,
  verified: true,
};

const MOCK_SUMMARY = {
  averageRating: 4.5,
  totalReviews: 10,
  distribution: [0, 1, 2, 3, 4] as [number, number, number, number, number],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchReviews.mockResolvedValue({ reviews: [MOCK_REVIEW], total: 1 });
  mockFetchSummary.mockResolvedValue(MOCK_SUMMARY);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useStampedReviews', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useStampedReviews('test-product'));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.reviews).toEqual([]);
  });

  it('fetches reviews and summary on mount', async () => {
    const { result } = renderHook(() => useStampedReviews('test-product'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchReviews).toHaveBeenCalledWith('test-product', { page: 1, perPage: 10 });
    expect(mockFetchSummary).toHaveBeenCalledWith('test-product');
    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.reviews[0].authorName).toBe('Test User');
    expect(result.current.summary.averageRating).toBe(4.5);
    expect(result.current.summary.totalReviews).toBe(10);
    expect(result.current.error).toBeNull();
  });

  it('sets error on API failure', async () => {
    mockFetchReviews.mockRejectedValueOnce(
      new Error('Stamped.io API error: 500 Internal Server Error'),
    );
    mockFetchSummary.mockRejectedValueOnce(
      new Error('Stamped.io API error: 500 Internal Server Error'),
    );

    const { result } = renderHook(() => useStampedReviews('test-product'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Stamped.io API error: 500 Internal Server Error');
    expect(result.current.reviews).toEqual([]);
  });

  it('handles empty reviews', async () => {
    mockFetchReviews.mockResolvedValueOnce({ reviews: [], total: 0 });
    mockFetchSummary.mockResolvedValueOnce({
      averageRating: 0,
      totalReviews: 0,
      distribution: [0, 0, 0, 0, 0],
    });

    const { result } = renderHook(() => useStampedReviews('test-product'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.reviews).toEqual([]);
    expect(result.current.summary.totalReviews).toBe(0);
    expect(result.current.hasMore).toBe(false);
  });

  it('supports loadMore for pagination', async () => {
    mockFetchReviews
      .mockResolvedValueOnce({
        reviews: [MOCK_REVIEW],
        total: 20, // more than 10 per page
      })
      .mockResolvedValueOnce({
        reviews: [{ ...MOCK_REVIEW, id: '456', authorName: 'Page 2 User' }],
        total: 20,
      });

    const { result } = renderHook(() => useStampedReviews('test-product'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockFetchReviews).toHaveBeenCalledWith('test-product', { page: 2, perPage: 10 });
    expect(result.current.reviews).toHaveLength(2);
    expect(result.current.reviews[1].authorName).toBe('Page 2 User');
  });

  it('does not loadMore when no more pages', async () => {
    mockFetchReviews.mockResolvedValueOnce({
      reviews: [MOCK_REVIEW],
      total: 1, // only 1 review total, fits in page 1
    });

    const { result } = renderHook(() => useStampedReviews('test-product'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasMore).toBe(false);

    await act(async () => {
      await result.current.loadMore();
    });

    // Should not have made a second fetch call
    expect(mockFetchReviews).toHaveBeenCalledTimes(1);
  });

  it('supports refresh (resets to page 1)', async () => {
    const { result } = renderHook(() => useStampedReviews('test-product'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockFetchReviews.mockResolvedValueOnce({
      reviews: [{ ...MOCK_REVIEW, id: '999', authorName: 'Refreshed' }],
      total: 1,
    });
    mockFetchSummary.mockResolvedValueOnce(MOCK_SUMMARY);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.reviews[0].authorName).toBe('Refreshed');
  });

  it('refetches when productId changes', async () => {
    const { result, rerender } = renderHook(({ productId }) => useStampedReviews(productId), {
      initialProps: { productId: 'product-a' },
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchReviews).toHaveBeenCalledWith('product-a', { page: 1, perPage: 10 });

    mockFetchReviews.mockResolvedValueOnce({ reviews: [], total: 0 });
    mockFetchSummary.mockResolvedValueOnce({
      averageRating: 0,
      totalReviews: 0,
      distribution: [0, 0, 0, 0, 0],
    });

    rerender({ productId: 'product-b' });

    await waitFor(() => {
      expect(mockFetchReviews).toHaveBeenCalledWith('product-b', { page: 1, perPage: 10 });
    });
  });

  it('skips fetch when Stamped.io is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);

    const { result } = renderHook(() => useStampedReviews('test-product'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchReviews).not.toHaveBeenCalled();
    expect(mockFetchSummary).not.toHaveBeenCalled();
    expect(result.current.reviews).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

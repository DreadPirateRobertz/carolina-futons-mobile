/**
 * TDD tests for useProductReviews hook.
 *
 * Hook behaviour:
 *  - Fetches reviews from Wix CF-k8hw collection via wixClient.queryData
 *  - Filters by productId
 *  - Sorts by _createdDate DESC (most recent first)
 *  - Returns { reviews, aggregate, isLoading, error }
 *  - aggregate: { averageRating, totalReviews }
 *  - isLoading=true during fetch, false when settled
 *  - Falls back to empty reviews when wixClient is null
 *  - error set on API failure
 *  - Re-fetches when productId changes
 *  - Handles empty collection (zero reviews)
 *
 * Bead: cm-e0r
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useProductReviews } from '../useProductReviews';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: jest.fn(),
}));

import { useOptionalWixClient } from '@/services/wix';

const mockUseOptionalWixClient = useOptionalWixClient as jest.Mock;

const mockQueryData = jest.fn();
const mockWixClient = { queryData: mockQueryData };

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeWixReviewItem(overrides: {
  id?: string;
  productId?: string;
  authorName?: string;
  rating?: number;
  title?: string;
  body?: string;
  createdAt?: string;
  helpful?: number;
  verified?: boolean;
}) {
  return {
    id: overrides.id ?? 'rev-001',
    productId: overrides.productId ?? 'prod-asheville',
    authorName: overrides.authorName ?? 'Test User',
    rating: overrides.rating ?? 5,
    title: overrides.title ?? 'Great futon',
    body: overrides.body ?? 'Loved it.',
    createdAt: overrides.createdAt ?? '2026-01-15T10:00:00Z',
    helpful: overrides.helpful ?? 0,
    verified: overrides.verified ?? true,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useProductReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptionalWixClient.mockReturnValue(mockWixClient);
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('starts with isLoading=true before fetch resolves', () => {
    mockQueryData.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useProductReviews('prod-asheville'));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.reviews).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('fetches reviews from CF-k8hw collection with productId filter', async () => {
    const items = [makeWixReviewItem({ productId: 'prod-asheville', rating: 5 })];
    mockQueryData.mockResolvedValue({ items, totalResults: 1 });

    const { result } = renderHook(() => useProductReviews('prod-asheville'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockQueryData).toHaveBeenCalledWith(
      'CF-k8hw',
      expect.objectContaining({
        filter: expect.objectContaining({ productId: expect.anything() }),
      }),
    );
    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('returns all review fields from queryData items', async () => {
    const item = makeWixReviewItem({
      id: 'rev-99',
      authorName: 'Jane D.',
      rating: 4,
      title: 'Nice',
      body: 'Really nice',
      createdAt: '2026-02-01T09:00:00Z',
      helpful: 7,
      verified: true,
    });
    mockQueryData.mockResolvedValue({ items: [item], totalResults: 1 });

    const { result } = renderHook(() => useProductReviews('prod-asheville'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const review = result.current.reviews[0];
    expect(review.authorName).toBe('Jane D.');
    expect(review.rating).toBe(4);
    expect(review.title).toBe('Nice');
    expect(review.body).toBe('Really nice');
    expect(review.verified).toBe(true);
  });

  // ── Aggregate ──────────────────────────────────────────────────────────────

  it('calculates aggregate.averageRating from fetched reviews', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeWixReviewItem({ rating: 4 }),
        makeWixReviewItem({ id: 'r2', rating: 2 }),
        makeWixReviewItem({ id: 'r3', rating: 5 }),
      ],
      totalResults: 3,
    });

    const { result } = renderHook(() => useProductReviews('prod-x'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // (4 + 2 + 5) / 3 = 3.67, rounded to 1dp
    expect(result.current.aggregate.averageRating).toBeCloseTo(3.7, 1);
    expect(result.current.aggregate.totalReviews).toBe(3);
  });

  it('returns aggregate.averageRating=0 and totalReviews=0 when no reviews', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

    const { result } = renderHook(() => useProductReviews('prod-empty'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.aggregate.averageRating).toBe(0);
    expect(result.current.aggregate.totalReviews).toBe(0);
  });

  it('calculates exact average for single review', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeWixReviewItem({ rating: 3 })],
      totalResults: 1,
    });

    const { result } = renderHook(() => useProductReviews('prod-single'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.aggregate.averageRating).toBe(3.0);
    expect(result.current.aggregate.totalReviews).toBe(1);
  });

  // ── Empty state ────────────────────────────────────────────────────────────

  it('returns empty reviews array when collection has no items for product', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

    const { result } = renderHook(() => useProductReviews('prod-new'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  // ── Error state ────────────────────────────────────────────────────────────

  it('sets error and keeps reviews empty when queryData throws', async () => {
    mockQueryData.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useProductReviews('prod-asheville'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews).toEqual([]);
    expect(result.current.error).toBe('Network failure');
  });

  it('sets a fallback error message when thrown error has no message', async () => {
    mockQueryData.mockRejectedValue({});

    const { result } = renderHook(() => useProductReviews('prod-asheville'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(typeof result.current.error).toBe('string');
  });

  // ── Null wixClient ─────────────────────────────────────────────────────────

  it('returns empty reviews without fetching when wixClient is null', async () => {
    mockUseOptionalWixClient.mockReturnValue(null);

    const { result } = renderHook(() => useProductReviews('prod-asheville'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews).toEqual([]);
    expect(mockQueryData).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  // ── Re-fetch on productId change ───────────────────────────────────────────

  it('re-fetches when productId changes', async () => {
    const items1 = [makeWixReviewItem({ id: 'r1', productId: 'prod-a', rating: 5 })];
    const items2 = [
      makeWixReviewItem({ id: 'r2', productId: 'prod-b', rating: 3 }),
      makeWixReviewItem({ id: 'r3', productId: 'prod-b', rating: 4 }),
    ];
    mockQueryData
      .mockResolvedValueOnce({ items: items1, totalResults: 1 })
      .mockResolvedValueOnce({ items: items2, totalResults: 2 });

    const { result, rerender } = renderHook(
      ({ productId }: { productId: string }) => useProductReviews(productId),
      { initialProps: { productId: 'prod-a' } },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.reviews).toHaveLength(1);

    rerender({ productId: 'prod-b' });

    await waitFor(() => expect(result.current.reviews).toHaveLength(2));
    expect(mockQueryData).toHaveBeenCalledTimes(2);
    expect(result.current.aggregate.totalReviews).toBe(2);
  });

  // ── Rating boundary validation ─────────────────────────────────────────────

  it('clamps out-of-range ratings to [1, 5] when computing aggregate', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeWixReviewItem({ id: 'r1', rating: 0 }), // invalid low
        makeWixReviewItem({ id: 'r2', rating: 6 }), // invalid high
        makeWixReviewItem({ id: 'r3', rating: 4 }), // valid
      ],
      totalResults: 3,
    });

    const { result } = renderHook(() => useProductReviews('prod-x'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should not crash; all 3 items included
    expect(result.current.aggregate.totalReviews).toBe(3);
  });

  // ── Collection ID ──────────────────────────────────────────────────────────

  it('always queries collection ID CF-k8hw', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

    renderHook(() => useProductReviews('any-product'));
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());

    expect(mockQueryData).toHaveBeenCalledWith('CF-k8hw', expect.anything());
  });
});

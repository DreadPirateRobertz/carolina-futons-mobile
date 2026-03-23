/**
 * TDD tests for useProductReviews hook.
 *
 * Hook behaviour:
 *  - Fetches reviews from Wix CF-k8hw collection via wixClient.queryData
 *  - Filters by productId with $eq operator
 *  - Sorts by createdAt DESC, limit 100
 *  - Returns { reviews, aggregate, isLoading, error }
 *  - aggregate: { averageRating, totalReviews }
 *  - isLoading=true during fetch, false when settled
 *  - Falls back to MOCK_REVIEWS seed data when wixClient is null (cm-c01)
 *  - error set on API failure; captureException called
 *  - Re-fetches when productId changes
 *  - Handles empty collection (zero reviews)
 *  - Clamps ratings to [1, 5]; non-numeric stays 0
 *  - Stale fetch from previous productId does not update state
 *
 * Bead: cm-e0r
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useProductReviews } from '../useProductReviews';

import { useOptionalWixClient } from '@/services/wix';
import { captureException } from '@/services/crashReporting';
import { getReviewsForProduct } from '@/data/reviews';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: jest.fn(),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/data/reviews', () => ({
  getReviewsForProduct: jest.fn(),
}));

const mockGetReviewsForProduct = getReviewsForProduct as jest.Mock;

const mockUseOptionalWixClient = useOptionalWixClient as jest.Mock;
const mockCaptureException = captureException as jest.Mock;

const mockQueryData = jest.fn();
const mockWixClient = { queryData: mockQueryData };

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(overrides: {
  id?: string;
  productId?: string;
  authorName?: string;
  rating?: number;
  title?: string;
  body?: string;
  createdAt?: string;
  helpful?: number;
  verified?: boolean;
  photos?: string[];
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
    ...(overrides.photos !== undefined ? { photos: overrides.photos } : {}),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useProductReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptionalWixClient.mockReturnValue(mockWixClient);
    mockGetReviewsForProduct.mockReturnValue([]);
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('starts with isLoading=true before fetch resolves', () => {
    mockQueryData.mockReturnValue(new Promise(() => {})); // never resolves
    const { result, unmount } = renderHook(() => useProductReviews('prod-asheville'));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.reviews).toEqual([]);
    expect(result.current.error).toBeNull();
    unmount();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('fetches from CF-k8hw with $eq filter, createdAt DESC sort, limit 100', async () => {
    mockQueryData.mockResolvedValue({ items: [makeItem({})], totalResults: 1 });

    const { result } = renderHook(() => useProductReviews('prod-asheville'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockQueryData).toHaveBeenCalledWith('CF-k8hw', {
      filter: { productId: { $eq: 'prod-asheville' } },
      sort: [{ fieldName: 'createdAt', order: 'DESC' }],
      limit: 100,
    });
    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('always queries collection ID CF-k8hw', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    renderHook(() => useProductReviews('any-product'));
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    expect(mockQueryData).toHaveBeenCalledWith('CF-k8hw', expect.anything());
  });

  it('returns all review fields from queryData items', async () => {
    const item = makeItem({
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

  it('calculates averageRating from fetched reviews', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeItem({ rating: 4 }),
        makeItem({ id: 'r2', rating: 2 }),
        makeItem({ id: 'r3', rating: 5 }),
      ],
      totalResults: 3,
    });

    const { result } = renderHook(() => useProductReviews('prod-x'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.aggregate.averageRating).toBeCloseTo(3.7, 1);
    expect(result.current.aggregate.totalReviews).toBe(3);
  });

  it('returns averageRating=0 and totalReviews=0 when no reviews', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

    const { result } = renderHook(() => useProductReviews('prod-empty'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.aggregate.averageRating).toBe(0);
    expect(result.current.aggregate.totalReviews).toBe(0);
  });

  it('calculates exact average for single review', async () => {
    mockQueryData.mockResolvedValue({ items: [makeItem({ rating: 3 })], totalResults: 1 });

    const { result } = renderHook(() => useProductReviews('prod-single'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.aggregate.averageRating).toBe(3.0);
    expect(result.current.aggregate.totalReviews).toBe(1);
  });

  // ── Rating clamping ────────────────────────────────────────────────────────

  it('clamps out-of-range ratings to [1, 5]; non-numeric stays 0', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeItem({ id: 'r1', rating: 0 }), // invalid low => 0
        makeItem({ id: 'r2', rating: 6 }), // out of range => clamped to 5
        makeItem({ id: 'r3', rating: -1 }), // negative => 0
        makeItem({ id: 'r4', rating: 4 }), // valid
      ],
      totalResults: 4,
    });

    const { result } = renderHook(() => useProductReviews('prod-x'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const ratings = result.current.reviews.map((r) => r.rating);
    expect(ratings).toEqual([0, 5, 0, 4]);
    // (0 + 5 + 0 + 4) / 4 = 2.25 => 2.3
    expect(result.current.aggregate.averageRating).toBeCloseTo(2.3, 1);
    expect(result.current.aggregate.totalReviews).toBe(4);
  });

  // ── photos field ───────────────────────────────────────────────────────────

  it('includes photos on review when present and non-empty', async () => {
    const photos = ['https://cdn.wix.com/a.jpg', 'https://cdn.wix.com/b.jpg'];
    mockQueryData.mockResolvedValue({ items: [makeItem({ photos })], totalResults: 1 });

    const { result } = renderHook(() => useProductReviews('prod-p'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews[0].photos).toEqual(photos);
  });

  it('omits photos property when photos array is empty', async () => {
    mockQueryData.mockResolvedValue({ items: [makeItem({ photos: [] })], totalResults: 1 });

    const { result } = renderHook(() => useProductReviews('prod-p'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews[0]).not.toHaveProperty('photos');
  });

  it('omits photos property when photos field is absent', async () => {
    mockQueryData.mockResolvedValue({ items: [makeItem({})], totalResults: 1 });

    const { result } = renderHook(() => useProductReviews('prod-p'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews[0]).not.toHaveProperty('photos');
  });

  it('filters non-string values from photos array', async () => {
    mockQueryData.mockResolvedValue({
      items: [{ ...makeItem({}), photos: [null, 'https://cdn.wix.com/a.jpg', 42] }],
      totalResults: 1,
    });

    const { result } = renderHook(() => useProductReviews('prod-p'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews[0].photos).toEqual(['https://cdn.wix.com/a.jpg']);
  });

  // ── Malformed CMS data ─────────────────────────────────────────────────────

  it('handles item with all fields missing without throwing', async () => {
    mockQueryData.mockResolvedValue({ items: [{}], totalResults: 1 });

    const { result } = renderHook(() => useProductReviews('prod-x'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews).toHaveLength(1);
    const r = result.current.reviews[0];
    expect(r.id).toBe('');
    expect(r.rating).toBe(0);
    expect(r.helpful).toBe(0);
    expect(r.verified).toBe(false);
  });

  it('defaults rating to 0 when rating field is a string', async () => {
    mockQueryData.mockResolvedValue({
      items: [{ ...makeItem({}), rating: '4' }],
      totalResults: 1,
    });

    const { result } = renderHook(() => useProductReviews('prod-x'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews[0].rating).toBe(0);
  });

  // ── Empty state ────────────────────────────────────────────────────────────

  it('returns empty reviews array when collection has no items', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

    const { result } = renderHook(() => useProductReviews('prod-new'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  // ── Error state ────────────────────────────────────────────────────────────

  it('sets error, keeps reviews empty, isLoading=false, and calls captureException', async () => {
    const err = new Error('Network failure');
    mockQueryData.mockRejectedValue(err);

    const { result } = renderHook(() => useProductReviews('prod-asheville'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews).toEqual([]);
    expect(result.current.error).toBe('Network failure');
    expect(result.current.isLoading).toBe(false);
    expect(mockCaptureException).toHaveBeenCalledWith(
      err,
      'error',
      expect.objectContaining({ action: 'useProductReviews/queryData', collection: 'CF-k8hw' }),
    );
  });

  it('sets fallback error and calls captureException when thrown value is not an Error', async () => {
    mockQueryData.mockRejectedValue({ code: 500 });

    const { result } = renderHook(() => useProductReviews('prod-asheville'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(typeof result.current.error).toBe('string');
    expect(result.current.isLoading).toBe(false);
    expect(mockCaptureException).toHaveBeenCalled();
  });

  // ── Null wixClient ─────────────────────────────────────────────────────────

  it('falls back to seed data (getReviewsForProduct) when wixClient is null', async () => {
    mockUseOptionalWixClient.mockReturnValue(null);
    const seedReviews = [
      makeItem({ id: 'rev-019', productId: 'pisgah-twin', rating: 5 }),
      makeItem({ id: 'rev-021', productId: 'pisgah-twin', rating: 3 }),
    ];
    mockGetReviewsForProduct.mockReturnValue(seedReviews);

    const { result } = renderHook(() => useProductReviews('pisgah-twin'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetReviewsForProduct).toHaveBeenCalledWith('pisgah-twin');
    expect(result.current.reviews).toHaveLength(2);
    expect(result.current.aggregate.totalReviews).toBe(2);
    expect(mockQueryData).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('aggregate reflects seed data when wixClient is null', async () => {
    mockUseOptionalWixClient.mockReturnValue(null);
    mockGetReviewsForProduct.mockReturnValue([
      makeItem({ id: 'r1', rating: 4 }),
      makeItem({ id: 'r2', rating: 5 }),
      makeItem({ id: 'r3', rating: 3 }),
    ]);

    const { result } = renderHook(() => useProductReviews('biltmore-loveseat'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.aggregate.averageRating).toBe(4.0);
    expect(result.current.aggregate.totalReviews).toBe(3);
  });

  it('returns empty state (not error) when seed data is empty and wixClient is null', async () => {
    mockUseOptionalWixClient.mockReturnValue(null);
    mockGetReviewsForProduct.mockReturnValue([]);

    const { result } = renderHook(() => useProductReviews('unknown-product'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews).toHaveLength(0);
    expect(result.current.error).toBeNull();
    expect(result.current.aggregate.totalReviews).toBe(0);
  });

  it('passes the productId to getReviewsForProduct when wixClient is null', async () => {
    mockUseOptionalWixClient.mockReturnValue(null);
    mockGetReviewsForProduct.mockReturnValue([]);

    renderHook(() => useProductReviews('blue-ridge-queen'));
    await waitFor(() => expect(mockGetReviewsForProduct).toHaveBeenCalledWith('blue-ridge-queen'));
  });

  // ── Re-fetch on productId change ───────────────────────────────────────────

  it('re-fetches when productId changes and updates aggregate', async () => {
    const items1 = [makeItem({ id: 'r1', productId: 'prod-a', rating: 5 })];
    const items2 = [
      makeItem({ id: 'r2', productId: 'prod-b', rating: 3 }),
      makeItem({ id: 'r3', productId: 'prod-b', rating: 4 }),
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

  // ── Stale response cancellation ────────────────────────────────────────────

  it('discards stale response when productId changes before first fetch resolves', async () => {
    type FetchResult = { items: ReturnType<typeof makeItem>[]; totalResults: number };
    let resolveFirst!: (val: FetchResult) => void;
    const firstFetch = new Promise<FetchResult>((resolve) => {
      resolveFirst = resolve;
    });
    const secondFetch = Promise.resolve({
      items: [makeItem({ id: 'r2', productId: 'prod-b', rating: 3 })],
      totalResults: 1,
    });

    mockQueryData.mockReturnValueOnce(firstFetch).mockReturnValueOnce(secondFetch);

    const { result, rerender } = renderHook(
      ({ productId }: { productId: string }) => useProductReviews(productId),
      { initialProps: { productId: 'prod-a' } },
    );

    rerender({ productId: 'prod-b' });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      resolveFirst({
        items: [makeItem({ id: 'r1', productId: 'prod-a', rating: 5 })],
        totalResults: 1,
      });
    });

    // State must reflect prod-b (rating 3), not the stale prod-a (rating 5)
    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.reviews[0].rating).toBe(3);
  });
});

// ── totalReviews from server totalResults ─────────────────────────────────

it('uses server totalResults for aggregate.totalReviews, not reviews.length', async () => {
  // Simulate: server has 247 reviews but we only fetch 100
  const fetchedItems = Array.from({ length: 100 }, (_, i) => makeItem({ id: `r${i}`, rating: 5 }));
  mockQueryData.mockResolvedValue({ items: fetchedItems, totalResults: 247 });

  const { result } = renderHook(() => useProductReviews('prod-popular'));
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(result.current.reviews).toHaveLength(100);
  // totalReviews must reflect the server total, not the fetched count
  expect(result.current.aggregate.totalReviews).toBe(247);
  // averageRating is computed from the 100 fetched items
  expect(result.current.aggregate.averageRating).toBe(5.0);
});

it('uses totalResults=0 for aggregate when API returns empty results', async () => {
  mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

  const { result } = renderHook(() => useProductReviews('prod-new'));
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(result.current.aggregate.totalReviews).toBe(0);
  expect(result.current.aggregate.averageRating).toBe(0);
});

/**
 * TDD tests for useVideoReviews hook — deacon-2c0d / cm-vid.
 *
 * Hook behaviour:
 *  - Fetches video reviews from Wix VideoReviews collection
 *  - Filters by productId, sorts by createdAt DESC, limit 50
 *  - Returns { videos, isLoading, error }
 *  - isLoading=true during fetch, false when settled
 *  - Falls back to seed data when wixClient is null
 *  - error set on API failure; captureException called
 *  - Re-fetches when productId changes
 *  - Handles empty collection (zero videos)
 *  - Stale fetch from previous productId does not update state
 *  - Clamps duration/rating to valid ranges
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useVideoReviews } from '../useVideoReviews';
import { useOptionalWixClient } from '@/services/wix';
import { captureException } from '@/services/crashReporting';
import { getVideoReviewsForProduct } from '@/data/videoReviews';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: jest.fn(),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/data/videoReviews', () => ({
  ...jest.requireActual('@/data/videoReviews'),
  getVideoReviewsForProduct: jest.fn(),
}));

const mockUseOptionalWixClient = useOptionalWixClient as jest.Mock;
const mockCaptureException = captureException as jest.Mock;
const mockGetVideoReviewsForProduct = getVideoReviewsForProduct as jest.Mock;

const mockQueryData = jest.fn();
const mockWixClient = { queryData: mockQueryData };

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRawItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'vr-001',
    productId: 'asheville-full',
    videoUrl: 'https://cdn.example.com/v1.mp4',
    thumbnailUrl: 'https://cdn.example.com/t1.jpg',
    authorName: 'Test User',
    title: 'Great video',
    duration: 45,
    createdAt: '2026-03-01T14:00:00Z',
    rating: 5,
    ...overrides,
  };
}

const SEED_VIDEOS = [
  {
    id: 'seed-1',
    productId: 'asheville-full',
    videoUrl: 'https://cdn.example.com/seed.mp4',
    thumbnailUrl: 'https://cdn.example.com/seed-thumb.jpg',
    authorName: 'Seed User',
    title: 'Seed review',
    duration: 30,
    createdAt: '2026-01-01T00:00:00Z',
    rating: 4,
  },
];

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOptionalWixClient.mockReturnValue(mockWixClient);
  mockGetVideoReviewsForProduct.mockReturnValue(SEED_VIDEOS);
  mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useVideoReviews', () => {
  describe('initial state', () => {
    it('starts with isLoading=true when wixClient available', () => {
      const { result } = renderHook(() => useVideoReviews('asheville-full'));
      expect(result.current.isLoading).toBe(true);
    });

    it('starts with empty videos array', () => {
      const { result } = renderHook(() => useVideoReviews('asheville-full'));
      expect(result.current.videos).toEqual([]);
    });

    it('starts with null error', () => {
      const { result } = renderHook(() => useVideoReviews('asheville-full'));
      expect(result.current.error).toBeNull();
    });
  });

  describe('wixClient fetch path', () => {
    it('calls queryData on the VideoReviews collection', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawItem()], totalResults: 1 });

      const { result } = renderHook(() => useVideoReviews('asheville-full'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockQueryData).toHaveBeenCalledWith(
        'VideoReviews',
        expect.objectContaining({
          filter: { productId: { $eq: 'asheville-full' } },
          sort: [{ fieldName: 'createdAt', order: 'DESC' }],
        }),
      );
    });

    it('returns videos from Wix on success', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawItem()], totalResults: 1 });

      const { result } = renderHook(() => useVideoReviews('asheville-full'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.videos).toHaveLength(1);
      expect(result.current.videos[0].id).toBe('vr-001');
      expect(result.current.error).toBeNull();
    });

    it('sets isLoading=false after fetch completes', async () => {
      const { result } = renderHook(() => useVideoReviews('asheville-full'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('returns empty videos when collection is empty', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const { result } = renderHook(() => useVideoReviews('asheville-full'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.videos).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('seed data fallback', () => {
    it('uses seed data when wixClient is null', async () => {
      mockUseOptionalWixClient.mockReturnValue(null);

      const { result } = renderHook(() => useVideoReviews('asheville-full'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockGetVideoReviewsForProduct).toHaveBeenCalledWith('asheville-full');
      expect(result.current.videos).toEqual(SEED_VIDEOS);
      expect(result.current.error).toBeNull();
    });

    it('does not call queryData when wixClient is null', async () => {
      mockUseOptionalWixClient.mockReturnValue(null);

      renderHook(() => useVideoReviews('asheville-full'));

      await waitFor(() => expect(mockGetVideoReviewsForProduct).toHaveBeenCalled());
      expect(mockQueryData).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('sets error message on API failure', async () => {
      mockQueryData.mockRejectedValue(new Error('Network failure'));

      const { result } = renderHook(() => useVideoReviews('asheville-full'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe('Network failure');
      expect(result.current.videos).toEqual([]);
    });

    it('calls captureException on API failure', async () => {
      const err = new Error('Network failure');
      mockQueryData.mockRejectedValue(err);

      renderHook(() => useVideoReviews('asheville-full'));

      await waitFor(() => expect(mockCaptureException).toHaveBeenCalled());
      expect(mockCaptureException).toHaveBeenCalledWith(err, 'error', expect.any(Object));
    });

    it('handles non-Error rejections gracefully', async () => {
      mockQueryData.mockRejectedValue('string error');

      const { result } = renderHook(() => useVideoReviews('asheville-full'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('productId change', () => {
    it('re-fetches when productId changes', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawItem()], totalResults: 1 });

      const { result, rerender } = renderHook(
        ({ productId }: { productId: string }) => useVideoReviews(productId),
        { initialProps: { productId: 'asheville-full' } },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockQueryData).toHaveBeenCalledTimes(1);

      rerender({ productId: 'columbia-queen' });

      await waitFor(() => expect(mockQueryData).toHaveBeenCalledTimes(2));
      expect(mockQueryData).toHaveBeenLastCalledWith(
        'VideoReviews',
        expect.objectContaining({
          filter: { productId: { $eq: 'columbia-queen' } },
        }),
      );
    });
  });

  describe('data shape normalisation', () => {
    it('maps raw item fields to VideoReview shape', async () => {
      mockQueryData.mockResolvedValue({
        items: [
          makeRawItem({
            id: 'vr-x',
            videoUrl: 'https://cdn.example.com/x.mp4',
            thumbnailUrl: 'https://cdn.example.com/x-thumb.jpg',
            authorName: 'Jane Doe',
            title: 'Awesome',
            duration: 60,
            rating: 4,
          }),
        ],
        totalResults: 1,
      });

      const { result } = renderHook(() => useVideoReviews('asheville-full'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const video = result.current.videos[0];
      expect(video.id).toBe('vr-x');
      expect(video.videoUrl).toBe('https://cdn.example.com/x.mp4');
      expect(video.thumbnailUrl).toBe('https://cdn.example.com/x-thumb.jpg');
      expect(video.authorName).toBe('Jane Doe');
      expect(video.title).toBe('Awesome');
      expect(video.duration).toBe(60);
      expect(video.rating).toBe(4);
    });

    it('clamps rating to [1, 5]', async () => {
      mockQueryData.mockResolvedValue({
        items: [makeRawItem({ rating: 10 }), makeRawItem({ id: 'vr-002', rating: -1 })],
        totalResults: 2,
      });

      const { result } = renderHook(() => useVideoReviews('asheville-full'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.videos[0].rating).toBe(5);
      expect(result.current.videos[1].rating).toBe(1);
    });

    it('defaults duration to 0 for non-numeric values', async () => {
      mockQueryData.mockResolvedValue({
        items: [makeRawItem({ duration: 'unknown' })],
        totalResults: 1,
      });

      const { result } = renderHook(() => useVideoReviews('asheville-full'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.videos[0].duration).toBe(0);
    });

    it('coerces missing string fields to empty string', async () => {
      mockQueryData.mockResolvedValue({
        items: [
          {
            id: 'vr-bare',
            productId: 'asheville-full',
            videoUrl: undefined,
            thumbnailUrl: undefined,
            authorName: undefined,
            title: undefined,
            duration: undefined,
            createdAt: undefined,
            rating: undefined,
          },
        ],
        totalResults: 1,
      });

      const { result } = renderHook(() => useVideoReviews('asheville-full'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const video = result.current.videos[0];
      expect(typeof video.videoUrl).toBe('string');
      expect(typeof video.thumbnailUrl).toBe('string');
      expect(typeof video.authorName).toBe('string');
      expect(typeof video.title).toBe('string');
    });
  });
});

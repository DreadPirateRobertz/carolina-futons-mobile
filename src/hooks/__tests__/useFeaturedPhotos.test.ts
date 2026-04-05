/**
 * Tests for hq-s25: useFeaturedPhotos hook.
 *
 * Queries UGCPhotos collection where status === 'featured',
 * returns featured photos, loading state, and error.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useFeaturedPhotos } from '../useFeaturedPhotos';

const mockQueryData = jest.fn();
const mockWixClient = { queryData: mockQueryData };
let mockUseOptionalWixClient: () => typeof mockWixClient | null = () => mockWixClient;

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

const FEATURED_PHOTO = {
  id: 'photo-001',
  roomType: 'living-room',
  productId: 'asheville-full',
  photoUrl: 'https://cdn.example.com/photo1.jpg',
  caption: 'Love my new futon!',
  submittedAt: '2026-03-01T00:00:00Z',
  status: 'featured',
  voteCount: 12,
  memberId: 'member-abc',
};

describe('useFeaturedPhotos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptionalWixClient = () => mockWixClient;
  });

  describe('loading state', () => {
    it('starts loading on mount', () => {
      mockQueryData.mockReturnValue(new Promise(() => {})); // never resolves
      const { result } = renderHook(() => useFeaturedPhotos());
      expect(result.current.isLoading).toBe(true);
    });

    it('clears loading after fetch resolves', async () => {
      mockQueryData.mockResolvedValue({ items: [] });
      const { result } = renderHook(() => useFeaturedPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  describe('successful fetch', () => {
    it('returns featured photos from Wix', async () => {
      mockQueryData.mockResolvedValue({ items: [FEATURED_PHOTO] });
      const { result } = renderHook(() => useFeaturedPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.featuredPhotos).toHaveLength(1);
      expect(result.current.featuredPhotos[0].id).toBe('photo-001');
    });

    it('queries UGCPhotos collection with featured status filter', async () => {
      mockQueryData.mockResolvedValue({ items: [] });
      renderHook(() => useFeaturedPhotos());
      await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
      expect(mockQueryData).toHaveBeenCalledWith(
        'UGCPhotos',
        expect.objectContaining({
          filter: expect.objectContaining({
            status: expect.objectContaining({ $eq: 'featured' }),
          }),
        }),
      );
    });

    it('returns empty array when no featured photos', async () => {
      mockQueryData.mockResolvedValue({ items: [] });
      const { result } = renderHook(() => useFeaturedPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.featuredPhotos).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('returns multiple featured photos', async () => {
      const photo2 = { ...FEATURED_PHOTO, id: 'photo-002' };
      mockQueryData.mockResolvedValue({ items: [FEATURED_PHOTO, photo2] });
      const { result } = renderHook(() => useFeaturedPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.featuredPhotos).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('sets error when Wix query fails', async () => {
      mockQueryData.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useFeaturedPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.featuredPhotos).toEqual([]);
    });

    it('wraps non-Error rejections', async () => {
      mockQueryData.mockRejectedValue('something went wrong');
      const { result } = renderHook(() => useFeaturedPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('no Wix client', () => {
    it('returns empty list and no error when Wix unavailable', async () => {
      mockUseOptionalWixClient = () => null;
      const { result } = renderHook(() => useFeaturedPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.featuredPhotos).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('featuredPhotoIds set', () => {
    it('exposes Set of featured photo IDs for O(1) lookup', async () => {
      mockQueryData.mockResolvedValue({ items: [FEATURED_PHOTO] });
      const { result } = renderHook(() => useFeaturedPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.featuredPhotoIds).toBeInstanceOf(Set);
      expect(result.current.featuredPhotoIds.has('photo-001')).toBe(true);
    });

    it('empty Set when no featured photos', async () => {
      mockQueryData.mockResolvedValue({ items: [] });
      const { result } = renderHook(() => useFeaturedPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.featuredPhotoIds.size).toBe(0);
    });
  });
});

import { renderHook, waitFor } from '@testing-library/react-native';
import {
  useRoomGallery,
  PLACEHOLDER_ROOMS,
  type RoomGalleryItem,
  type RoomPhotoTag,
} from '../useRoomGallery';

// Mock wixProvider
const mockQueryData = jest.fn();
const mockUseOptionalWixClient = jest.fn(() => null);
jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

/** Minimal Wix Data item for RealRoomPhotos */
function makeRawPhoto(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    memberId: 'member-001',
    memberName: 'Jane Doe',
    imageUrl:
      'wix:image://v1/e04e89_abc123def456/living-room.jpg#originWidth=1200&originHeight=800',
    city: 'Charlotte',
    state: 'NC',
    tags: JSON.stringify([
      {
        productId: 'asheville-full',
        productName: 'Asheville Full',
        x: 0.3,
        y: 0.4,
        width: 0.1,
        height: 0.1,
      },
      {
        productId: 'biltmore-queen',
        productName: 'Biltmore Queen',
        x: 0.6,
        y: 0.5,
        width: 0.1,
        height: 0.1,
      },
    ]),
    caption: 'My cozy living room',
    slug: 'jane-room-001',
    status: 'approved',
    pointsAwarded: 50,
    createdAt: '2026-03-01T00:00:00Z',
    altText: 'Living room with futon',
    ...overrides,
  };
}

describe('useRoomGallery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptionalWixClient.mockReturnValue(null);
  });

  describe('without Wix client (no auth)', () => {
    it('returns placeholder rooms and isLoading=false when no wix client', async () => {
      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.rooms).toEqual(PLACEHOLDER_ROOMS);
      expect(result.current.isPlaceholder).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('with Wix client', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue({ queryData: mockQueryData } as any);
    });

    it('fetches from RealRoomPhotos collection', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawPhoto()], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockQueryData).toHaveBeenCalledWith(
        'RealRoomPhotos',
        expect.objectContaining({ limit: expect.any(Number) }),
      );
    });

    it('filters by status=approved', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawPhoto()], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockQueryData).toHaveBeenCalledWith(
        'RealRoomPhotos',
        expect.objectContaining({
          filter: expect.objectContaining({ status: expect.objectContaining({ $eq: 'approved' }) }),
        }),
      );
    });

    it('returns transformed room items', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawPhoto()], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms).toHaveLength(1);
      const room = result.current.rooms[0];
      expect(room.roomId).toBe('jane-room-001');
      expect(room.memberName).toBe('Jane Doe');
      expect(room.city).toBe('Charlotte');
      expect(room.state).toBe('NC');
      expect(room.caption).toBe('My cozy living room');
      expect(room.slug).toBe('jane-room-001');
      expect(room.altText).toBe('Living room with futon');
    });

    it('maps slug to roomId', async () => {
      mockQueryData.mockResolvedValue({
        items: [makeRawPhoto({ slug: 'unique-slug-xyz' })],
        totalResults: 1,
      });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.rooms[0].roomId).toBe('unique-slug-xyz');
    });

    it('maps caption to roomStyle', async () => {
      mockQueryData.mockResolvedValue({
        items: [makeRawPhoto({ caption: 'Rustic charm' })],
        totalResults: 1,
      });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.rooms[0].roomStyle).toBe('Rustic charm');
    });

    it('maps createdAt to createdDate', async () => {
      mockQueryData.mockResolvedValue({
        items: [makeRawPhoto({ createdAt: '2026-01-15T12:00:00Z' })],
        totalResults: 1,
      });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.rooms[0].createdDate).toBe('2026-01-15T12:00:00Z');
    });

    it('resolves wix:image:// URL to wixstatic CDN URL', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawPhoto()], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms[0].imageUrl).toBe(
        'https://static.wixstatic.com/media/e04e89_abc123def456',
      );
    });

    it('passes through https:// image URLs unchanged', async () => {
      const photo = makeRawPhoto({ imageUrl: 'https://static.wixstatic.com/media/e04e89_direct' });
      mockQueryData.mockResolvedValue({ items: [photo], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms[0].imageUrl).toBe(
        'https://static.wixstatic.com/media/e04e89_direct',
      );
    });

    it('parses tags JSON string into RoomPhotoTag array', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawPhoto()], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const tags = result.current.rooms[0].tags;
      expect(Array.isArray(tags)).toBe(true);
      expect(tags).toHaveLength(2);
      expect(tags[0]).toMatchObject({
        productId: 'asheville-full',
        productName: 'Asheville Full',
        x: 0.3,
        y: 0.4,
        width: 0.1,
        height: 0.1,
      });
    });

    it('handles tags already as array (not JSON string)', async () => {
      const tagsArray = [
        { productId: 'p1', productName: 'Product 1', x: 0.1, y: 0.2, width: 0.05, height: 0.05 },
      ];
      const photo = makeRawPhoto({ tags: tagsArray });
      mockQueryData.mockResolvedValue({ items: [photo], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms[0].tags).toHaveLength(1);
      expect(result.current.rooms[0].tags[0].productId).toBe('p1');
    });

    it('derives productIds from tags', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawPhoto()], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms[0].productIds).toEqual(['asheville-full', 'biltmore-queen']);
    });

    it('allows rooms with empty tags (no product hotspots)', async () => {
      const photo = makeRawPhoto({ tags: '[]' });
      mockQueryData.mockResolvedValue({ items: [photo], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms).toHaveLength(1);
      expect(result.current.rooms[0].tags).toEqual([]);
      expect(result.current.rooms[0].productIds).toEqual([]);
    });

    it('handles missing tags field gracefully', async () => {
      const photo = makeRawPhoto({ tags: undefined });
      mockQueryData.mockResolvedValue({ items: [photo], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms[0].tags).toEqual([]);
    });

    it('handles malformed tags JSON gracefully (falls back to empty array)', async () => {
      const photo = makeRawPhoto({ tags: 'not-valid-json' });
      mockQueryData.mockResolvedValue({ items: [photo], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms[0].tags).toEqual([]);
    });

    it('returns error=null on success', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawPhoto()], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBeNull();
    });

    it('returns placeholder rooms when API returns empty array', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.rooms).toEqual(PLACEHOLDER_ROOMS);
      expect(result.current.isPlaceholder).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('sets error when API call throws', async () => {
      mockQueryData.mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error!.message).toBe('Network timeout');
      expect(result.current.rooms).toEqual([]);
    });

    it('wraps non-Error API failures in Error', async () => {
      mockQueryData.mockRejectedValue('string rejection');

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('filters out rooms with null/unparseable image URLs', async () => {
      const badPhoto = makeRawPhoto({ imageUrl: '', slug: 'bad-photo' });
      const goodPhoto = makeRawPhoto({ slug: 'good-photo' });
      mockQueryData.mockResolvedValue({ items: [badPhoto, goodPhoto], totalResults: 2 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms).toHaveLength(1);
      expect(result.current.rooms[0].roomId).toBe('good-photo');
    });

    it('sorts rooms by createdAt descending (newest first)', async () => {
      const older = makeRawPhoto({ slug: 'old', createdAt: '2026-01-01T00:00:00Z' });
      const newer = makeRawPhoto({ slug: 'new', createdAt: '2026-03-01T00:00:00Z' });
      mockQueryData.mockResolvedValue({ items: [older, newer], totalResults: 2 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms[0].roomId).toBe('new');
      expect(result.current.rooms[1].roomId).toBe('old');
    });

    it('returns a refresh function', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(typeof result.current.refresh).toBe('function');
    });

    it('re-fetches on refresh', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      mockQueryData.mockClear();
      result.current.refresh();

      await waitFor(() => expect(mockQueryData).toHaveBeenCalledTimes(1));
    });

    it('clears error on successful refresh after failure', async () => {
      mockQueryData.mockRejectedValueOnce(new Error('First failure'));

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).not.toBeNull();

      mockQueryData.mockResolvedValue({ items: [makeRawPhoto()], totalResults: 1 });
      result.current.refresh();

      await waitFor(() => expect(result.current.error).toBeNull());
      expect(result.current.rooms).toHaveLength(1);
    });

    it('handles malformed item (missing slug) without crashing', async () => {
      const malformed = { imageUrl: 'https://example.com/img.jpg' };
      const good = makeRawPhoto({ slug: 'room-good' });
      mockQueryData.mockResolvedValue({ items: [malformed, good], totalResults: 2 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms.some((r) => r.roomId === 'room-good')).toBe(true);
    });

    it('sets isPlaceholder=false when real rooms are fetched', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawPhoto()], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isPlaceholder).toBe(false);
    });

    it('sets isPlaceholder=false after refresh returns real rooms', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isPlaceholder).toBe(true));

      mockQueryData.mockResolvedValue({ items: [makeRawPhoto()], totalResults: 1 });
      result.current.refresh();

      await waitFor(() => expect(result.current.isPlaceholder).toBe(false));
      expect(result.current.rooms).toHaveLength(1);
    });

    it('falls back to PLACEHOLDER_ROOMS when all items fail transform', async () => {
      const allBad = [makeRawPhoto({ imageUrl: '' }), makeRawPhoto({ imageUrl: '' })];
      mockQueryData.mockResolvedValue({ items: allBad, totalResults: 2 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.rooms).toEqual(PLACEHOLDER_ROOMS);
      expect(result.current.isPlaceholder).toBe(true);
    });

    it('PLACEHOLDER_ROOMS items have tags array', () => {
      for (const room of PLACEHOLDER_ROOMS) {
        expect(Array.isArray(room.tags)).toBe(true);
      }
    });

    it('PLACEHOLDER_ROOMS items have memberName', () => {
      for (const room of PLACEHOLDER_ROOMS) {
        expect(room.memberName).toBeTruthy();
      }
    });
  });
});

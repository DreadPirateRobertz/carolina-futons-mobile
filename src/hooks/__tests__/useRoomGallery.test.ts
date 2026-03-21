import { renderHook, waitFor } from '@testing-library/react-native';
import { useRoomGallery, type RoomGalleryItem } from '../useRoomGallery';

// Mock wixProvider
const mockQueryData = jest.fn();
const mockUseOptionalWixClient = jest.fn(() => null);
jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

/** Minimal Wix Data item for room gallery */
function makeRawRoom(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    roomId: 'room-001',
    imageUrl:
      'wix:image://v1/e04e89_abc123def456/living-room.jpg#originWidth=1200&originHeight=800',
    productIds: ['asheville-full', 'biltmore-queen'],
    roomStyle: 'Modern',
    createdDate: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

describe('useRoomGallery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptionalWixClient.mockReturnValue(null);
  });

  describe('without Wix client (no auth)', () => {
    it('returns empty rooms and isLoading=false when no wix client', async () => {
      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.rooms).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('with Wix client', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue({ queryData: mockQueryData } as any);
    });

    it('fetches from roomGallery collection', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawRoom()], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockQueryData).toHaveBeenCalledWith(
        'roomGallery',
        expect.objectContaining({ limit: expect.any(Number) }),
      );
    });

    it('returns transformed room items', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawRoom()], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms).toHaveLength(1);
      const room = result.current.rooms[0];
      expect(room.roomId).toBe('room-001');
      expect(room.productIds).toEqual(['asheville-full', 'biltmore-queen']);
      expect(room.roomStyle).toBe('Modern');
    });

    it('resolves wix:image:// URL to wixstatic CDN URL', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawRoom()], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms[0].imageUrl).toBe(
        'https://static.wixstatic.com/media/e04e89_abc123def456',
      );
    });

    it('passes through https:// image URLs unchanged', async () => {
      const room = makeRawRoom({
        imageUrl: 'https://static.wixstatic.com/media/e04e89_direct',
      });
      mockQueryData.mockResolvedValue({ items: [room], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms[0].imageUrl).toBe(
        'https://static.wixstatic.com/media/e04e89_direct',
      );
    });

    it('returns error=null on success', async () => {
      mockQueryData.mockResolvedValue({ items: [makeRawRoom()], totalResults: 1 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBeNull();
    });

    it('returns empty rooms when API returns empty array', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.rooms).toEqual([]);
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
      const badRoom = makeRawRoom({ imageUrl: '' });
      const goodRoom = makeRawRoom({ roomId: 'room-002' });
      mockQueryData.mockResolvedValue({ items: [badRoom, goodRoom], totalResults: 2 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms).toHaveLength(1);
      expect(result.current.rooms[0].roomId).toBe('room-002');
    });

    it('filters out rooms with missing productIds', async () => {
      const noProducts = makeRawRoom({ productIds: [] });
      const withProducts = makeRawRoom({ roomId: 'room-002' });
      mockQueryData.mockResolvedValue({ items: [noProducts, withProducts], totalResults: 2 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.rooms).toHaveLength(1);
      expect(result.current.rooms[0].roomId).toBe('room-002');
    });

    it('sorts rooms by createdDate descending (newest first)', async () => {
      const older = makeRawRoom({ roomId: 'old', createdDate: '2026-01-01T00:00:00Z' });
      const newer = makeRawRoom({ roomId: 'new', createdDate: '2026-03-01T00:00:00Z' });
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

      mockQueryData.mockResolvedValue({ items: [makeRawRoom()], totalResults: 1 });
      result.current.refresh();

      await waitFor(() => expect(result.current.error).toBeNull());
      expect(result.current.rooms).toHaveLength(1);
    });

    it('handles malformed room item (missing roomId) without crashing', async () => {
      const malformed = { imageUrl: 'https://example.com/img.jpg', productIds: ['p1'] };
      const good = makeRawRoom({ roomId: 'room-good' });
      mockQueryData.mockResolvedValue({ items: [malformed, good], totalResults: 2 });

      const { result } = renderHook(() => useRoomGallery());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should not crash; good room should still appear
      expect(result.current.rooms.some((r) => r.roomId === 'room-good')).toBe(true);
    });
  });
});

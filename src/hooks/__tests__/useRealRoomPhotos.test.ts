/**
 * TDD tests for useRealRoomPhotos hook — cm-xnq.
 *
 * Covers:
 *  Initial state
 *    - isLoading true on mount
 *    - photos empty array initially
 *    - error null initially
 *
 *  No Wix client
 *    - returns empty photos, isLoading false when wixClient is null
 *
 *  Happy path
 *    - queries RealRoomPhotos collection
 *    - MANDATORY: filter status=approved applied
 *    - sorts by createdAt descending
 *    - returns mapped RealRoomPhoto objects
 *    - parses tags JSON array correctly
 *    - handles pre-parsed tags (already an array)
 *    - limit of 50 applied
 *
 *  Schema mapping
 *    - imageUrl mapped from Wix item
 *    - city and state mapped
 *    - caption mapped (optional)
 *    - memberName mapped (optional)
 *    - altText mapped (optional)
 *    - createdAt mapped
 *    - tags contain productId, productName, x, y, width, height
 *
 *  Tags edge cases
 *    - missing tags field → empty array
 *    - malformed tags JSON → empty array (no throw)
 *    - tags with partial hotspot fields still included
 *
 *  Error handling
 *    - sets error when queryData throws
 *    - returns empty photos on error
 *    - isLoading false after error
 *
 *  Refresh
 *    - refresh() re-triggers the query
 *
 * cm-xnq: RealRoomPhotos display on RoomGalleryScreen.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRealRoomPhotos } from '../useRealRoomPhotos';

// ── Mock Wix client ───────────────────────────────────────────────────────────

const mockQueryData = jest.fn();
const mockWixClient = { queryData: mockQueryData };

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: jest.fn(),
}));

import { useOptionalWixClient } from '@/services/wix/wixProvider';

const mockUseOptionalWixClient = useOptionalWixClient as jest.Mock;

// ── Mock crash reporting ──────────────────────────────────────────────────────

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TAGS_ARRAY = [
  { productId: 'prod-1', productName: 'Summit Futon', x: 0.3, y: 0.4, width: 0.15, height: 0.2 },
  { productId: 'prod-2', productName: 'Valley Sofa', x: 0.7, y: 0.6, width: 0.12, height: 0.18 },
];

const RAW_PHOTO_1 = {
  _id: 'photo-001',
  imageUrl: 'https://cdn.example.com/room1.jpg',
  city: 'Asheville',
  state: 'NC',
  caption: 'My cozy living room',
  memberName: 'Jane D.',
  altText: 'Living room with Summit Futon',
  createdAt: '2026-03-15T10:00:00.000Z',
  tags: JSON.stringify(TAGS_ARRAY),
  status: 'approved',
};

const RAW_PHOTO_2 = {
  _id: 'photo-002',
  imageUrl: 'https://cdn.example.com/room2.jpg',
  city: 'Charlotte',
  state: 'NC',
  caption: null,
  memberName: null,
  altText: null,
  createdAt: '2026-03-10T08:00:00.000Z',
  tags: JSON.stringify([]),
  status: 'approved',
};

function makeQueryResult(items: object[]) {
  return { items };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useRealRoomPhotos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptionalWixClient.mockReturnValue(mockWixClient);
    mockQueryData.mockResolvedValue(makeQueryResult([RAW_PHOTO_1, RAW_PHOTO_2]));
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with isLoading=true', () => {
      mockQueryData.mockReturnValue(new Promise(() => {})); // never resolves
      const { result } = renderHook(() => useRealRoomPhotos());
      expect(result.current.isLoading).toBe(true);
    });

    it('starts with empty photos array', () => {
      mockQueryData.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useRealRoomPhotos());
      expect(result.current.photos).toEqual([]);
    });

    it('starts with error=null', () => {
      mockQueryData.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useRealRoomPhotos());
      expect(result.current.error).toBeNull();
    });
  });

  // ── No Wix client ─────────────────────────────────────────────────────────

  describe('no Wix client', () => {
    it('returns empty photos and isLoading=false when wixClient is null', async () => {
      mockUseOptionalWixClient.mockReturnValue(null);
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('does not call queryData when wixClient is null', async () => {
      mockUseOptionalWixClient.mockReturnValue(null);
      renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(mockQueryData).not.toHaveBeenCalled());
    });
  });

  // ── Wix query ─────────────────────────────────────────────────────────────

  describe('Wix query', () => {
    it('queries the RealRoomPhotos collection', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockQueryData).toHaveBeenCalledWith(
        'RealRoomPhotos',
        expect.any(Object),
      );
    });

    it('MANDATORY: applies status=approved filter', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const [, query] = mockQueryData.mock.calls[0];
      expect(query.filter).toEqual(
        expect.objectContaining({ status: { $eq: 'approved' } }),
      );
    });

    it('sorts by createdAt descending', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const [, query] = mockQueryData.mock.calls[0];
      expect(query.sort).toEqual(
        expect.arrayContaining([{ fieldName: 'createdAt', order: 'DESC' }]),
      );
    });

    it('applies a limit of 50', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const [, query] = mockQueryData.mock.calls[0];
      expect(query.limit).toBe(50);
    });

    it('sets isLoading=false after success', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  // ── Schema mapping ────────────────────────────────────────────────────────

  describe('schema mapping', () => {
    it('maps imageUrl', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[0].imageUrl).toBe(RAW_PHOTO_1.imageUrl);
    });

    it('maps id from _id', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[0].id).toBe('photo-001');
    });

    it('maps city and state', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[0].city).toBe('Asheville');
      expect(result.current.photos[0].state).toBe('NC');
    });

    it('maps caption', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[0].caption).toBe('My cozy living room');
    });

    it('maps memberName', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[0].memberName).toBe('Jane D.');
    });

    it('maps altText', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[0].altText).toBe('Living room with Summit Futon');
    });

    it('maps createdAt', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[0].createdAt).toBe('2026-03-15T10:00:00.000Z');
    });

    it('maps null caption as undefined', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[1].caption).toBeUndefined();
    });

    it('maps null memberName as undefined', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[1].memberName).toBeUndefined();
    });

    it('maps null altText as undefined', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[1].altText).toBeUndefined();
    });

    it('returns correct number of photos', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos).toHaveLength(2);
    });
  });

  // ── Tags parsing ──────────────────────────────────────────────────────────

  describe('tags parsing', () => {
    it('parses tags JSON string into array of hotspots', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[0].tags).toEqual(TAGS_ARRAY);
    });

    it('hotspot contains productId, productName, x, y, width, height', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const tag = result.current.photos[0].tags[0];
      expect(tag).toMatchObject({
        productId: 'prod-1',
        productName: 'Summit Futon',
        x: 0.3,
        y: 0.4,
        width: 0.15,
        height: 0.2,
      });
    });

    it('handles pre-parsed tags (already an array)', async () => {
      mockQueryData.mockResolvedValue(
        makeQueryResult([{ ...RAW_PHOTO_1, tags: TAGS_ARRAY }]),
      );
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[0].tags).toEqual(TAGS_ARRAY);
    });

    it('missing tags field → empty array', async () => {
      const { tags: _, ...noTags } = RAW_PHOTO_1;
      mockQueryData.mockResolvedValue(makeQueryResult([noTags]));
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[0].tags).toEqual([]);
    });

    it('malformed tags JSON → empty array, no throw', async () => {
      mockQueryData.mockResolvedValue(
        makeQueryResult([{ ...RAW_PHOTO_1, tags: 'not-valid-json{{' }]),
      );
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[0].tags).toEqual([]);
    });

    it('empty tags array → empty array', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos[1].tags).toEqual([]);
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('sets error when queryData throws', async () => {
      mockQueryData.mockRejectedValue(new Error('Network timeout'));
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network timeout');
    });

    it('returns empty photos on error', async () => {
      mockQueryData.mockRejectedValue(new Error('Network timeout'));
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.photos).toEqual([]);
    });

    it('isLoading=false after error', async () => {
      mockQueryData.mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('wraps non-Error throws', async () => {
      mockQueryData.mockRejectedValue('string error');
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  // ── Refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('refresh() re-triggers queryData', async () => {
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockQueryData).toHaveBeenCalledTimes(1);

      act(() => result.current.refresh());
      await waitFor(() => expect(mockQueryData).toHaveBeenCalledTimes(2));
    });

    it('refresh() resets error on re-fetch', async () => {
      mockQueryData.mockRejectedValueOnce(new Error('fail'));
      const { result } = renderHook(() => useRealRoomPhotos());
      await waitFor(() => expect(result.current.error).toBeTruthy());

      mockQueryData.mockResolvedValue(makeQueryResult([RAW_PHOTO_1]));
      act(() => result.current.refresh());
      await waitFor(() => expect(result.current.error).toBeNull());
    });
  });
});

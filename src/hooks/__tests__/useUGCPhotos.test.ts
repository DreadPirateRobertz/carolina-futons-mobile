/**
 * Tests for useUGCPhotos hook — cm-ae8.
 *
 * Covers: fetch (approved+featured only), loading, error, empty, submit photo
 * (validation, XSS, permission denied, optimistic insert, rollback, vote).
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUGCPhotos } from '../useUGCPhotos';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockQueryData = jest.fn();
const mockInsertDataItem = jest.fn();
const mockUpdateDataItem = jest.fn();
const mockUseOptionalWixClient = jest.fn();
jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// expo-image-picker mock — factory returns jest.fn() stubs so beforeEach can reconfigure them.
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images', Videos: 'Videos', All: 'All' },
}));
// Grab references AFTER the mock is established (require happens after hoisting).
/* eslint-disable @typescript-eslint/no-require-imports */
const mockRequestMediaLibraryPermissions: jest.Mock =
  require('expo-image-picker').requestMediaLibraryPermissionsAsync;
const mockLaunchImageLibrary: jest.Mock = require('expo-image-picker').launchImageLibraryAsync;
/* eslint-enable @typescript-eslint/no-require-imports */

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PRODUCT_ID = 'asheville-full';

const APPROVED_PHOTO = {
  id: 'ugc-1',
  roomType: 'living-room',
  productId: PRODUCT_ID,
  photoUrl: 'https://example.com/photo1.jpg',
  caption: 'My new futon looks great!',
  submittedAt: '2026-03-01T10:00:00Z',
  status: 'approved',
  voteCount: 5,
  memberId: 'member-1',
};

const FEATURED_PHOTO = {
  id: 'ugc-2',
  roomType: 'bedroom',
  productId: PRODUCT_ID,
  photoUrl: 'https://example.com/photo2.jpg',
  caption: 'Featured bedroom setup',
  submittedAt: '2026-03-02T10:00:00Z',
  status: 'featured',
  voteCount: 12,
  memberId: 'member-2',
};

const PENDING_PHOTO = {
  id: 'ugc-3',
  roomType: 'office',
  productId: PRODUCT_ID,
  photoUrl: 'https://example.com/photo3.jpg',
  caption: 'Pending review',
  submittedAt: '2026-03-03T10:00:00Z',
  status: 'pending',
  voteCount: 0,
  memberId: 'member-3',
};

function makeClient() {
  return {
    queryData: mockQueryData,
    insertDataItem: mockInsertDataItem,
    updateDataItem: mockUpdateDataItem,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOptionalWixClient.mockReturnValue(makeClient());
  mockUseAuth.mockReturnValue({ user: { id: 'member-1', displayName: 'Test User' } });
  mockQueryData.mockResolvedValue({ items: [APPROVED_PHOTO, FEATURED_PHOTO], totalResults: 2 });
  mockInsertDataItem.mockResolvedValue({ id: 'new-ugc-id', data: {} });
  mockUpdateDataItem.mockResolvedValue({ id: 'ugc-1', data: {} });
  mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'granted', granted: true });
  mockLaunchImageLibrary.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///mock-photo.jpg', width: 800, height: 600, type: 'image' }],
  });
});

// ── Section 1: Loading ────────────────────────────────────────────────────────

describe('loading state', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    expect(result.current.loading).toBe(true);
  });

  it('sets loading false after fetch resolves', async () => {
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});

// ── Section 2: Successful fetch ───────────────────────────────────────────────

describe('successful fetch', () => {
  it('returns photos array', async () => {
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.photos).toHaveLength(2);
  });

  it('has null fetchError on success', async () => {
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fetchError).toBeNull();
  });

  it('queries with approved+featured filter', async () => {
    renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    const [collectionId, options] = mockQueryData.mock.calls[0];
    expect(collectionId).toBe('UGCPhotos');
    expect(options.filter).toMatchObject({ productId: PRODUCT_ID });
    // status filter must include approved and featured but not pending/rejected
    const statusFilter = options.filter.status;
    expect(statusFilter).toEqual(
      expect.objectContaining({ $in: expect.arrayContaining(['approved', 'featured']) }),
    );
    expect(statusFilter.$in).not.toContain('pending');
    expect(statusFilter.$in).not.toContain('rejected');
  });

  it('does not return pending photos', async () => {
    mockQueryData.mockResolvedValue({
      items: [APPROVED_PHOTO, FEATURED_PHOTO, PENDING_PHOTO],
      totalResults: 3,
    });
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // This test validates the query filter, not client-side filtering
    expect(mockQueryData.mock.calls[0][1].filter.status.$in).not.toContain('pending');
  });
});

// ── Section 3: Empty state ────────────────────────────────────────────────────

describe('empty state', () => {
  it('returns empty array when no photos', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.photos).toEqual([]);
  });
});

// ── Section 4: Error state ────────────────────────────────────────────────────

describe('fetch error', () => {
  it('sets fetchError when query throws', async () => {
    mockQueryData.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fetchError).toBe('Network error');
  });

  it('sets fetchError when no wix client', async () => {
    mockUseOptionalWixClient.mockReturnValue(null);
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fetchError).toBeTruthy();
  });

  it('returns empty photos array on error', async () => {
    mockQueryData.mockRejectedValue(new Error('Timeout'));
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.photos).toEqual([]);
  });
});

// ── Section 5: Photo submission ───────────────────────────────────────────────

describe('submitPhoto', () => {
  it('calls launchImageLibraryAsync on submit', async () => {
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.submitPhoto({ roomType: 'living-room', caption: 'Nice!' });
    });
    expect(mockLaunchImageLibrary).toHaveBeenCalled();
  });

  it('sets isSubmitting true during submit', async () => {
    let resolveInsert!: (v: unknown) => void;
    mockInsertDataItem.mockReturnValue(
      new Promise((res) => {
        resolveInsert = res;
      }),
    );
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.submitPhoto({ roomType: 'living-room', caption: 'Test' });
    });
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    act(() => resolveInsert({ id: 'new-id', data: {} }));
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
  });

  it('sets submitSuccess true on successful submit', async () => {
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.submitPhoto({ roomType: 'bedroom', caption: 'Great room!' });
    });
    expect(result.current.submitSuccess).toBe(true);
  });

  it('optimistically inserts photo into list', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    let resolveInsert!: (v: unknown) => void;
    mockInsertDataItem.mockReturnValue(
      new Promise((res) => {
        resolveInsert = res;
      }),
    );
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.submitPhoto({ roomType: 'office', caption: 'My office' });
    });
    await waitFor(() => expect(result.current.photos).toHaveLength(1));
    act(() => resolveInsert({ id: 'new-id', data: {} }));
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
  });

  it('rolls back optimistic insert on error', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    mockInsertDataItem.mockRejectedValue(new Error('Upload failed'));
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.submitPhoto({ roomType: 'dorm', caption: 'Dorm life' });
    });
    expect(result.current.photos).toEqual([]);
    expect(result.current.submitError).toBe('Upload failed');
  });
});

// ── Section 6: Permission handling ───────────────────────────────────────────

describe('permission handling', () => {
  it('sets submitError when media library permission denied', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'denied', granted: false });
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.submitPhoto({ roomType: 'living-room', caption: 'Test' });
    });
    expect(result.current.submitError).toMatch(/permission/i);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('does not call insertDataItem when permission denied', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'denied', granted: false });
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.submitPhoto({ roomType: 'bedroom', caption: 'Test' });
    });
    expect(mockInsertDataItem).not.toHaveBeenCalled();
  });

  it('does nothing when picker is canceled', async () => {
    mockLaunchImageLibrary.mockResolvedValue({ canceled: true, assets: [] });
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.submitPhoto({ roomType: 'office', caption: 'Test' });
    });
    expect(mockInsertDataItem).not.toHaveBeenCalled();
    expect(result.current.submitSuccess).toBe(false);
    expect(result.current.submitError).toBeNull();
  });
});

// ── Section 7: Input validation ───────────────────────────────────────────────

describe('input validation', () => {
  it('rejects caption longer than 80 characters', async () => {
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.submitPhoto({ roomType: 'living-room', caption: 'A'.repeat(81) });
    });
    expect(result.current.submitError).toMatch(/80/);
    expect(mockInsertDataItem).not.toHaveBeenCalled();
  });

  it('accepts caption of exactly 80 characters', async () => {
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.submitPhoto({ roomType: 'living-room', caption: 'A'.repeat(80) });
    });
    expect(result.current.submitError).toBeNull();
    expect(result.current.submitSuccess).toBe(true);
  });

  it('allows empty caption', async () => {
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.submitPhoto({ roomType: 'bedroom', caption: '' });
    });
    expect(result.current.submitSuccess).toBe(true);
  });
});

// ── Section 8: XSS sanitization ──────────────────────────────────────────────

describe('XSS sanitization', () => {
  it('strips HTML tags from caption before submit', async () => {
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.submitPhoto({ roomType: 'living-room', caption: '<b>Bold caption</b>' });
    });
    const [, data] = mockInsertDataItem.mock.calls[0];
    expect(data.caption).toBe('Bold caption');
  });

  it('strips script block content from caption', async () => {
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.submitPhoto({
        roomType: 'office',
        caption: '<script>alert("xss")</script>Nice photo',
      });
    });
    const [, data] = mockInsertDataItem.mock.calls[0];
    expect(data.caption).not.toContain('<script>');
    expect(data.caption).not.toContain('alert');
    expect(data.caption).toBe('Nice photo');
  });
});

// ── Section 9: Vote ───────────────────────────────────────────────────────────

describe('votePhoto', () => {
  it('calls updateDataItem with incremented voteCount', async () => {
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.votePhoto('ugc-1');
    });
    expect(mockUpdateDataItem).toHaveBeenCalledWith(
      'UGCPhotos',
      'ugc-1',
      expect.objectContaining({ voteCount: expect.any(Number) }),
    );
  });

  it('optimistically increments voteCount in UI', async () => {
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = result.current.photos.find((p) => p.id === 'ugc-1')?.voteCount ?? 0;
    let resolveUpdate!: (v: unknown) => void;
    mockUpdateDataItem.mockReturnValue(
      new Promise((res) => {
        resolveUpdate = res;
      }),
    );
    act(() => {
      result.current.votePhoto('ugc-1');
    });
    await waitFor(() => {
      const after = result.current.photos.find((p) => p.id === 'ugc-1')?.voteCount ?? 0;
      expect(after).toBe(before + 1);
    });
    act(() => resolveUpdate({ id: 'ugc-1', data: {} }));
  });

  it('rolls back vote on update error', async () => {
    mockUpdateDataItem.mockRejectedValue(new Error('Vote failed'));
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = result.current.photos.find((p) => p.id === 'ugc-1')?.voteCount ?? 0;
    await act(async () => {
      await result.current.votePhoto('ugc-1');
    });
    const after = result.current.photos.find((p) => p.id === 'ugc-1')?.voteCount ?? 0;
    expect(after).toBe(before);
  });

  it('sets voteError when update fails', async () => {
    mockUpdateDataItem.mockRejectedValue(new Error('Vote failed'));
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.votePhoto('ugc-1');
    });
    expect(result.current.voteError).toBeTruthy();
  });

  it('does nothing when no wix client', async () => {
    mockUseOptionalWixClient.mockReturnValue(null);
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.votePhoto('ugc-1');
    });
    expect(mockUpdateDataItem).not.toHaveBeenCalled();
  });
});

// ── Section 10: clearSubmitStatus ────────────────────────────────────────────

describe('clearSubmitStatus', () => {
  it('clears submitError and submitSuccess', async () => {
    mockInsertDataItem.mockRejectedValue(new Error('Fail'));
    const { result } = renderHook(() => useUGCPhotos(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.submitPhoto({ roomType: 'dorm', caption: 'Test' });
    });
    expect(result.current.submitError).toBeTruthy();
    act(() => result.current.clearSubmitStatus());
    expect(result.current.submitError).toBeNull();
    expect(result.current.submitSuccess).toBe(false);
  });
});

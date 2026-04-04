/**
 * TDD tests for useSavedARLayouts — cm-h6t
 *
 * Covers: load on mount, save, delete, rename, thumbnails,
 * max-cap enforcement, corrupt storage, error paths, share text,
 * and cloud sync stub.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSavedARLayouts, MAX_SAVED_LAYOUTS } from '../useSavedARLayouts';

// ── AsyncStorage mock ─────────────────────────────────────────────────────────
const mockSetItem: jest.Mock = jest.fn(() => Promise.resolve());
const mockGetItem: jest.Mock = jest.fn(() => Promise.resolve(null));
const mockRemoveItem: jest.Mock = jest.fn(() => Promise.resolve());

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: (...args: unknown[]) => mockSetItem(...args),
  getItem: (...args: unknown[]) => mockGetItem(...args),
  removeItem: (...args: unknown[]) => mockRemoveItem(...args),
}));

// ── Cloud sync service mock ───────────────────────────────────────────────────
jest.mock('@/services/arLayoutSync', () => ({
  pushLayouts: jest.fn(() => Promise.resolve()),
  pullLayouts: jest.fn(() => Promise.resolve([])),
}));
import { pushLayouts } from '@/services/arLayoutSync';

// ── Helpers ───────────────────────────────────────────────────────────────────
const ITEM_A = { modelId: 'asheville-full', fabricId: 'natural-linen' };
const ITEM_B = { modelId: 'blue-ridge-queen', fabricId: 'slate-gray' };

const STORAGE_KEY = '@cf_ar_layouts';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
});

// ─────────────────────────────────────────────────────────────────────────────

describe('useSavedARLayouts — initial state', () => {
  it('starts with empty layouts and isLoading true then false', async () => {
    const { result } = renderHook(() => useSavedARLayouts());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.layouts).toEqual([]);
  });

  it('loads stored layouts from AsyncStorage on mount', async () => {
    const stored = [
      {
        id: 'layout-1',
        name: 'Living Room',
        items: [ITEM_A],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
    mockGetItem.mockResolvedValueOnce(JSON.stringify(stored));

    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.layouts).toHaveLength(1);
    expect(result.current.layouts[0].name).toBe('Living Room');
    expect(mockGetItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('handles corrupt AsyncStorage data gracefully', async () => {
    mockGetItem.mockResolvedValueOnce('not valid json {{');
    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.layouts).toEqual([]);
  });

  it('handles non-array stored data gracefully', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify({ not: 'an array' }));
    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.layouts).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('useSavedARLayouts — saveLayout', () => {
  it('saves a layout and returns the saved object', async () => {
    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let saved: Awaited<ReturnType<typeof result.current.saveLayout>>;
    await act(async () => {
      saved = await result.current.saveLayout('My Room', [ITEM_A, ITEM_B]);
    });

    expect(saved).not.toBeNull();
    expect(saved!.name).toBe('My Room');
    expect(saved!.items).toEqual([ITEM_A, ITEM_B]);
    expect(saved!.id).toBeTruthy();
    expect(saved!.createdAt).toBeTruthy();
  });

  it('adds saved layout to the layouts list', async () => {
    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.saveLayout('My Room', [ITEM_A]);
    });

    expect(result.current.layouts).toHaveLength(1);
    expect(result.current.layouts[0].name).toBe('My Room');
  });

  it('persists to AsyncStorage on save', async () => {
    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.saveLayout('Bedroom', [ITEM_B]);
    });

    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEY, expect.stringContaining('Bedroom'));
  });

  it('saves optional thumbnailUri', async () => {
    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.saveLayout('Cozy Nook', [ITEM_A], 'file:///tmp/thumb.jpg');
    });

    expect(result.current.layouts[0].thumbnailUri).toBe('file:///tmp/thumb.jpg');
  });

  it('returns null and does not add when at max capacity', async () => {
    const maxLayouts = Array.from({ length: MAX_SAVED_LAYOUTS }, (_, i) => ({
      id: `layout-${i}`,
      name: `Room ${i}`,
      items: [ITEM_A],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }));
    mockGetItem.mockResolvedValueOnce(JSON.stringify(maxLayouts));

    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let saved: Awaited<ReturnType<typeof result.current.saveLayout>>;
    await act(async () => {
      saved = await result.current.saveLayout('One More Room', [ITEM_B]);
    });

    expect(saved!).toBeNull();
    expect(result.current.layouts).toHaveLength(MAX_SAVED_LAYOUTS);
  });

  it('returns null when AsyncStorage.setItem throws', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('disk full'));
    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let saved: Awaited<ReturnType<typeof result.current.saveLayout>>;
    await act(async () => {
      saved = await result.current.saveLayout('Fails', [ITEM_A]);
    });

    expect(saved!).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('useSavedARLayouts — deleteLayout', () => {
  it('removes a layout by id', async () => {
    const stored = [
      {
        id: 'layout-del',
        name: 'To Delete',
        items: [ITEM_A],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'layout-keep',
        name: 'Keep This',
        items: [ITEM_B],
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      },
    ];
    mockGetItem.mockResolvedValueOnce(JSON.stringify(stored));

    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteLayout('layout-del');
    });

    expect(result.current.layouts).toHaveLength(1);
    expect(result.current.layouts[0].id).toBe('layout-keep');
  });

  it('persists deletion to AsyncStorage', async () => {
    const stored = [
      {
        id: 'layout-x',
        name: 'X',
        items: [ITEM_A],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
    mockGetItem.mockResolvedValueOnce(JSON.stringify(stored));

    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteLayout('layout-x');
    });

    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify([]));
  });

  it('is a no-op for unknown id', async () => {
    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteLayout('nonexistent');
    });

    expect(result.current.layouts).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('useSavedARLayouts — renameLayout', () => {
  it('updates the name of an existing layout', async () => {
    const stored = [
      {
        id: 'layout-r',
        name: 'Old Name',
        items: [ITEM_A],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
    mockGetItem.mockResolvedValueOnce(JSON.stringify(stored));

    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.renameLayout('layout-r', 'New Name');
    });

    expect(result.current.layouts[0].name).toBe('New Name');
  });

  it('updates updatedAt when renamed', async () => {
    const stored = [
      {
        id: 'layout-r2',
        name: 'X',
        items: [ITEM_A],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
    mockGetItem.mockResolvedValueOnce(JSON.stringify(stored));

    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const before = result.current.layouts[0].updatedAt;

    await act(async () => {
      await new Promise((r) => setTimeout(r, 5)); // ensure clock ticks
      await result.current.renameLayout('layout-r2', 'Y');
    });

    expect(result.current.layouts[0].updatedAt).not.toBe(before);
  });

  it('persists rename to AsyncStorage', async () => {
    const stored = [
      {
        id: 'layout-rp',
        name: 'Old',
        items: [ITEM_A],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
    mockGetItem.mockResolvedValueOnce(JSON.stringify(stored));

    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.renameLayout('layout-rp', 'New');
    });

    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEY, expect.stringContaining('New'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('useSavedARLayouts — getShareText', () => {
  it('returns a non-empty string for a layout', async () => {
    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const layout = {
      id: 'x',
      name: 'Dream Room',
      items: [ITEM_A, ITEM_B],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const text = result.current.getShareText(layout);
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });

  it('includes the layout name in share text', async () => {
    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const layout = {
      id: 'x',
      name: 'Cozy Den',
      items: [ITEM_A],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    expect(result.current.getShareText(layout)).toContain('Cozy Den');
  });

  it('includes item count in share text', async () => {
    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const layout = {
      id: 'x',
      name: 'Room',
      items: [ITEM_A, ITEM_B],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const text = result.current.getShareText(layout);
    expect(text).toMatch(/2/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('useSavedARLayouts — cloud sync', () => {
  it('starts with syncStatus idle', async () => {
    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.syncStatus).toBe('idle');
    expect(result.current.lastSyncedAt).toBeNull();
  });

  it('sets syncStatus to syncing during syncToCloud', async () => {
    let resolvePush!: () => void;
    (pushLayouts as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>((r) => {
          resolvePush = r;
        }),
    );

    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      void result.current.syncToCloud();
    });

    expect(result.current.syncStatus).toBe('syncing');
    await act(async () => {
      resolvePush();
    });
    expect(result.current.syncStatus).toBe('idle');
  });

  it('sets syncStatus to error when sync fails', async () => {
    (pushLayouts as jest.Mock).mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.syncToCloud();
    });

    expect(result.current.syncStatus).toBe('error');
  });

  it('updates lastSyncedAt on successful sync', async () => {
    const { result } = renderHook(() => useSavedARLayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.syncToCloud();
    });

    expect(result.current.lastSyncedAt).not.toBeNull();
  });
});

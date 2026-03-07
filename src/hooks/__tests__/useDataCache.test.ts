import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDataCache } from '../useDataCache';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe('useDataCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it('returns null data initially while loading', () => {
    const fetcher = jest.fn().mockResolvedValue({ items: [] });
    const { result } = renderHook(() => useDataCache('products', fetcher));
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('fetches fresh data and returns it', async () => {
    const fetcher = jest.fn().mockResolvedValue({ items: [1, 2, 3] });
    const { result } = renderHook(() => useDataCache('products', fetcher));
    await act(async () => {});
    expect(result.current.data).toEqual({ items: [1, 2, 3] });
    expect(result.current.isLoading).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('caches fetched data to AsyncStorage', async () => {
    const fetcher = jest.fn().mockResolvedValue({ items: [1] });
    renderHook(() => useDataCache('products', fetcher));
    await act(async () => {});
    expect(mockSetItem).toHaveBeenCalledWith(
      '@cfutons/cache/products',
      expect.stringContaining('"items":[1]'),
    );
  });

  it('serves cached data immediately when available', async () => {
    const cached = JSON.stringify({ data: { items: [1, 2] }, timestamp: Date.now() });
    mockGetItem.mockResolvedValue(cached);
    const fetcher = jest.fn().mockResolvedValue({ items: [1, 2, 3] });

    const { result } = renderHook(() => useDataCache('products', fetcher));
    await act(async () => {});

    // Cached data served first
    expect(result.current.data).toBeDefined();
    expect(result.current.isStale).toBe(false);
  });

  it('marks data as stale when cache is old', async () => {
    const oldTimestamp = Date.now() - 60 * 60 * 1000; // 1 hour ago
    const cached = JSON.stringify({ data: { items: [1] }, timestamp: oldTimestamp });
    mockGetItem.mockResolvedValue(cached);
    const fetcher = jest.fn().mockResolvedValue({ items: [1, 2] });

    const { result } = renderHook(() => useDataCache('products', fetcher, { maxAge: 30 * 60 * 1000 }));
    await act(async () => {});

    // Should still return cached data
    expect(result.current.data).toBeDefined();
  });

  it('serves cached data when fetch fails (offline)', async () => {
    const cached = JSON.stringify({ data: { items: [1, 2] }, timestamp: Date.now() });
    mockGetItem.mockResolvedValue(cached);
    const fetcher = jest.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDataCache('products', fetcher));
    await act(async () => {});

    expect(result.current.data).toEqual({ items: [1, 2] });
    expect(result.current.error).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns error when no cache and fetch fails', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useDataCache('products', fetcher));
    await act(async () => {});

    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toBe('Network error');
  });

  it('allows manual refresh', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockResolvedValueOnce({ v: 2 });

    const { result } = renderHook(() => useDataCache('products', fetcher));
    await act(async () => {});
    expect(result.current.data).toEqual({ v: 1 });

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.data).toEqual({ v: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

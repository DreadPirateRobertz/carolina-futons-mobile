import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRecentlyViewed } from '../useRecentlyViewed';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

describe('useRecentlyViewed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with empty list when no stored data', async () => {
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.count).toBe(0);
    expect(result.current.recentProducts).toEqual([]);
  });

  it('adds a viewed product', async () => {
    const { result } = renderHook(() => useRecentlyViewed());

    await act(async () => {
      await result.current.addViewed('prod-test');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@recently_viewed',
      expect.stringContaining('prod-test'),
    );
  });

  it('deduplicates product IDs (moves to front)', async () => {
    const { result } = renderHook(() => useRecentlyViewed());

    await act(async () => {
      await result.current.addViewed('prod-a');
    });
    await act(async () => {
      await result.current.addViewed('prod-b');
    });
    await act(async () => {
      await result.current.addViewed('prod-a');
    });

    // Last setItem call should have prod-a first
    const lastCall = (AsyncStorage.setItem as jest.Mock).mock.calls.at(-1);
    const ids = JSON.parse(lastCall[1]);
    expect(ids[0]).toBe('prod-a');
    expect(ids[1]).toBe('prod-b');
    expect(ids.length).toBe(2);
  });

  it('clears all viewed products', async () => {
    const { result } = renderHook(() => useRecentlyViewed());

    await act(async () => {
      await result.current.addViewed('prod-x');
    });
    await act(async () => {
      await result.current.clearAll();
    });

    expect(result.current.count).toBe(0);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@recently_viewed');
  });

  it('loads stored data on mount', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(['prod-stored']));

    const { result: _result } = renderHook(() => useRecentlyViewed());

    await act(async () => {
      // Wait for async useEffect to complete
      await new Promise((r) => setTimeout(r, 0));
    });

    // Verify getItem was called
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@recently_viewed');
  });
});

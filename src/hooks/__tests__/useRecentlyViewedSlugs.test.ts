import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRecentlyViewedSlugs } from '../useRecentlyViewedSlugs';

const STORAGE_KEY = 'recently_viewed_slugs';

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

describe('useRecentlyViewedSlugs', () => {
  describe('initial state', () => {
    it('starts with empty slugs when storage is empty', async () => {
      const { result } = renderHook(() => useRecentlyViewedSlugs());
      await waitFor(() => expect(result.current.slugs).toEqual([]));
    });

    it('loads slugs from AsyncStorage on mount', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(['asheville-full-futon', 'blue-ridge-queen-futon']),
      );
      const { result } = renderHook(() => useRecentlyViewedSlugs());
      await waitFor(() =>
        expect(result.current.slugs).toEqual(['asheville-full-futon', 'blue-ridge-queen-futon']),
      );
    });

    it('handles corrupted storage gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('not-valid-json{{{');
      const { result } = renderHook(() => useRecentlyViewedSlugs());
      await waitFor(() => expect(result.current.slugs).toEqual([]));
    });

    it('handles non-array stored value gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({ bad: true }));
      const { result } = renderHook(() => useRecentlyViewedSlugs());
      await waitFor(() => expect(result.current.slugs).toEqual([]));
    });
  });

  describe('addSlug', () => {
    it('adds a slug to the list', async () => {
      const { result } = renderHook(() => useRecentlyViewedSlugs());
      await waitFor(() => expect(result.current.slugs).toEqual([]));

      await act(async () => {
        await result.current.addSlug('asheville-full-futon');
      });

      expect(result.current.slugs[0]).toBe('asheville-full-futon');
    });

    it('persists to AsyncStorage with correct key', async () => {
      const { result } = renderHook(() => useRecentlyViewedSlugs());
      await waitFor(() => expect(result.current.slugs).toEqual([]));

      await act(async () => {
        await result.current.addSlug('asheville-full-futon');
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('asheville-full-futon'),
      );
    });

    it('deduplicates — moves existing slug to front', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(['asheville-full-futon', 'blue-ridge-queen-futon']),
      );
      const { result } = renderHook(() => useRecentlyViewedSlugs());
      await waitFor(() => expect(result.current.slugs.length).toBe(2));

      await act(async () => {
        await result.current.addSlug('blue-ridge-queen-futon');
      });

      expect(result.current.slugs[0]).toBe('blue-ridge-queen-futon');
      expect(result.current.slugs).not.toContain('blue-ridge-queen-futon'.repeat(2));
      expect(result.current.slugs.length).toBe(2);
    });

    it('caps at 10 items (FIFO)', async () => {
      const initial = Array.from({ length: 10 }, (_, i) => `product-${i}`);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(initial));
      const { result } = renderHook(() => useRecentlyViewedSlugs());
      await waitFor(() => expect(result.current.slugs.length).toBe(10));

      await act(async () => {
        await result.current.addSlug('new-product-slug');
      });

      expect(result.current.slugs.length).toBe(10);
      expect(result.current.slugs[0]).toBe('new-product-slug');
      expect(result.current.slugs).not.toContain('product-9');
    });

    it('handles AsyncStorage.setItem failure gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('quota exceeded'));
      const { result } = renderHook(() => useRecentlyViewedSlugs());
      await waitFor(() => expect(result.current.slugs).toEqual([]));

      await expect(
        act(async () => {
          await result.current.addSlug('asheville-full-futon');
        }),
      ).resolves.not.toThrow();
    });
  });
});

/**
 * Tests for useRecentlyViewed hook.
 *
 * Covers: persistence, cap at 10, deduplication, error handling,
 * storage failures, and injectable storage adapter.
 *
 * Bead: cfutons_mobile-c8h
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRecentlyViewed } from '../useRecentlyViewed';
import type { ProductStorage } from '../useRecentlyViewed';

const mockStorage: jest.Mocked<ProductStorage> = {
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.getItem.mockResolvedValue(null);
  mockStorage.setItem.mockResolvedValue(undefined);
  mockStorage.removeItem.mockResolvedValue(undefined);
});

describe('useRecentlyViewed', () => {
  describe('initial state', () => {
    it('starts with empty list when storage is empty', () => {
      const { result } = renderHook(() => useRecentlyViewed(mockStorage));
      expect(result.current.count).toBe(0);
      expect(result.current.recentProducts).toEqual([]);
    });

    it('calls getItem with correct key on mount', async () => {
      renderHook(() => useRecentlyViewed(mockStorage));
      await waitFor(() => {
        expect(mockStorage.getItem).toHaveBeenCalledWith('@recently_viewed');
      });
    });

    it('handles corrupt stored data gracefully', async () => {
      mockStorage.getItem.mockResolvedValueOnce('not-valid-json');
      const { result } = renderHook(() => useRecentlyViewed(mockStorage));
      await waitFor(() => {
        expect(result.current.count).toBe(0);
      });
    });

    it('handles storage load error gracefully', async () => {
      mockStorage.getItem.mockRejectedValueOnce(new Error('read failed'));
      const { result } = renderHook(() => useRecentlyViewed(mockStorage));
      await waitFor(() => {
        expect(result.current.count).toBe(0);
      });
    });
  });

  describe('addViewed', () => {
    it('adds a product ID and persists to storage', async () => {
      const { result } = renderHook(() => useRecentlyViewed(mockStorage));

      await act(async () => {
        await result.current.addViewed('prod-a');
      });

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        '@recently_viewed',
        expect.stringContaining('prod-a'),
      );
    });

    it('moves duplicate to front (LRU)', async () => {
      const { result } = renderHook(() => useRecentlyViewed(mockStorage));

      await act(async () => { await result.current.addViewed('prod-a'); });
      await act(async () => { await result.current.addViewed('prod-b'); });
      await act(async () => { await result.current.addViewed('prod-a'); });

      const lastCall = (mockStorage.setItem as jest.Mock).mock.calls.at(-1)!;
      const ids: string[] = JSON.parse(lastCall[1]);
      expect(ids[0]).toBe('prod-a');
      expect(ids.filter((id) => id === 'prod-a').length).toBe(1);
    });

    it('caps list at 10 items', async () => {
      const { result } = renderHook(() => useRecentlyViewed(mockStorage));

      await act(async () => {
        for (let i = 1; i <= 12; i++) {
          await result.current.addViewed(`prod-${i}`);
        }
      });

      const lastCall = (mockStorage.setItem as jest.Mock).mock.calls.at(-1)!;
      const ids: string[] = JSON.parse(lastCall[1]);
      expect(ids.length).toBeLessThanOrEqual(10);
    });

    it('cap is exactly 10, not 11 or more', async () => {
      const { result } = renderHook(() => useRecentlyViewed(mockStorage));

      await act(async () => {
        for (let i = 1; i <= 15; i++) {
          await result.current.addViewed(`prod-${i}`);
        }
      });

      const lastCall = (mockStorage.setItem as jest.Mock).mock.calls.at(-1)!;
      const ids: string[] = JSON.parse(lastCall[1]);
      expect(ids.length).toBe(10);
    });

    it('handles storage write failure gracefully', async () => {
      mockStorage.setItem.mockRejectedValueOnce(new Error('disk full'));
      const { result } = renderHook(() => useRecentlyViewed(mockStorage));

      await expect(
        act(async () => { await result.current.addViewed('prod-a'); }),
      ).resolves.not.toThrow();
    });

    it('calls captureException on storage write failure', async () => {
      const { captureException } = jest.requireMock('@/services/crashReporting');
      const error = new Error('disk full');
      mockStorage.setItem.mockRejectedValueOnce(error);
      const { result } = renderHook(() => useRecentlyViewed(mockStorage));

      await act(async () => { await result.current.addViewed('prod-a'); });

      await waitFor(() => {
        expect(captureException).toHaveBeenCalled();
      });
    });

    it('ignores empty string IDs', async () => {
      const { result } = renderHook(() => useRecentlyViewed(mockStorage));
      await act(async () => { await result.current.addViewed(''); });
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it('ignores whitespace-only IDs', async () => {
      const { result } = renderHook(() => useRecentlyViewed(mockStorage));
      await act(async () => { await result.current.addViewed('  '); });
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('resets count to 0 and removes from storage', async () => {
      const { result } = renderHook(() => useRecentlyViewed(mockStorage));

      await act(async () => { await result.current.addViewed('prod-a'); });
      await act(async () => { await result.current.clearAll(); });

      expect(result.current.count).toBe(0);
      expect(mockStorage.removeItem).toHaveBeenCalledWith('@recently_viewed');
    });
  });

  describe('count invariant', () => {
    it('count always equals recentProducts.length', async () => {
      const { result } = renderHook(() => useRecentlyViewed(mockStorage));
      await act(async () => { await result.current.addViewed('prod-a'); });
      expect(result.current.count).toBe(result.current.recentProducts.length);
    });
  });
});

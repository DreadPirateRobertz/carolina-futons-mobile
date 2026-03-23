/**
 * useGamificationTour tests — hq-jlttk
 */

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGamificationTour, GAMIFICATION_TOUR_KEY } from '../useGamificationTour';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
});

async function renderLoaded() {
  const hook = renderHook(() => useGamificationTour());
  await act(async () => {});
  return hook;
}

describe('useGamificationTour', () => {
  describe('initial state', () => {
    it('starts with loading=true and visible=false', () => {
      const { result } = renderHook(() => useGamificationTour());
      expect(result.current.loading).toBe(true);
      expect(result.current.visible).toBe(false);
    });

    it('sets visible=true when tour has not been seen', async () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = await renderLoaded();
      expect(result.current.visible).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it('sets visible=false when tour has already been seen', async () => {
      mockGetItem.mockResolvedValue('1');
      const { result } = await renderLoaded();
      expect(result.current.visible).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it('reads from the correct AsyncStorage key', async () => {
      await renderLoaded();
      expect(mockGetItem).toHaveBeenCalledWith(GAMIFICATION_TOUR_KEY);
    });
  });

  describe('dismiss', () => {
    it('sets visible=false immediately', async () => {
      const { result } = await renderLoaded();
      expect(result.current.visible).toBe(true);
      await act(async () => {
        await result.current.dismiss();
      });
      expect(result.current.visible).toBe(false);
    });

    it('persists seen flag to AsyncStorage', async () => {
      const { result } = await renderLoaded();
      await act(async () => {
        await result.current.dismiss();
      });
      expect(mockSetItem).toHaveBeenCalledWith(GAMIFICATION_TOUR_KEY, '1');
    });

    it('swallows AsyncStorage write errors silently', async () => {
      mockSetItem.mockRejectedValue(new Error('disk full'));
      const { result } = await renderLoaded();
      await act(async () => {
        await expect(result.current.dismiss()).resolves.toBeUndefined();
      });
      expect(result.current.visible).toBe(false);
    });
  });

  describe('error handling', () => {
    it('sets visible=false and loading=false when AsyncStorage read fails', async () => {
      mockGetItem.mockRejectedValue(new Error('storage unavailable'));
      const { result } = await renderLoaded();
      expect(result.current.visible).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it('does not throw when AsyncStorage read rejects', async () => {
      mockGetItem.mockRejectedValue(new Error('nope'));
      await expect(renderLoaded()).resolves.not.toThrow();
    });
  });
});

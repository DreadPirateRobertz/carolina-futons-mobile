// Mock AsyncStorage — must be defined before import
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => {
  return {
    __esModule: true,
    default: {
      getItem: (...args: any[]) => mockGetItem(...args),
      setItem: (...args: any[]) => mockSetItem(...args),
    },
  };
});

import {
  loadCachedPermission,
  saveCachedPermission,
  getCachedPermissionSync,
  resetCache,
} from '../cameraPermissionCache';

describe('cameraPermissionCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetCache();
  });

  describe('loadCachedPermission', () => {
    it('returns "undetermined" when nothing is cached', async () => {
      mockGetItem.mockResolvedValue(null);
      const result = await loadCachedPermission();
      expect(result).toBe('undetermined');
    });

    it('returns "granted" when cached as granted', async () => {
      mockGetItem.mockResolvedValue('granted');
      const result = await loadCachedPermission();
      expect(result).toBe('granted');
    });

    it('returns "denied" when cached as denied', async () => {
      mockGetItem.mockResolvedValue('denied');
      const result = await loadCachedPermission();
      expect(result).toBe('denied');
    });

    it('returns "undetermined" for invalid cached values', async () => {
      mockGetItem.mockResolvedValue('invalid-state');
      const result = await loadCachedPermission();
      expect(result).toBe('undetermined');
    });

    it('returns "undetermined" when AsyncStorage throws', async () => {
      mockGetItem.mockRejectedValue(new Error('Storage error'));
      const result = await loadCachedPermission();
      expect(result).toBe('undetermined');
    });

    it('uses in-memory cache on subsequent calls', async () => {
      mockGetItem.mockResolvedValue('granted');
      await loadCachedPermission();
      await loadCachedPermission();
      // Second call should use in-memory cache, not call getItem again
      expect(mockGetItem).toHaveBeenCalledTimes(1);
    });

    it('reads from storage key @cfutons/camera-permission', async () => {
      mockGetItem.mockResolvedValue(null);
      await loadCachedPermission();
      expect(mockGetItem).toHaveBeenCalledWith('@cfutons/camera-permission');
    });
  });

  describe('saveCachedPermission', () => {
    it('persists "granted" to AsyncStorage', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await saveCachedPermission('granted');
      expect(mockSetItem).toHaveBeenCalledWith('@cfutons/camera-permission', 'granted');
    });

    it('persists "denied" to AsyncStorage', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await saveCachedPermission('denied');
      expect(mockSetItem).toHaveBeenCalledWith('@cfutons/camera-permission', 'denied');
    });

    it('updates in-memory cache', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await saveCachedPermission('granted');
      expect(getCachedPermissionSync()).toBe('granted');
    });

    it('does not throw when AsyncStorage fails', async () => {
      mockSetItem.mockRejectedValue(new Error('Storage error'));
      await expect(saveCachedPermission('granted')).resolves.toBeUndefined();
    });

    it('still updates in-memory cache when AsyncStorage fails', async () => {
      mockSetItem.mockRejectedValue(new Error('Storage error'));
      await saveCachedPermission('denied');
      expect(getCachedPermissionSync()).toBe('denied');
    });
  });

  describe('getCachedPermissionSync', () => {
    it('returns null before loadCachedPermission is called', () => {
      expect(getCachedPermissionSync()).toBeNull();
    });

    it('returns cached value after loadCachedPermission', async () => {
      mockGetItem.mockResolvedValue('granted');
      await loadCachedPermission();
      expect(getCachedPermissionSync()).toBe('granted');
    });

    it('returns updated value after saveCachedPermission', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await saveCachedPermission('denied');
      expect(getCachedPermissionSync()).toBe('denied');
    });
  });

  describe('resetCache', () => {
    it('clears in-memory cache', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await saveCachedPermission('granted');
      expect(getCachedPermissionSync()).toBe('granted');
      resetCache();
      expect(getCachedPermissionSync()).toBeNull();
    });
  });
});

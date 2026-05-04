/**
 * @module useNotificationPreferences tests
 * TDD spec — written before implementation.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNotificationPreferences } from '../useNotificationPreferences';

// --- Mocks ----------------------------------------------------------------

const mockSavePreferences = jest.fn().mockResolvedValue(undefined);
const mockPreferences = {
  orderUpdates: true,
  promotions: true,
  backInStock: true,
  priceDropAlerts: false,
  cartReminders: false,
  cartRecovery: false,
  streakMilestone: true,
  questComplete: true,
  dailySpinReminder: false,
};

jest.mock('@/hooks/useNotificationStorage', () => ({
  useNotificationStorage: () => ({
    preferences: mockPreferences,
    isLoading: false,
    savePreferences: mockSavePreferences,
  }),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));

let mockIsDevice = true;
jest.mock('expo-device', () => ({
  get isDevice() {
    return mockIsDevice;
  },
}));

const mockGetPushPreferences = jest.fn().mockResolvedValue(mockPreferences);
const mockUpdatePushPreferences = jest.fn().mockResolvedValue(undefined);

jest.mock('@/services/pushPreferencesService', () => ({
  getPushPreferences: (...args: unknown[]) => mockGetPushPreferences(...args),
  updatePushPreferences: (...args: unknown[]) => mockUpdatePushPreferences(...args),
}));

const mockCallFunction = jest.fn();
jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => ({ callFunction: mockCallFunction }),
}));

// --- Tests ----------------------------------------------------------------

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSavePreferences.mockResolvedValue(undefined);
    mockGetPushPreferences.mockResolvedValue(mockPreferences);
    mockUpdatePushPreferences.mockResolvedValue(undefined);
  });

  describe('initial state', () => {
    it('returns current preferences from storage', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      expect(result.current.preferences).toEqual(mockPreferences);
    });

    it('returns isLoading from storage', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      expect(result.current.isLoading).toBe(false);
    });

    it('isSaving starts false', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      expect(result.current.isSaving).toBe(false);
    });

    it('error starts null', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      expect(result.current.error).toBeNull();
    });
  });

  describe('backend hydration on mount', () => {
    it('calls getPushPreferences on mount to load from Velo', async () => {
      const { result } = renderHook(() => useNotificationPreferences());
      await waitFor(() => expect(mockGetPushPreferences).toHaveBeenCalledTimes(1));
      expect(result.current.preferences).toBeDefined();
    });

    it('does not throw when getPushPreferences fails (backend unavailable)', async () => {
      mockGetPushPreferences.mockRejectedValueOnce(new Error('network error'));
      const { result } = renderHook(() => useNotificationPreferences());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBeNull();
    });

    it('falls back to local storage preferences when backend unavailable', async () => {
      mockGetPushPreferences.mockRejectedValueOnce(new Error('offline'));
      const { result } = renderHook(() => useNotificationPreferences());
      await waitFor(() => expect(mockGetPushPreferences).toHaveBeenCalled());
      expect(result.current.preferences).toEqual(mockPreferences);
    });
  });

  describe('isPushSupported', () => {
    it('is true when device and permission granted', async () => {
      const { result } = renderHook(() => useNotificationPreferences());
      await waitFor(() => {
        expect(result.current.isPushSupported).toBe(true);
      });
    });

    it('is false when not a device (simulator)', async () => {
      mockIsDevice = false;
      const { result } = renderHook(() => useNotificationPreferences());
      await waitFor(() => {
        expect(result.current.isPushSupported).toBe(false);
      });
      mockIsDevice = true;
    });

    it('is false when permission denied', async () => {
      const Notifications = require('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
      const { result } = renderHook(() => useNotificationPreferences());
      await waitFor(() => {
        expect(result.current.isPushSupported).toBe(false);
      });
    });

    it('is false when getPermissionsAsync throws', async () => {
      const Notifications = require('expo-notifications');
      Notifications.getPermissionsAsync.mockRejectedValueOnce(new Error('Permission error'));
      const { result } = renderHook(() => useNotificationPreferences());
      await waitFor(() => {
        expect(result.current.isPushSupported).toBe(false);
      });
    });
  });

  describe('toggle', () => {
    it('calls savePreferences with toggled key', async () => {
      const { result } = renderHook(() => useNotificationPreferences());
      await act(async () => {
        await result.current.toggle('streakMilestone');
      });
      expect(mockSavePreferences).toHaveBeenCalledWith({
        ...mockPreferences,
        streakMilestone: false,
      });
    });

    it('calls updatePushPreferences with updated prefs via Velo webMethod', async () => {
      const { result } = renderHook(() => useNotificationPreferences());
      await act(async () => {
        await result.current.toggle('questComplete');
      });
      expect(mockUpdatePushPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ callFunction: expect.any(Function) }),
        expect.objectContaining({ questComplete: false }),
      );
    });

    it('sets isSaving true while saving, false after', async () => {
      let resolveSave: () => void;
      mockSavePreferences.mockReturnValueOnce(
        new Promise<void>((r) => {
          resolveSave = r;
        }),
      );
      const { result } = renderHook(() => useNotificationPreferences());
      await act(async () => {
        result.current.toggle('dailySpinReminder');
      });
      expect(result.current.isSaving).toBe(true);
      await act(async () => {
        resolveSave!();
      });
      expect(result.current.isSaving).toBe(false);
    });

    it('sets error and clears isSaving when savePreferences fails', async () => {
      mockSavePreferences.mockRejectedValueOnce(new Error('Storage write failed'));
      const { result } = renderHook(() => useNotificationPreferences());
      await act(async () => {
        await result.current.toggle('streakMilestone');
      });
      expect(result.current.error).toEqual(new Error('Storage write failed'));
      expect(result.current.isSaving).toBe(false);
    });

    it('sets error when updatePushPreferences fails', async () => {
      mockUpdatePushPreferences.mockRejectedValueOnce(new Error('Velo error'));
      const { result } = renderHook(() => useNotificationPreferences());
      await act(async () => {
        await result.current.toggle('questComplete');
      });
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.isSaving).toBe(false);
    });

    it('sets error when updatePushPreferences throws offline (network)', async () => {
      mockUpdatePushPreferences.mockRejectedValueOnce(new Error('Network request failed'));
      const { result } = renderHook(() => useNotificationPreferences());
      await act(async () => {
        await result.current.toggle('dailySpinReminder');
      });
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.isSaving).toBe(false);
    });

    it('clears previous error on next successful toggle', async () => {
      mockUpdatePushPreferences.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useNotificationPreferences());
      await act(async () => {
        await result.current.toggle('streakMilestone');
      });
      expect(result.current.error).toBeInstanceOf(Error);

      mockUpdatePushPreferences.mockResolvedValueOnce(undefined);
      await act(async () => {
        await result.current.toggle('questComplete');
      });
      expect(result.current.error).toBeNull();
    });

    it('works for all gamification pref keys', async () => {
      const { result } = renderHook(() => useNotificationPreferences());
      for (const key of ['streakMilestone', 'questComplete', 'dailySpinReminder'] as const) {
        await act(async () => {
          await result.current.toggle(key);
        });
        expect(mockSavePreferences).toHaveBeenCalledWith(
          expect.objectContaining({ [key]: !mockPreferences[key] }),
        );
        jest.clearAllMocks();
        mockSavePreferences.mockResolvedValue(undefined);
        mockUpdatePushPreferences.mockResolvedValue(undefined);
        mockGetPushPreferences.mockResolvedValue(mockPreferences);
      }
    });
  });

  describe('graceful handling when push not supported', () => {
    it('toggle still saves locally even when isPushSupported is false', async () => {
      const Notifications = require('expo-notifications');
      Notifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
      const { result } = renderHook(() => useNotificationPreferences());
      await waitFor(() => expect(result.current.isPushSupported).toBe(false));
      await act(async () => {
        await result.current.toggle('streakMilestone');
      });
      expect(mockSavePreferences).toHaveBeenCalled();
    });

    it('does not throw when updatePushPreferences returns error response', async () => {
      mockUpdatePushPreferences.mockRejectedValueOnce(new Error('validation_error'));
      const { result } = renderHook(() => useNotificationPreferences());
      await expect(
        act(async () => {
          await result.current.toggle('questComplete');
        }),
      ).resolves.not.toThrow();
    });
  });
});

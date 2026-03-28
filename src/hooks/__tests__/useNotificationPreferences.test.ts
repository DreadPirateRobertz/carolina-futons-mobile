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
  cartReminders: false,
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

const mockFetch = jest.fn().mockResolvedValue({ ok: true });
global.fetch = mockFetch;

// --- Tests ----------------------------------------------------------------

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSavePreferences.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({ ok: true });
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

    it('calls POST /notifications/preferences with updated prefs', async () => {
      const { result } = renderHook(() => useNotificationPreferences());
      await act(async () => {
        await result.current.toggle('questComplete');
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/preferences'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: expect.stringContaining('"questComplete":false'),
        }),
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

    it('sets error when remote sync fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      const { result } = renderHook(() => useNotificationPreferences());
      await act(async () => {
        await result.current.toggle('questComplete');
      });
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.isSaving).toBe(false);
    });

    it('sets error when fetch throws (network offline)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network request failed'));
      const { result } = renderHook(() => useNotificationPreferences());
      await act(async () => {
        await result.current.toggle('dailySpinReminder');
      });
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.isSaving).toBe(false);
    });

    it('clears previous error on next successful toggle', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useNotificationPreferences());
      await act(async () => {
        await result.current.toggle('streakMilestone');
      });
      expect(result.current.error).toBeInstanceOf(Error);

      mockFetch.mockResolvedValueOnce({ ok: true });
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
        mockFetch.mockResolvedValue({ ok: true });
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

    it('does not throw when remote sync 404s', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      const { result } = renderHook(() => useNotificationPreferences());
      await expect(
        act(async () => {
          await result.current.toggle('questComplete');
        }),
      ).resolves.not.toThrow();
    });
  });
});

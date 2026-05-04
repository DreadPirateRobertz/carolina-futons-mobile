/**
 * @module pushPreferencesService tests
 * TDD spec — written before implementation.
 */
import { getPushPreferences, updatePushPreferences } from '../pushPreferencesService';
import type { NotificationPreferences } from '@/services/notifications';

const mockCallFunction = jest.fn();
const mockClient = { callFunction: mockCallFunction };

const stubPrefs: NotificationPreferences = {
  orderUpdates: true,
  promotions: false,
  backInStock: true,
  priceDropAlerts: false,
  cartReminders: false,
  cartRecovery: false,
  streakMilestone: true,
  questComplete: true,
  dailySpinReminder: false,
};

describe('pushPreferencesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPushPreferences', () => {
    it('calls /_functions/managePushPreferences with GET', async () => {
      mockCallFunction.mockResolvedValue({ preferences: stubPrefs });
      await getPushPreferences(mockClient);
      expect(mockCallFunction).toHaveBeenCalledWith('/_functions/managePushPreferences', 'GET');
    });

    it('returns the preferences object from the response', async () => {
      mockCallFunction.mockResolvedValue({ preferences: stubPrefs });
      const result = await getPushPreferences(mockClient);
      expect(result).toEqual(stubPrefs);
    });

    it('throws when the response has no preferences field', async () => {
      mockCallFunction.mockResolvedValue({});
      await expect(getPushPreferences(mockClient)).rejects.toThrow();
    });

    it('propagates network errors', async () => {
      mockCallFunction.mockRejectedValue(new Error('network error'));
      await expect(getPushPreferences(mockClient)).rejects.toThrow('network error');
    });
  });

  describe('updatePushPreferences', () => {
    it('calls /_functions/managePushPreferences with POST and preferences body', async () => {
      mockCallFunction.mockResolvedValue({ success: true });
      await updatePushPreferences(mockClient, stubPrefs);
      expect(mockCallFunction).toHaveBeenCalledWith('/_functions/managePushPreferences', 'POST', {
        preferences: stubPrefs,
      });
    });

    it('resolves successfully when server returns success: true', async () => {
      mockCallFunction.mockResolvedValue({ success: true });
      await expect(updatePushPreferences(mockClient, stubPrefs)).resolves.toBeUndefined();
    });

    it('throws when server returns success: false', async () => {
      mockCallFunction.mockResolvedValue({ success: false, error: 'validation_error' });
      await expect(updatePushPreferences(mockClient, stubPrefs)).rejects.toThrow();
    });

    it('propagates network errors', async () => {
      mockCallFunction.mockRejectedValue(new Error('timeout'));
      await expect(updatePushPreferences(mockClient, stubPrefs)).rejects.toThrow('timeout');
    });
  });
});

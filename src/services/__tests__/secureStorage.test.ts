import * as SecureStore from 'expo-secure-store';
import {
  saveSecure,
  loadSecure,
  deleteSecure,
  migrateFromAsyncStorage,
  SECURE_KEYS,
} from '../secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');

const mockSet = SecureStore.setItemAsync as jest.Mock;
const mockGet = SecureStore.getItemAsync as jest.Mock;
const mockDel = SecureStore.deleteItemAsync as jest.Mock;
const mockAsyncGet = AsyncStorage.getItem as jest.Mock;
const mockAsyncRemove = AsyncStorage.removeItem as jest.Mock;

describe('secureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveSecure', () => {
    it('saves via SecureStore.setItemAsync', async () => {
      mockSet.mockResolvedValue(undefined);
      await saveSecure('auth_token', 'tok123');
      expect(mockSet).toHaveBeenCalledWith('auth_token', 'tok123');
    });

    it('swallows and logs errors (no throw)', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSet.mockRejectedValue(new Error('keychain locked'));
      await expect(saveSecure('k', 'v')).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[secureStorage]'),
        expect.anything(),
      );
      spy.mockRestore();
    });

    it('rejects empty key to prevent accidental global storage', async () => {
      await expect(saveSecure('', 'v')).rejects.toThrow(/key/i);
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('coerces undefined value to empty string rather than calling store', async () => {
      await saveSecure('k', undefined as unknown as string);
      expect(mockSet).not.toHaveBeenCalled();
    });
  });

  describe('loadSecure', () => {
    it('loads via SecureStore.getItemAsync', async () => {
      mockGet.mockResolvedValue('tok123');
      expect(await loadSecure('auth_token')).toBe('tok123');
    });

    it('returns null when key not found', async () => {
      mockGet.mockResolvedValue(null);
      expect(await loadSecure('missing')).toBeNull();
    });

    it('logs and returns null on read error', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGet.mockRejectedValue(new Error('keychain'));
      expect(await loadSecure('key')).toBeNull();
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[secureStorage]'),
        expect.anything(),
      );
      spy.mockRestore();
    });

    it('rejects empty key', async () => {
      await expect(loadSecure('')).rejects.toThrow(/key/i);
    });
  });

  describe('deleteSecure', () => {
    it('removes the key', async () => {
      mockDel.mockResolvedValue(undefined);
      await deleteSecure('auth_token');
      expect(mockDel).toHaveBeenCalledWith('auth_token');
    });

    it('swallows and logs errors', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockDel.mockRejectedValue(new Error('fail'));
      await expect(deleteSecure('k')).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('SECURE_KEYS registry', () => {
    it('exposes canonical keys for sensitive data', () => {
      expect(SECURE_KEYS.AUTH_TOKEN).toBe('auth_token');
      expect(SECURE_KEYS.MEMBER_ID).toBe('member_id');
      expect(SECURE_KEYS.SESSION_ID).toBe('session_id');
      expect(SECURE_KEYS.REFRESH_TOKEN).toBe('refresh_token');
    });
  });

  describe('migrateFromAsyncStorage', () => {
    it('moves a value from AsyncStorage to SecureStore and removes the legacy key', async () => {
      mockAsyncGet.mockResolvedValue('legacy-token');
      mockSet.mockResolvedValue(undefined);
      mockAsyncRemove.mockResolvedValue(undefined);

      const migrated = await migrateFromAsyncStorage('auth_token');

      expect(migrated).toBe(true);
      expect(mockAsyncGet).toHaveBeenCalledWith('auth_token');
      expect(mockSet).toHaveBeenCalledWith('auth_token', 'legacy-token');
      expect(mockAsyncRemove).toHaveBeenCalledWith('auth_token');
    });

    it('is a no-op when no legacy value exists', async () => {
      mockAsyncGet.mockResolvedValue(null);
      const migrated = await migrateFromAsyncStorage('auth_token');
      expect(migrated).toBe(false);
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockAsyncRemove).not.toHaveBeenCalled();
    });

    it('does not remove legacy key if secure save fails', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockAsyncGet.mockResolvedValue('legacy-token');
      mockSet.mockRejectedValue(new Error('keychain fail'));
      const migrated = await migrateFromAsyncStorage('auth_token');
      expect(migrated).toBe(false);
      expect(mockAsyncRemove).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});

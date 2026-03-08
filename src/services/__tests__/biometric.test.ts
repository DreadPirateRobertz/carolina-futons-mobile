import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import {
  getBiometricStatus,
  authenticate,
  isBiometricEnabled,
  setBiometricEnabled,
} from '../biometric';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getBiometricStatus', () => {
  it('returns available + enrolled with facial recognition', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);

    const result = await getBiometricStatus();
    expect(result).toEqual({
      isAvailable: true,
      isEnrolled: true,
      biometricType: 'facial',
    });
  });

  it('returns fingerprint type', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FINGERPRINT,
    ]);

    const result = await getBiometricStatus();
    expect(result.biometricType).toBe('fingerprint');
  });

  it('returns none when no types supported', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([]);

    const result = await getBiometricStatus();
    expect(result).toEqual({
      isAvailable: false,
      isEnrolled: false,
      biometricType: 'none',
    });
  });
});

describe('authenticate', () => {
  it('returns success on successful auth', async () => {
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
    const result = await authenticate();
    expect(result).toEqual({ success: true });
    expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
      promptMessage: 'Sign in to Carolina Futons',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
  });

  it('returns error on failure', async () => {
    mockLocalAuth.authenticateAsync.mockResolvedValue({
      success: false,
      error: 'user_cancel',
    });
    const result = await authenticate('Custom prompt');
    expect(result).toEqual({ success: false, error: 'user_cancel' });
  });

  it('uses custom prompt message', async () => {
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
    await authenticate('Enable biometric sign-in');
    expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'Enable biometric sign-in' }),
    );
  });
});

describe('isBiometricEnabled / setBiometricEnabled', () => {
  it('returns false when no value stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    expect(await isBiometricEnabled()).toBe(false);
  });

  it('returns true when stored as "true"', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue('true');
    expect(await isBiometricEnabled()).toBe(true);
  });

  it('returns false on SecureStore error', async () => {
    mockSecureStore.getItemAsync.mockRejectedValue(new Error('access denied'));
    expect(await isBiometricEnabled()).toBe(false);
  });

  it('setBiometricEnabled(true) stores value', async () => {
    await setBiometricEnabled(true);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('biometric_auth_enabled', 'true');
  });

  it('setBiometricEnabled(false) deletes value', async () => {
    await setBiometricEnabled(false);
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_auth_enabled');
  });
});

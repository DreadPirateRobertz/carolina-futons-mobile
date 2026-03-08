import { renderHook, act } from '@testing-library/react-native';
import { useBiometricAuth } from '../useBiometricAuth';
import * as biometricService from '@/services/biometric';

jest.mock('@/services/biometric', () => ({
  getBiometricStatus: jest.fn(() =>
    Promise.resolve({ isAvailable: true, isEnrolled: true, biometricType: 'facial' as const }),
  ),
  isBiometricEnabled: jest.fn(() => Promise.resolve(false)),
  authenticate: jest.fn(() => Promise.resolve({ success: true })),
  setBiometricEnabled: jest.fn(() => Promise.resolve()),
}));

const mockBio = biometricService as jest.Mocked<typeof biometricService>;

beforeEach(() => {
  jest.clearAllMocks();
  mockBio.getBiometricStatus.mockResolvedValue({
    isAvailable: true,
    isEnrolled: true,
    biometricType: 'facial',
  });
  mockBio.isBiometricEnabled.mockResolvedValue(false);
});

describe('useBiometricAuth', () => {
  it('loads biometric status on mount', async () => {
    const { result } = renderHook(() => useBiometricAuth());
    expect(result.current.loading).toBe(true);

    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.status.isAvailable).toBe(true);
    expect(result.current.status.biometricType).toBe('facial');
    expect(result.current.isEnabled).toBe(false);
  });

  it('reflects enabled state from storage', async () => {
    mockBio.isBiometricEnabled.mockResolvedValue(true);
    const { result } = renderHook(() => useBiometricAuth());
    await act(async () => {});

    expect(result.current.isEnabled).toBe(true);
  });

  it('enableBiometric authenticates then persists', async () => {
    mockBio.authenticate.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useBiometricAuth());
    await act(async () => {});

    let success: boolean = false;
    await act(async () => {
      success = await result.current.enableBiometric();
    });

    expect(success).toBe(true);
    expect(mockBio.authenticate).toHaveBeenCalledWith('Enable biometric sign-in');
    expect(mockBio.setBiometricEnabled).toHaveBeenCalledWith(true);
    expect(result.current.isEnabled).toBe(true);
  });

  it('enableBiometric returns false on auth failure', async () => {
    mockBio.authenticate.mockResolvedValue({ success: false, error: 'user_cancel' });
    const { result } = renderHook(() => useBiometricAuth());
    await act(async () => {});

    let success: boolean = true;
    await act(async () => {
      success = await result.current.enableBiometric();
    });

    expect(success).toBe(false);
    expect(mockBio.setBiometricEnabled).not.toHaveBeenCalled();
    expect(result.current.isEnabled).toBe(false);
  });

  it('disableBiometric clears preference', async () => {
    mockBio.isBiometricEnabled.mockResolvedValue(true);
    const { result } = renderHook(() => useBiometricAuth());
    await act(async () => {});

    await act(async () => {
      await result.current.disableBiometric();
    });

    expect(mockBio.setBiometricEnabled).toHaveBeenCalledWith(false);
    expect(result.current.isEnabled).toBe(false);
  });

  it('promptBiometric sets authenticating state', async () => {
    let resolveAuth: (v: { success: boolean }) => void;
    mockBio.authenticate.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAuth = resolve;
        }),
    );
    const { result } = renderHook(() => useBiometricAuth());
    await act(async () => {});

    let promptPromise: Promise<boolean>;
    act(() => {
      promptPromise = result.current.promptBiometric('Test prompt');
    });

    expect(result.current.authenticating).toBe(true);

    await act(async () => {
      resolveAuth!({ success: true });
      await promptPromise!;
    });

    expect(result.current.authenticating).toBe(false);
  });
});

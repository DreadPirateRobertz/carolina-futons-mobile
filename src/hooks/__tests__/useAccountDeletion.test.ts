import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useAccountDeletion } from '../useAccountDeletion';

const mockDeleteMember = jest.fn().mockResolvedValue(undefined);
const mockSignOut = jest.fn();

jest.mock('@/services/wix', () => ({
  useWixClient: () => ({
    deleteMember: mockDeleteMember,
  }),
}));

jest.mock('../useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com', displayName: 'Test User', phone: '', provider: 'email' },
    signOut: mockSignOut,
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  clear: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useAccountDeletion', () => {
  it('starts in idle status', () => {
    const { result } = renderHook(() => useAccountDeletion());
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('transitions to confirming on requestDeletion', () => {
    const { result } = renderHook(() => useAccountDeletion());
    act(() => result.current.requestDeletion());
    expect(result.current.status).toBe('confirming');
  });

  it('returns to idle on cancel', () => {
    const { result } = renderHook(() => useAccountDeletion());
    act(() => result.current.requestDeletion());
    act(() => result.current.cancel());
    expect(result.current.status).toBe('idle');
  });

  it('deletes member, clears data, and signs out on confirm', async () => {
    const { result } = renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.confirmDeletion();
    });

    expect(mockDeleteMember).toHaveBeenCalledWith('user-123');
    expect(AsyncStorage.clear).toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.status).toBe('deleted');
  });

  it('sets error status on API failure', async () => {
    mockDeleteMember.mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.confirmDeletion();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Server error');
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

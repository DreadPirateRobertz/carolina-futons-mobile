import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboarding } from '../useOnboarding';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe('useOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isLoading true initially', () => {
    mockGetItem.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns hasSeenOnboarding false for new users', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useOnboarding());
    await act(async () => {});
    expect(result.current.hasSeenOnboarding).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns hasSeenOnboarding true for returning users', async () => {
    mockGetItem.mockResolvedValue('true');
    const { result } = renderHook(() => useOnboarding());
    await act(async () => {});
    expect(result.current.hasSeenOnboarding).toBe(true);
  });

  it('completeOnboarding sets flag in AsyncStorage', async () => {
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOnboarding());
    await act(async () => {});

    await act(async () => {
      await result.current.completeOnboarding();
    });

    expect(mockSetItem).toHaveBeenCalledWith('@carolina_futons_onboarding_complete', 'true');
    expect(result.current.hasSeenOnboarding).toBe(true);
  });

  it('handles AsyncStorage read errors gracefully', async () => {
    mockGetItem.mockRejectedValue(new Error('Storage error'));
    const { result } = renderHook(() => useOnboarding());
    await act(async () => {});
    // On error, default to showing onboarding (false)
    expect(result.current.hasSeenOnboarding).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles AsyncStorage write errors gracefully', async () => {
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockRejectedValue(new Error('Write error'));
    const { result } = renderHook(() => useOnboarding());
    await act(async () => {});

    // Should not throw
    await act(async () => {
      await result.current.completeOnboarding();
    });
    // Still marks as complete in memory even if storage fails
    expect(result.current.hasSeenOnboarding).toBe(true);
  });

  it('reads from correct storage key', async () => {
    mockGetItem.mockResolvedValue(null);
    renderHook(() => useOnboarding());
    await act(async () => {});
    expect(mockGetItem).toHaveBeenCalledWith('@carolina_futons_onboarding_complete');
  });
});

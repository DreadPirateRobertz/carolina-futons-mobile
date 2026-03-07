import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAROnboarding } from '../useAROnboarding';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe('useAROnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts loading then resolves hasSeenAROnboarding', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useAROnboarding());
    expect(result.current.isLoading).toBe(true);
    await act(async () => {});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasSeenAROnboarding).toBe(false);
  });

  it('returns true for returning AR users', async () => {
    mockGetItem.mockResolvedValue('true');
    const { result } = renderHook(() => useAROnboarding());
    await act(async () => {});
    expect(result.current.hasSeenAROnboarding).toBe(true);
  });

  it('completeAROnboarding persists to AsyncStorage', async () => {
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAROnboarding());
    await act(async () => {});

    await act(async () => {
      await result.current.completeAROnboarding();
    });

    expect(mockSetItem).toHaveBeenCalledWith('@carolina_futons_ar_onboarding_complete', 'true');
    expect(result.current.hasSeenAROnboarding).toBe(true);
  });

  it('currentStep starts at 0 and advances', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useAROnboarding());
    await act(async () => {});

    expect(result.current.currentStep).toBe(0);
    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe(1);
    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe(2);
  });

  it('totalSteps returns the number of tutorial steps', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useAROnboarding());
    await act(async () => {});
    expect(result.current.totalSteps).toBeGreaterThanOrEqual(3);
  });

  it('prevStep goes back but not below 0', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useAROnboarding());
    await act(async () => {});

    act(() => result.current.prevStep());
    expect(result.current.currentStep).toBe(0);

    act(() => result.current.nextStep());
    act(() => result.current.prevStep());
    expect(result.current.currentStep).toBe(0);
  });

  it('handles AsyncStorage errors gracefully', async () => {
    mockGetItem.mockRejectedValue(new Error('Read error'));
    const { result } = renderHook(() => useAROnboarding());
    await act(async () => {});
    expect(result.current.hasSeenAROnboarding).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});

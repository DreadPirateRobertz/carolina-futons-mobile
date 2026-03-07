import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationStorage } from '../useNotificationStorage';
import type { NotificationPreferences } from '@/services/notifications';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe('useNotificationStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it('returns default preferences when nothing stored', async () => {
    const { result } = renderHook(() => useNotificationStorage());
    await act(async () => {});
    expect(result.current.preferences.orderUpdates).toBe(true);
    expect(result.current.preferences.promotions).toBe(true);
    expect(result.current.preferences.backInStock).toBe(true);
    expect(result.current.preferences.cartReminders).toBe(false);
  });

  it('loads saved preferences from AsyncStorage', async () => {
    const saved: NotificationPreferences = {
      orderUpdates: false,
      promotions: true,
      backInStock: false,
      cartReminders: true,
    };
    mockGetItem.mockResolvedValue(JSON.stringify(saved));

    const { result } = renderHook(() => useNotificationStorage());
    await act(async () => {});
    expect(result.current.preferences.orderUpdates).toBe(false);
    expect(result.current.preferences.cartReminders).toBe(true);
  });

  it('persists preferences on save', async () => {
    const { result } = renderHook(() => useNotificationStorage());
    await act(async () => {});

    const newPrefs: NotificationPreferences = {
      orderUpdates: false,
      promotions: false,
      backInStock: true,
      cartReminders: true,
    };
    await act(async () => {
      await result.current.savePreferences(newPrefs);
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      '@cfutons/notification_prefs',
      JSON.stringify(newPrefs),
    );
  });

  it('updates state after save', async () => {
    const { result } = renderHook(() => useNotificationStorage());
    await act(async () => {});

    await act(async () => {
      await result.current.savePreferences({
        orderUpdates: false,
        promotions: true,
        backInStock: true,
        cartReminders: true,
      });
    });

    expect(result.current.preferences.orderUpdates).toBe(false);
    expect(result.current.preferences.cartReminders).toBe(true);
  });

  it('handles corrupted storage gracefully', async () => {
    mockGetItem.mockResolvedValue('not-valid-json');

    const { result } = renderHook(() => useNotificationStorage());
    await act(async () => {});
    // Falls back to defaults
    expect(result.current.preferences.orderUpdates).toBe(true);
    expect(result.current.preferences.cartReminders).toBe(false);
  });

  it('reports loading state', async () => {
    const { result } = renderHook(() => useNotificationStorage());
    expect(result.current.isLoading).toBe(true);
    await act(async () => {});
    expect(result.current.isLoading).toBe(false);
  });
});

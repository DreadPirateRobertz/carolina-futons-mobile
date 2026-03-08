import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBackInStockSubscription } from '../useBackInStockSubscription';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe('useBackInStockSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
  });

  it('starts as not subscribed when no stored data', async () => {
    const { result } = renderHook(() => useBackInStockSubscription('prod-test'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isSubscribed).toBe(false);
  });

  it('subscribes to a product and persists to storage', async () => {
    const { result } = renderHook(() => useBackInStockSubscription('prod-test'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // When subscribe reads storage, return empty array
    mockGetItem.mockResolvedValue('[]');

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.isSubscribed).toBe(true);
    expect(mockSetItem).toHaveBeenCalledWith(
      '@back_in_stock_subscriptions',
      expect.stringContaining('prod-test'),
    );
  });

  it('unsubscribes from a product', async () => {
    // Start subscribed
    mockGetItem.mockResolvedValue(
      JSON.stringify([{ productId: 'prod-test', subscribedAt: '2026-01-01T00:00:00.000Z' }]),
    );

    const { result } = renderHook(() => useBackInStockSubscription('prod-test'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isSubscribed).toBe(true);

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(result.current.isSubscribed).toBe(false);
    expect(mockSetItem).toHaveBeenCalledWith('@back_in_stock_subscriptions', '[]');
  });

  it('toggles subscription on then off', async () => {
    const { result } = renderHook(() => useBackInStockSubscription('prod-test'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetItem.mockResolvedValue('[]');

    // Toggle on
    await act(async () => {
      await result.current.toggle();
    });
    expect(result.current.isSubscribed).toBe(true);

    // For toggle off, return current subscriptions
    mockGetItem.mockResolvedValue(
      JSON.stringify([{ productId: 'prod-test', subscribedAt: '2026-01-01T00:00:00.000Z' }]),
    );

    // Toggle off
    await act(async () => {
      await result.current.toggle();
    });
    expect(result.current.isSubscribed).toBe(false);
  });

  it('loads existing subscription on mount', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify([{ productId: 'prod-test', subscribedAt: '2026-01-01T00:00:00.000Z' }]),
    );

    const { result } = renderHook(() => useBackInStockSubscription('prod-test'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isSubscribed).toBe(true);
  });

  it('does not duplicate subscriptions on double subscribe', async () => {
    mockGetItem.mockResolvedValue('[]');

    const { result } = renderHook(() => useBackInStockSubscription('prod-test'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.subscribe();
    });

    // Second subscribe: storage now has one entry
    mockGetItem.mockResolvedValue(
      JSON.stringify([{ productId: 'prod-test', subscribedAt: '2026-01-01T00:00:00.000Z' }]),
    );

    await act(async () => {
      await result.current.subscribe();
    });

    // setItem should only be called once (second subscribe finds existing entry)
    expect(mockSetItem).toHaveBeenCalledTimes(1);
  });
});

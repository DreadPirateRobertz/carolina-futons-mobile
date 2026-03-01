import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { ConnectivityProvider } from '../useConnectivity';
import { useOfflineSync, type SyncHandler } from '../useOfflineSync';
import { _resetForTesting } from '@/services/offlineQueue';
import { useConnectivity } from '../useConnectivity';

beforeEach(() => {
  _resetForTesting();
});

function SyncHarness({ onSync }: { onSync?: SyncHandler }) {
  const { pendingCount, isSyncing, queueAction, syncNow } = useOfflineSync({ onSync });
  const { isOnline, setOnline } = useConnectivity();

  return (
    <View>
      <Text testID="pending">{pendingCount}</Text>
      <Text testID="syncing">{String(isSyncing)}</Text>
      <Text testID="online">{String(isOnline)}</Text>
      <TouchableOpacity
        testID="queue-cart-action"
        onPress={() => queueAction('cart', 'ADD_ITEM', { itemId: 'test-1' })}
      />
      <TouchableOpacity
        testID="queue-wishlist-action"
        onPress={() => queueAction('wishlist', 'ADD', { productId: 'p-1' })}
      />
      <TouchableOpacity testID="sync-now" onPress={() => syncNow()} />
      <TouchableOpacity testID="go-offline" onPress={() => setOnline(false)} />
      <TouchableOpacity testID="go-online" onPress={() => setOnline(true)} />
    </View>
  );
}

function renderSync(initialOnline = true, onSync?: SyncHandler) {
  return render(
    <ConnectivityProvider initialOnline={initialOnline}>
      <SyncHarness onSync={onSync} />
    </ConnectivityProvider>,
  );
}

describe('useOfflineSync', () => {
  it('starts with zero pending count', async () => {
    const { getByTestId } = renderSync();
    await waitFor(() => {
      expect(getByTestId('pending').props.children).toBe(0);
    });
  });

  it('increments pending count when queueing actions', async () => {
    const { getByTestId } = renderSync();
    await act(async () => {
      fireEvent.press(getByTestId('queue-cart-action'));
    });
    expect(getByTestId('pending').props.children).toBe(1);

    await act(async () => {
      fireEvent.press(getByTestId('queue-wishlist-action'));
    });
    expect(getByTestId('pending').props.children).toBe(2);
  });

  it('drains queue on manual syncNow', async () => {
    const onSync = jest.fn();
    const { getByTestId } = renderSync(true, onSync);

    await act(async () => {
      fireEvent.press(getByTestId('queue-cart-action'));
      fireEvent.press(getByTestId('queue-cart-action'));
    });
    expect(getByTestId('pending').props.children).toBe(2);

    await act(async () => {
      fireEvent.press(getByTestId('sync-now'));
    });

    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ domain: 'cart', action: 'ADD_ITEM' })]),
    );
    expect(getByTestId('pending').props.children).toBe(0);
  });

  it('auto-syncs when transitioning from offline to online', async () => {
    const onSync = jest.fn();
    const { getByTestId } = renderSync(false, onSync);

    // Queue actions while offline
    await act(async () => {
      fireEvent.press(getByTestId('queue-cart-action'));
      fireEvent.press(getByTestId('queue-wishlist-action'));
    });
    expect(getByTestId('pending').props.children).toBe(2);

    // Go online → should trigger sync
    await act(async () => {
      fireEvent.press(getByTestId('go-online'));
    });

    await waitFor(() => {
      expect(onSync).toHaveBeenCalledTimes(1);
      expect(getByTestId('pending').props.children).toBe(0);
    });
  });

  it('does not sync when already online and staying online', async () => {
    const onSync = jest.fn();
    renderSync(true, onSync);
    // No transition, no sync
    expect(onSync).not.toHaveBeenCalled();
  });

  it('does not sync on offline→offline', async () => {
    const onSync = jest.fn();
    const { getByTestId } = renderSync(false, onSync);
    await act(async () => {
      fireEvent.press(getByTestId('queue-cart-action'));
    });
    // Stay offline — no sync
    expect(onSync).not.toHaveBeenCalled();
  });

  it('does not call onSync when queue is empty on reconnect', async () => {
    const onSync = jest.fn();
    const { getByTestId } = renderSync(false, onSync);

    // Go online with empty queue
    await act(async () => {
      fireEvent.press(getByTestId('go-online'));
    });

    expect(onSync).not.toHaveBeenCalled();
  });
});

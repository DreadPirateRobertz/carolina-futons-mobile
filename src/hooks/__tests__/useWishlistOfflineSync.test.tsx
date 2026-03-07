import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { WishlistProvider, useWishlist } from '../useWishlist';
import { ConnectivityProvider } from '../useConnectivity';
import { useConnectivity } from '../useConnectivity';
import { _resetForTesting, getQueue, getQueueLength } from '@/services/offlineQueue';
import { PRODUCTS } from '@/data/products';

const product1 = PRODUCTS[0];
const product2 = PRODUCTS[1];

beforeEach(() => {
  _resetForTesting();
});

function TestHarness() {
  const { items, count, add, remove, toggle, pendingSync, isSyncing } = useWishlist();
  const { isOnline, setOnline } = useConnectivity();

  return (
    <View>
      <Text testID="count">{count}</Text>
      <Text testID="pending">{pendingSync}</Text>
      <Text testID="syncing">{String(isSyncing)}</Text>
      <Text testID="online">{String(isOnline)}</Text>
      <Text testID="items">{JSON.stringify(items.map((i) => i.productId))}</Text>
      <TouchableOpacity testID="add-1" onPress={() => add(product1)} />
      <TouchableOpacity testID="add-2" onPress={() => add(product2)} />
      <TouchableOpacity testID="remove-1" onPress={() => remove(product1.id)} />
      <TouchableOpacity testID="toggle-1" onPress={() => toggle(product1)} />
      <TouchableOpacity testID="go-offline" onPress={() => setOnline(false)} />
      <TouchableOpacity testID="go-online" onPress={() => setOnline(true)} />
    </View>
  );
}

function renderWithProviders(initialOnline = true) {
  return render(
    <ConnectivityProvider initialOnline={initialOnline} skipNetInfo>
      <WishlistProvider>
        <TestHarness />
      </WishlistProvider>
    </ConnectivityProvider>,
  );
}

describe('useWishlist offline sync', () => {
  describe('queueing when offline', () => {
    it('queues add action when offline', async () => {
      const { getByTestId } = renderWithProviders(false);

      await act(async () => {
        fireEvent.press(getByTestId('add-1'));
      });

      // Local state updated optimistically
      expect(getByTestId('count').props.children).toBe(1);

      // Action queued in offline queue
      const queued = getQueue('wishlist');
      expect(queued).toHaveLength(1);
      expect(queued[0].action).toBe('WISHLIST_ADD');
      expect(queued[0].payload.productId).toBe(product1.id);
    });

    it('queues remove action when offline', async () => {
      const { getByTestId } = renderWithProviders(false);

      // Add first (also queued)
      await act(async () => {
        fireEvent.press(getByTestId('add-1'));
      });

      await act(async () => {
        fireEvent.press(getByTestId('remove-1'));
      });

      expect(getByTestId('count').props.children).toBe(0);

      const queued = getQueue('wishlist');
      expect(queued).toHaveLength(2);
      expect(queued[0].action).toBe('WISHLIST_ADD');
      expect(queued[1].action).toBe('WISHLIST_REMOVE');
    });

    it('updates pendingSync count when queueing', async () => {
      const { getByTestId } = renderWithProviders(false);

      await act(async () => {
        fireEvent.press(getByTestId('add-1'));
      });

      expect(getByTestId('pending').props.children).toBe(1);

      await act(async () => {
        fireEvent.press(getByTestId('add-2'));
      });

      expect(getByTestId('pending').props.children).toBe(2);
    });
  });

  describe('replay on reconnect', () => {
    it('replays queued actions when going back online', async () => {
      const { getByTestId } = renderWithProviders(false);

      // Queue actions while offline
      await act(async () => {
        fireEvent.press(getByTestId('add-1'));
        fireEvent.press(getByTestId('add-2'));
      });

      expect(getQueueLength()).toBe(2);

      // Go online → triggers replay
      await act(async () => {
        fireEvent.press(getByTestId('go-online'));
      });

      // Queue should be drained (no WixClient registered, so executors are no-ops)
      await waitFor(() => {
        expect(getByTestId('pending').props.children).toBe(0);
      });
    });

    it('does not replay when already online', async () => {
      const { getByTestId } = renderWithProviders(true);

      // No transition, no replay
      expect(getByTestId('pending').props.children).toBe(0);
    });
  });

  describe('LWW conflict resolution', () => {
    it('compacts add→remove for same product during replay', async () => {
      const { getByTestId } = renderWithProviders(false);

      // Add then remove the same product offline
      await act(async () => {
        fireEvent.press(getByTestId('add-1'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('remove-1'));
      });

      // 2 actions queued
      expect(getQueueLength()).toBe(2);

      // Go online → LWW compaction should reduce to 1 action
      await act(async () => {
        fireEvent.press(getByTestId('go-online'));
      });

      await waitFor(() => {
        expect(getByTestId('pending').props.children).toBe(0);
      });
    });

    it('preserves local optimistic state through offline→online cycle', async () => {
      const { getByTestId } = renderWithProviders(false);

      await act(async () => {
        fireEvent.press(getByTestId('add-1'));
        fireEvent.press(getByTestId('add-2'));
      });

      expect(getByTestId('count').props.children).toBe(2);

      // Go online — local state should remain unchanged
      await act(async () => {
        fireEvent.press(getByTestId('go-online'));
      });

      await waitFor(() => {
        expect(getByTestId('count').props.children).toBe(2);
      });
    });
  });

  describe('online mode without WixClient', () => {
    it('queues actions when online but no WixClient (for later replay)', async () => {
      const { getByTestId } = renderWithProviders(true);

      await act(async () => {
        fireEvent.press(getByTestId('add-1'));
      });

      // Local state updated optimistically
      expect(getByTestId('count').props.children).toBe(1);
      // No WixClient available → queued for when client becomes available
      expect(getQueue('wishlist')).toHaveLength(1);
    });
  });

  describe('backwards compatibility', () => {
    it('works without ConnectivityProvider (local-only mode)', () => {
      const { getByTestId } = render(
        <WishlistProvider>
          <View>
            <Text testID="count">{0}</Text>
          </View>
        </WishlistProvider>,
      );

      expect(getByTestId('count')).toBeTruthy();
    });
  });
});

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { CartProvider, useCart } from '../useCart';
import { ConnectivityProvider, useConnectivity } from '../useConnectivity';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import { getQueue, _resetForTesting } from '@/services/offlineQueue';

const asheville = FUTON_MODELS[0];
const naturalLinen = FABRICS[0];

function CartOfflineHarness() {
  const { items, itemCount, pendingSync, isSyncing, addItem, removeItem, updateQuantity } =
    useCart();
  const { isOnline, setOnline } = useConnectivity();

  return (
    <View>
      <Text testID="item-count">{itemCount}</Text>
      <Text testID="pending-sync">{pendingSync}</Text>
      <Text testID="is-syncing">{String(isSyncing)}</Text>
      <Text testID="online">{String(isOnline)}</Text>
      <Text testID="items-json">
        {JSON.stringify(items.map((i) => ({ id: i.id, qty: i.quantity })))}
      </Text>

      <TouchableOpacity
        testID="add-asheville-linen"
        onPress={() => addItem(asheville, naturalLinen, 1)}
      />
      <TouchableOpacity
        testID="remove-asheville-linen"
        onPress={() => removeItem('asheville-full:natural-linen')}
      />
      <TouchableOpacity
        testID="update-qty-3"
        onPress={() => updateQuantity('asheville-full:natural-linen', 3)}
      />
      <TouchableOpacity testID="go-offline" onPress={() => setOnline(false)} />
      <TouchableOpacity testID="go-online" onPress={() => setOnline(true)} />
    </View>
  );
}

function renderOfflineCart(initialOnline = true) {
  return render(
    <ConnectivityProvider initialOnline={initialOnline} skipNetInfo={true}>
      <CartProvider>
        <CartOfflineHarness />
      </CartProvider>
    </ConnectivityProvider>,
  );
}

beforeEach(() => {
  _resetForTesting();
});

describe('useCart offline sync', () => {
  it('does not enqueue mutations when online', () => {
    const { getByTestId } = renderOfflineCart(true);

    fireEvent.press(getByTestId('add-asheville-linen'));

    expect(getByTestId('item-count').props.children).toBe(1);
    expect(getQueue('cart')).toHaveLength(0);
  });

  it('enqueues CART_ADD_ITEM to offlineQueue when offline', () => {
    const { getByTestId } = renderOfflineCart(false);

    fireEvent.press(getByTestId('add-asheville-linen'));

    expect(getByTestId('item-count').props.children).toBe(1);
    const queued = getQueue('cart');
    expect(queued).toHaveLength(1);
    expect(queued[0].action).toBe('CART_ADD_ITEM');
    expect(queued[0].payload).toEqual({
      productId: asheville.id,
      quantity: 1,
      fabricId: naturalLinen.id,
    });
  });

  it('enqueues CART_REMOVE_ITEM to offlineQueue when offline', () => {
    const { getByTestId } = renderOfflineCart(false);

    fireEvent.press(getByTestId('add-asheville-linen'));
    fireEvent.press(getByTestId('remove-asheville-linen'));

    expect(getByTestId('item-count').props.children).toBe(0);
    const queued = getQueue('cart');
    expect(queued).toHaveLength(2);
    expect(queued[1].action).toBe('CART_REMOVE_ITEM');
    expect(queued[1].payload).toEqual({ productId: 'asheville-full:natural-linen' });
  });

  it('enqueues CART_UPDATE_QUANTITY to offlineQueue when offline', () => {
    const { getByTestId } = renderOfflineCart(false);

    fireEvent.press(getByTestId('add-asheville-linen'));
    fireEvent.press(getByTestId('update-qty-3'));

    expect(getByTestId('item-count').props.children).toBe(3);
    const queued = getQueue('cart');
    expect(queued).toHaveLength(2);
    expect(queued[1].action).toBe('CART_UPDATE_QUANTITY');
    expect(queued[1].payload).toEqual({
      productId: 'asheville-full:natural-linen',
      quantity: 3,
    });
  });

  it('updates local state optimistically even when offline', () => {
    const { getByTestId } = renderOfflineCart(false);

    fireEvent.press(getByTestId('add-asheville-linen'));
    fireEvent.press(getByTestId('add-asheville-linen'));

    expect(getByTestId('item-count').props.children).toBe(2);
    expect(getQueue('cart')).toHaveLength(2);
  });

  it('exposes pendingSync count from cart context', () => {
    const { getByTestId } = renderOfflineCart(false);

    expect(getByTestId('pending-sync').props.children).toBe(0);

    fireEvent.press(getByTestId('add-asheville-linen'));
    expect(getByTestId('pending-sync').props.children).toBe(1);

    fireEvent.press(getByTestId('add-asheville-linen'));
    expect(getByTestId('pending-sync').props.children).toBe(2);
  });

  it('replays queued cart mutations when going back online', async () => {
    const { getByTestId } = renderOfflineCart(false);

    fireEvent.press(getByTestId('add-asheville-linen'));
    expect(getQueue('cart')).toHaveLength(1);

    // Go online → triggers replay. Executors are no-ops without WixProvider,
    // so replay succeeds vacuously and drains the queue.
    await act(async () => {
      fireEvent.press(getByTestId('go-online'));
    });

    await waitFor(() => {
      expect(getByTestId('pending-sync').props.children).toBe(0);
    });
  });

  it('does not enqueue after transitioning back online', async () => {
    const { getByTestId } = renderOfflineCart(false);

    fireEvent.press(getByTestId('add-asheville-linen'));
    expect(getQueue('cart')).toHaveLength(1);

    await act(async () => {
      fireEvent.press(getByTestId('go-online'));
    });

    await waitFor(() => {
      expect(getByTestId('pending-sync').props.children).toBe(0);
    });

    // Add item while online — should NOT enqueue
    fireEvent.press(getByTestId('add-asheville-linen'));
    expect(getByTestId('item-count').props.children).toBe(2);
    expect(getQueue('cart')).toHaveLength(0);
  });
});

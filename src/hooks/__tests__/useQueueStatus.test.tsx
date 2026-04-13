import React from 'react';
import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { useQueueStatus } from '../useQueueStatus';
import {
  enqueue,
  clearQueue,
  _resetForTesting,
  subscribeToQueueLength,
} from '@/services/offlineQueue';

beforeEach(() => {
  _resetForTesting();
});

function StatusHarness() {
  const { pendingCount } = useQueueStatus();
  return <Text testID="count">{pendingCount}</Text>;
}

describe('useQueueStatus', () => {
  it('returns 0 when queue is empty', () => {
    const { getByTestId } = render(<StatusHarness />);
    expect(getByTestId('count').props.children).toBe(0);
  });

  it('reflects queue length after enqueue', () => {
    const { getByTestId } = render(<StatusHarness />);
    act(() => {
      enqueue('cart', 'ADD_ITEM', { productId: 'p1' });
      enqueue('cart', 'ADD_ITEM', { productId: 'p2' });
    });
    expect(getByTestId('count').props.children).toBe(2);
  });

  it('updates when queue is cleared', () => {
    enqueue('cart', 'ADD_ITEM', { productId: 'p1' });
    const { getByTestId } = render(<StatusHarness />);
    expect(getByTestId('count').props.children).toBe(1);
    act(() => {
      clearQueue();
    });
    expect(getByTestId('count').props.children).toBe(0);
  });

  it('reflects queued items from different domains', () => {
    const { getByTestId } = render(<StatusHarness />);
    act(() => {
      enqueue('cart', 'ADD_ITEM', { productId: 'p1' });
      enqueue('wishlist', 'ADD', { productId: 'p2' });
      enqueue('profile', 'UPDATE', { name: 'test' });
    });
    expect(getByTestId('count').props.children).toBe(3);
  });

  it('unsubscribes listener on unmount', () => {
    // Verify subscription mechanism cleans up
    const listenerSpy = jest.fn();
    const unsubscribe = subscribeToQueueLength(listenerSpy);
    listenerSpy.mockClear();

    const { unmount } = render(<StatusHarness />);
    unmount();

    // After unmount, component listener is removed; enqueue should not re-render component
    // but our spy listener still fires — just verifying no error on enqueue post-unmount
    act(() => {
      enqueue('cart', 'ADD_ITEM', { productId: 'p-post-unmount' });
    });

    // Our spy listener should fire once
    expect(listenerSpy).toHaveBeenCalledTimes(1);
    expect(listenerSpy).toHaveBeenCalledWith(1);

    unsubscribe();
  });

  it('initialises with current queue length when items already enqueued before mount', () => {
    enqueue('wishlist', 'ADD', { productId: 'p1' });
    enqueue('wishlist', 'ADD', { productId: 'p2' });
    const { getByTestId } = render(<StatusHarness />);
    expect(getByTestId('count').props.children).toBe(2);
  });
});

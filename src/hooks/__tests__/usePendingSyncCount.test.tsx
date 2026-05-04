/**
 * @module usePendingSyncCount tests
 * TDD spec — written before implementation.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { usePendingSyncCount } from '../usePendingSyncCount';
import { enqueue, clearQueue, _resetForTesting } from '@/services/offlineQueue';

beforeEach(() => {
  _resetForTesting();
});

function CountHarness() {
  const count = usePendingSyncCount();
  return <Text testID="count">{count}</Text>;
}

describe('usePendingSyncCount', () => {
  it('returns 0 when queue is empty', () => {
    const { getByTestId } = render(<CountHarness />);
    expect(getByTestId('count').props.children).toBe(0);
  });

  it('returns current queue length after enqueue', () => {
    const { getByTestId } = render(<CountHarness />);
    act(() => {
      enqueue('cart', 'ADD_ITEM', { productId: 'p1' });
      enqueue('wishlist', 'ADD', { productId: 'p2' });
    });
    expect(getByTestId('count').props.children).toBe(2);
  });

  it('updates reactively when queue is cleared', () => {
    act(() => {
      enqueue('cart', 'ADD_ITEM', { productId: 'p1' });
    });
    const { getByTestId } = render(<CountHarness />);
    expect(getByTestId('count').props.children).toBe(1);

    act(() => {
      clearQueue();
    });
    expect(getByTestId('count').props.children).toBe(0);
  });

  it('returns a number, not an object', () => {
    const { getByTestId } = render(<CountHarness />);
    const value = getByTestId('count').props.children;
    expect(typeof value).toBe('number');
  });
});

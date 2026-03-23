/**
 * useGamificationOfflineSync TDD tests — hq-94ado
 *
 * Tests written BEFORE implementation per CLAUDE.md mandate.
 * Hook: auto-flush on reconnect + emitOrQueue for call sites.
 */

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { ConnectivityProvider, useConnectivity } from '../useConnectivity';
import { useGamificationOfflineSync } from '../useGamificationOfflineSync';
import { _resetForTesting, getQueue } from '@/services/offlineQueue';
import { trackEvent } from '@/services/analytics';

// ── Mock analytics ────────────────────────────────────────────────────────────
jest.mock('@/services/analytics', () => ({
  trackEvent: jest.fn(),
  getEventBuffer: jest.fn(() => []),
  clearEventBuffer: jest.fn(),
}));

// ── Mock wixClientSingleton ───────────────────────────────────────────────────
const mockCallFunction = jest.fn().mockResolvedValue({ ok: true });
jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => ({
    callFunction: mockCallFunction,
  }),
}));

// ── Test harness ──────────────────────────────────────────────────────────────
function Harness() {
  const { emitOrQueue, pendingCount, isSyncing } = useGamificationOfflineSync();
  const { isOnline, setOnline } = useConnectivity();

  return (
    <View>
      <Text testID="pending">{pendingCount}</Text>
      <Text testID="syncing">{String(isSyncing)}</Text>
      <Text testID="online">{String(isOnline)}</Text>
      <TouchableOpacity
        testID="emit-add-to-cart"
        onPress={() => emitOrQueue('gamification_add_to_cart', { product_id: 'p1', price: 99 })}
      />
      <TouchableOpacity
        testID="emit-ar-used"
        onPress={() => emitOrQueue('gamification_ar_used', { product_id: 'p2' })}
      />
      <TouchableOpacity testID="go-offline" onPress={() => setOnline(false)} />
      <TouchableOpacity testID="go-online" onPress={() => setOnline(true)} />
    </View>
  );
}

function renderHarness(initialOnline = true) {
  return render(
    <ConnectivityProvider initialOnline={initialOnline} skipNetInfo>
      <Harness />
    </ConnectivityProvider>,
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  _resetForTesting();
  jest.clearAllMocks();
});

// ── emitOrQueue ───────────────────────────────────────────────────────────────
describe('emitOrQueue', () => {
  it('calls trackEvent when online', async () => {
    const { getByTestId } = renderHarness(true);

    await act(async () => {
      fireEvent.press(getByTestId('emit-add-to-cart'));
    });

    expect(trackEvent).toHaveBeenCalledWith(
      'gamification_add_to_cart',
      expect.objectContaining({ product_id: 'p1', price: 99 }),
    );
  });

  it('does not queue event when online', async () => {
    const { getByTestId } = renderHarness(true);

    await act(async () => {
      fireEvent.press(getByTestId('emit-add-to-cart'));
    });

    expect(getQueue('gamification')).toHaveLength(0);
  });

  it('queues event when offline instead of calling trackEvent', async () => {
    const { getByTestId } = renderHarness(false);

    await act(async () => {
      fireEvent.press(getByTestId('emit-add-to-cart'));
    });

    expect(trackEvent).not.toHaveBeenCalled();
    expect(getQueue('gamification')).toHaveLength(1);
    expect(getQueue('gamification')[0].action).toBe('gamification_add_to_cart');
  });

  it('pendingCount reflects number of queued events', async () => {
    const { getByTestId } = renderHarness(false);

    expect(getByTestId('pending').props.children).toBe(0);

    await act(async () => {
      fireEvent.press(getByTestId('emit-add-to-cart'));
    });
    expect(getByTestId('pending').props.children).toBe(1);

    await act(async () => {
      fireEvent.press(getByTestId('emit-ar-used'));
    });
    expect(getByTestId('pending').props.children).toBe(2);
  });
});

// ── auto-flush on reconnect ───────────────────────────────────────────────────
describe('auto-flush on reconnect', () => {
  it('flushes queued events when transitioning from offline to online', async () => {
    const { getByTestId } = renderHarness(false);

    // Queue two events while offline
    await act(async () => {
      fireEvent.press(getByTestId('emit-add-to-cart'));
      fireEvent.press(getByTestId('emit-ar-used'));
    });

    expect(getQueue('gamification')).toHaveLength(2);

    // Come back online
    await act(async () => {
      fireEvent.press(getByTestId('go-online'));
    });

    await waitFor(() => {
      expect(mockCallFunction).toHaveBeenCalledTimes(2);
    });

    expect(getQueue('gamification')).toHaveLength(0);
    expect(getByTestId('pending').props.children).toBe(0);
  });

  it('does not flush when already online and going online again', async () => {
    const { getByTestId } = renderHarness(true);

    // Nothing queued; re-trigger "go online" — should not call endpoint
    await act(async () => {
      fireEvent.press(getByTestId('go-online'));
    });

    expect(mockCallFunction).not.toHaveBeenCalled();
  });

  it('sets isSyncing=true during flush and false when done', async () => {
    let resolveFn!: () => void;
    mockCallFunction.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFn = resolve;
        }),
    );

    const { getByTestId } = renderHarness(false);

    await act(async () => {
      fireEvent.press(getByTestId('emit-add-to-cart'));
    });

    // Go online — flush starts
    act(() => {
      fireEvent.press(getByTestId('go-online'));
    });

    // Give the hook a tick to start syncing
    await act(async () => {});
    expect(getByTestId('syncing').props.children).toBe('true');

    // Resolve the pending call
    await act(async () => {
      resolveFn();
    });

    await waitFor(() => {
      expect(getByTestId('syncing').props.children).toBe('false');
    });
  });

  it('clears queue even if some events fail during flush', async () => {
    mockCallFunction
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error('server error'));

    const { getByTestId } = renderHarness(false);

    await act(async () => {
      fireEvent.press(getByTestId('emit-add-to-cart'));
      fireEvent.press(getByTestId('emit-ar-used'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('go-online'));
    });

    await waitFor(() => {
      expect(mockCallFunction).toHaveBeenCalledTimes(2);
    });

    // Failed event stays in queue
    expect(getQueue('gamification')).toHaveLength(1);
  });
});

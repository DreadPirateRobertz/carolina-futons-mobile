/**
 * TDD spec for useOrderStatusPush — auto-refreshes order data when an
 * incoming push notification reports a status change for the viewed order.
 *
 * Bead: cfutons_mobile-xh4
 */
import { renderHook, act } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { useOrderStatusPush } from '../useOrderStatusPush';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));

const mockAddListener = jest.mocked(
  require('expo-notifications').addNotificationReceivedListener,
);

function makeNotification(data: Record<string, unknown>) {
  return {
    request: {
      content: { data },
    },
  } as Notifications.Notification;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getListenerCallback() {
  return mockAddListener.mock.calls[0][0] as (n: Notifications.Notification) => void;
}

beforeEach(() => {
  mockAddListener.mockClear();
  // Restore default return value after mockClear
  mockAddListener.mockReturnValue({ remove: jest.fn() });
});

// ── Registration ──────────────────────────────────────────────────────────────

it('registers a notification received listener on mount', () => {
  const onRefresh = jest.fn();
  renderHook(() => useOrderStatusPush({ orderId: 'ord-001', onRefresh }));
  expect(mockAddListener).toHaveBeenCalledTimes(1);
});

it('removes listener on unmount', () => {
  const removeMock = jest.fn();
  mockAddListener.mockReturnValue({ remove: removeMock });
  const onRefresh = jest.fn();

  const { unmount } = renderHook(() => useOrderStatusPush({ orderId: 'ord-001', onRefresh }));
  unmount();

  expect(removeMock).toHaveBeenCalled();
});

// ── Order status types that trigger refresh ───────────────────────────────────

describe('triggers onRefresh for order status notification types', () => {
  it.each([
    'order_confirmed',
    'order_shipped',
    'order_delivered',
    'order_update',
    'order_refunded',
  ] as const)('triggers onRefresh when type=%s matches orderId', (type) => {
    const onRefresh = jest.fn();
    renderHook(() => useOrderStatusPush({ orderId: 'ord-001', onRefresh }));

    const callback = getListenerCallback();
    act(() => {
      callback(makeNotification({ type, orderId: 'ord-001' }));
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

// ── orderId matching ──────────────────────────────────────────────────────────

it('does NOT trigger onRefresh when orderId does not match', () => {
  const onRefresh = jest.fn();
  renderHook(() => useOrderStatusPush({ orderId: 'ord-001', onRefresh }));

  const callback = getListenerCallback();
  act(() => {
    callback(makeNotification({ type: 'order_shipped', orderId: 'ord-DIFFERENT' }));
  });

  expect(onRefresh).not.toHaveBeenCalled();
});

it('triggers onRefresh when orderId is omitted from notification (broadcasts to any order view)', () => {
  const onRefresh = jest.fn();
  renderHook(() => useOrderStatusPush({ orderId: 'ord-001', onRefresh }));

  const callback = getListenerCallback();
  act(() => {
    callback(makeNotification({ type: 'order_shipped' }));
  });

  expect(onRefresh).toHaveBeenCalledTimes(1);
});

// ── Non-order notification types ──────────────────────────────────────────────

it('does NOT trigger onRefresh for non-order notification types', () => {
  const onRefresh = jest.fn();
  renderHook(() => useOrderStatusPush({ orderId: 'ord-001', onRefresh }));

  const callback = getListenerCallback();
  act(() => {
    callback(makeNotification({ type: 'promotion', productId: 'asheville' }));
  });
  act(() => {
    callback(makeNotification({ type: 'streak_milestone' }));
  });
  act(() => {
    callback(makeNotification({ type: 'price_drop', productSlug: 'asheville' }));
  });

  expect(onRefresh).not.toHaveBeenCalled();
});

it('does NOT trigger onRefresh for unknown/missing types', () => {
  const onRefresh = jest.fn();
  renderHook(() => useOrderStatusPush({ orderId: 'ord-001', onRefresh }));

  const callback = getListenerCallback();
  act(() => {
    callback(makeNotification({}));
  });
  act(() => {
    callback(makeNotification({ type: 'totally_unknown' }));
  });

  expect(onRefresh).not.toHaveBeenCalled();
});

// ── Notification with null/undefined data ─────────────────────────────────────

it('does NOT crash or call onRefresh when notification data is null', () => {
  const onRefresh = jest.fn();
  renderHook(() => useOrderStatusPush({ orderId: 'ord-001', onRefresh }));

  const callback = getListenerCallback();
  expect(() => {
    act(() => {
      callback({ request: { content: { data: null } } } as any);
    });
  }).not.toThrow();

  expect(onRefresh).not.toHaveBeenCalled();
});

it('does NOT crash or call onRefresh when notification data is undefined', () => {
  const onRefresh = jest.fn();
  renderHook(() => useOrderStatusPush({ orderId: 'ord-001', onRefresh }));

  const callback = getListenerCallback();
  expect(() => {
    act(() => {
      callback({ request: { content: {} } } as any);
    });
  }).not.toThrow();

  expect(onRefresh).not.toHaveBeenCalled();
});

// ── Re-render stability ───────────────────────────────────────────────────────

it('does not re-register listener when onRefresh reference changes (stable ref semantics)', () => {
  const onRefresh1 = jest.fn();
  const onRefresh2 = jest.fn();
  const { rerender } = renderHook(
    ({ onRefresh }) => useOrderStatusPush({ orderId: 'ord-001', onRefresh }),
    { initialProps: { onRefresh: onRefresh1 } },
  );

  rerender({ onRefresh: onRefresh2 });

  // Listener should only have been registered once
  expect(mockAddListener).toHaveBeenCalledTimes(1);
});

it('still calls the latest onRefresh after re-render (ref pattern)', () => {
  const onRefresh1 = jest.fn();
  const onRefresh2 = jest.fn();
  const { rerender } = renderHook(
    ({ onRefresh }) => useOrderStatusPush({ orderId: 'ord-001', onRefresh }),
    { initialProps: { onRefresh: onRefresh1 } },
  );

  rerender({ onRefresh: onRefresh2 });

  const callback = getListenerCallback();
  act(() => {
    callback(makeNotification({ type: 'order_shipped' }));
  });

  expect(onRefresh2).toHaveBeenCalledTimes(1);
  expect(onRefresh1).not.toHaveBeenCalled();
});

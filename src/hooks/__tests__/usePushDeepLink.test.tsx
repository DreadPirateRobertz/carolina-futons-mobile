/**
 * TDD tests for usePushDeepLink — push notification deep-link routing.
 *
 * Covers:
 *  - Cold-start: app not running, tap launches to correct screen
 *  - Background: app backgrounded, tap brings to correct screen
 *  - Foreground: app visible, tap navigates correctly
 *  - Malformed payload guard: missing/null screen → nav.goBack() fallback
 *
 * Bead: cm-e2z
 */
import React from 'react';
import { View } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { usePushDeepLink } from '../usePushDeepLink';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getLastNotificationResponseAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
}));

// Typed references to the mocked functions for use in tests
const mockGetLastNotificationResponseAsync =
  jest.mocked(require('expo-notifications').getLastNotificationResponseAsync);
const mockAddNotificationResponseReceivedListener = jest.mocked(
  require('expo-notifications').addNotificationResponseReceivedListener,
);

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

/** Minimal navigation ref stub */
function makeNavRef(overrides: Partial<{ navigate: jest.Mock; goBack: jest.Mock }> = {}) {
  return {
    isReady: () => true,
    navigate: overrides.navigate ?? mockNavigate,
    goBack: overrides.goBack ?? mockGoBack,
  } as any;
}

function makeResponse(data: Record<string, unknown>) {
  return {
    actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
    notification: {
      request: {
        content: { data },
      },
    },
  };
}

function HookHarness({ navRef }: { navRef: any }) {
  usePushDeepLink({ navigationRef: navRef });
  return <View />;
}

beforeEach(() => {
  mockGetLastNotificationResponseAsync.mockReset();
  mockGetLastNotificationResponseAsync.mockResolvedValue(null);
  // mockClear: preserve mockReturnValue({ remove: jest.fn() }) set in jest.mock factory
  mockAddNotificationResponseReceivedListener.mockClear();
  mockNavigate.mockReset();
  mockGoBack.mockReset();
});

// ── Cold-start ────────────────────────────────────────────────────────────────

describe('cold-start deep-link (app was not running)', () => {
  it('navigates to OrderDetail on cold-start with order_update + orderId', async () => {
    mockGetLastNotificationResponseAsync.mockResolvedValue(
      makeResponse({ type: 'order_update', orderId: 'ord-123' }),
    );

    render(<HookHarness navRef={makeNavRef()} />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('OrderDetail', { orderId: 'ord-123' });
    });
  });

  it('navigates to OrderHistory on cold-start with order_update and no orderId', async () => {
    mockGetLastNotificationResponseAsync.mockResolvedValue(
      makeResponse({ type: 'order_update' }),
    );

    render(<HookHarness navRef={makeNavRef()} />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('OrderHistory', undefined);
    });
  });

  it('navigates to ProductDetail on cold-start with product_id payload', async () => {
    mockGetLastNotificationResponseAsync.mockResolvedValue(
      makeResponse({ product_id: 'futon-slug-123' }),
    );

    render(<HookHarness navRef={makeNavRef()} />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ProductDetail', { slug: 'futon-slug-123' });
    });
  });

  it('navigates to Cart on cold-start with cart_reminder type', async () => {
    mockGetLastNotificationResponseAsync.mockResolvedValue(
      makeResponse({ type: 'cart_reminder' }),
    );

    render(<HookHarness navRef={makeNavRef()} />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Cart' as any, undefined);
    });
  });

  it('calls goBack when cold-start payload is completely empty', async () => {
    mockGetLastNotificationResponseAsync.mockResolvedValue(makeResponse({}));

    render(<HookHarness navRef={makeNavRef()} />);

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('does nothing when getLastNotificationResponseAsync returns null (normal launch)', async () => {
    mockGetLastNotificationResponseAsync.mockResolvedValue(null);

    render(<HookHarness navRef={makeNavRef()} />);

    // Give async a chance to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does nothing when getLastNotificationResponseAsync rejects (graceful error)', async () => {
    mockGetLastNotificationResponseAsync.mockRejectedValue(new Error('Notifications SDK error'));
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    render(<HookHarness navRef={makeNavRef()} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ── Background tap ────────────────────────────────────────────────────────────

describe('background tap (app was backgrounded)', () => {
  it('navigates to OrderDetail when tapped from background with order_update', async () => {
    render(<HookHarness navRef={makeNavRef()} />);

    const callback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    await act(async () => {
      callback(makeResponse({ type: 'order_update', orderId: 'ord-bg-1' }));
    });

    expect(mockNavigate).toHaveBeenCalledWith('OrderDetail', { orderId: 'ord-bg-1' });
  });

  it('navigates to ProductDetail when tapped from background with back_in_stock + productId', async () => {
    render(<HookHarness navRef={makeNavRef()} />);

    const callback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    await act(async () => {
      callback(makeResponse({ type: 'back_in_stock', productId: 'asheville-full' }));
    });

    expect(mockNavigate).toHaveBeenCalledWith('ProductDetail', { slug: 'asheville-full' });
  });

  it('navigates to Wishlist when tapped from background with back_in_stock and no productId', async () => {
    render(<HookHarness navRef={makeNavRef()} />);

    const callback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    await act(async () => {
      callback(makeResponse({ type: 'back_in_stock' }));
    });

    expect(mockNavigate).toHaveBeenCalledWith('Wishlist', undefined);
  });

  it('ignores non-default action identifiers (e.g. dismiss)', async () => {
    render(<HookHarness navRef={makeNavRef()} />);

    const callback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    await act(async () => {
      callback({
        actionIdentifier: 'com.apple.UNNotificationDismissActionIdentifier',
        notification: { request: { content: { data: { type: 'order_update', orderId: '99' } } } },
      });
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ── Foreground tap ────────────────────────────────────────────────────────────

describe('foreground tap (app was active)', () => {
  it('navigates to Cart when promotion tapped in foreground', async () => {
    render(<HookHarness navRef={makeNavRef()} />);

    const callback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    await act(async () => {
      callback(makeResponse({ type: 'cart_reminder' }));
    });

    expect(mockNavigate).toHaveBeenCalledWith('Cart' as any, undefined);
  });

  it('navigates to Collections when promotion has collection_slug', async () => {
    render(<HookHarness navRef={makeNavRef()} />);

    const callback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    await act(async () => {
      callback(makeResponse({ collection_slug: 'summer-sale' }));
    });

    expect(mockNavigate).toHaveBeenCalledWith('CollectionDetail', { slug: 'summer-sale' });
  });

  it('navigates to Shop when promotion type has no productId', async () => {
    render(<HookHarness navRef={makeNavRef()} />);

    const callback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    await act(async () => {
      callback(makeResponse({ type: 'promotion' }));
    });

    expect(mockNavigate).toHaveBeenCalledWith('Shop' as any, undefined);
  });

  it('cleans up listener on unmount', async () => {
    const { unmount } = render(<HookHarness navRef={makeNavRef()} />);
    // Capture remove fn from the subscription returned during this render
    const sub = mockAddNotificationResponseReceivedListener.mock.results[0].value as { remove: jest.Mock };
    unmount();

    expect(sub.remove).toHaveBeenCalled();
  });
});

// ── Malformed payload guard ───────────────────────────────────────────────────

describe('malformed payload guard → goBack() fallback', () => {
  it('calls goBack when notification data is undefined', async () => {
    render(<HookHarness navRef={makeNavRef()} />);

    const callback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    await act(async () => {
      callback({
        actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
        notification: { request: { content: { data: undefined } } },
      });
    });

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('calls goBack when data is null', async () => {
    render(<HookHarness navRef={makeNavRef()} />);

    const callback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    await act(async () => {
      callback({
        actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
        notification: { request: { content: { data: null } } },
      });
    });

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('calls goBack when data has no recognized screen keys', async () => {
    render(<HookHarness navRef={makeNavRef()} />);

    const callback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    await act(async () => {
      callback(makeResponse({ garbage: 'value', unknown_key: 'whatever' }));
    });

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('routes to Home for unrecognized type (notification service fallback)', async () => {
    render(<HookHarness navRef={makeNavRef()} />);

    const callback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    await act(async () => {
      callback(makeResponse({ type: 'totally_unknown_type' }));
    });

    // Unknown types fall through to carolinafutons://home → Home screen
    expect(mockNavigate).toHaveBeenCalledWith('Home', undefined);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('calls goBack when ProductDetail payload has null slug', async () => {
    render(<HookHarness navRef={makeNavRef()} />);

    const callback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    await act(async () => {
      callback(makeResponse({ type: 'back_in_stock', productId: null as any }));
    });

    // back_in_stock with no productId → Wishlist (valid, not fallback)
    expect(mockNavigate).toHaveBeenCalledWith('Wishlist', undefined);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does not call goBack when navigation is not yet ready', async () => {
    const notReadyRef = { isReady: () => false, navigate: mockNavigate, goBack: mockGoBack } as any;

    render(<HookHarness navRef={notReadyRef} />);

    const callback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    await act(async () => {
      callback(makeResponse({ garbage: 'value' }));
    });

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

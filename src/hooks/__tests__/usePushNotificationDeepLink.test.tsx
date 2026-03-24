/**
 * TDD tests for usePushNotificationDeepLink — gamification push routing.
 *
 * Covers:
 *  - Cold-start: app not running, tap launches to correct Loyalty tab
 *  - Background / foreground: tap while running routes correctly
 *  - Non-gamification types: ignored (not this hook's responsibility)
 *  - Malformed payload: goBack() fallback
 *  - Error handling: captureException called, no crash
 *  - Cleanup: listener removed on unmount
 *
 * Bead: cm-cf-m1c
 */
import React from 'react';
import { View } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { usePushNotificationDeepLink } from '../usePushNotificationDeepLink';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getLastNotificationResponseAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
}));

const mockGetLast = jest.mocked(require('expo-notifications').getLastNotificationResponseAsync);
const mockAddListener = jest.mocked(
  require('expo-notifications').addNotificationResponseReceivedListener,
);

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

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
    notification: { request: { content: { data } } },
  };
}

function HookHarness({ navRef }: { navRef: any }) {
  usePushNotificationDeepLink({ navigationRef: navRef });
  return <View />;
}

beforeEach(() => {
  mockGetLast.mockReset();
  mockGetLast.mockResolvedValue(null);
  mockAddListener.mockClear();
  mockNavigate.mockReset();
  mockGoBack.mockReset();
  jest.mocked(require('@/services/crashReporting').captureException).mockReset();
});

// ── Cold-start ────────────────────────────────────────────────────────────────

describe('cold-start (app was not running)', () => {
  it('navigates to Loyalty streak tab on streak_milestone', async () => {
    mockGetLast.mockResolvedValue(makeResponse({ type: 'streak_milestone' }));
    render(<HookHarness navRef={makeNavRef()} />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Loyalty', { initialTab: 'streak' });
    });
  });

  it('navigates to Loyalty quests tab on quest_complete', async () => {
    mockGetLast.mockResolvedValue(makeResponse({ type: 'quest_complete' }));
    render(<HookHarness navRef={makeNavRef()} />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Loyalty', { initialTab: 'quests' });
    });
  });

  it('navigates to Loyalty spin tab on spin_reminder', async () => {
    mockGetLast.mockResolvedValue(makeResponse({ type: 'spin_reminder' }));
    render(<HookHarness navRef={makeNavRef()} />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Loyalty', { initialTab: 'spin' });
    });
  });

  it('does nothing when last response is null (normal launch)', async () => {
    mockGetLast.mockResolvedValue(null);
    render(<HookHarness navRef={makeNavRef()} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does nothing for non-gamification types (not this hook)', async () => {
    mockGetLast.mockResolvedValue(makeResponse({ type: 'order_update', orderId: 'x' }));
    render(<HookHarness navRef={makeNavRef()} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('calls goBack when data is empty (no type)', async () => {
    mockGetLast.mockResolvedValue(makeResponse({}));
    render(<HookHarness navRef={makeNavRef()} />);
    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('calls goBack when data is null', async () => {
    mockGetLast.mockResolvedValue({
      actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
      notification: { request: { content: { data: null } } },
    });
    render(<HookHarness navRef={makeNavRef()} />);
    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('does nothing when component unmounts before cold-start promise resolves', async () => {
    let resolvePromise!: (v: any) => void;
    mockGetLast.mockReturnValue(
      new Promise((res) => {
        resolvePromise = res;
      }),
    );

    const { unmount } = render(<HookHarness navRef={makeNavRef()} />);
    unmount();
    resolvePromise(makeResponse({ type: 'streak_milestone' }));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('captures exception and does not navigate when getLastNotificationResponseAsync rejects with Error', async () => {
    mockGetLast.mockRejectedValue(new Error('SDK error'));
    render(<HookHarness navRef={makeNavRef()} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(require('@/services/crashReporting').captureException).toHaveBeenCalledWith(
      expect.any(Error),
    );
  });

  it('wraps non-Error rejection in new Error before captureException', async () => {
    mockGetLast.mockRejectedValue('raw string rejection');
    render(<HookHarness navRef={makeNavRef()} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(require('@/services/crashReporting').captureException).toHaveBeenCalledWith(
      expect.any(Error),
    );
  });
});

// ── Foreground / background tap ───────────────────────────────────────────────

describe('foreground / background tap', () => {
  it('navigates to Loyalty streak tab on streak_milestone tap', async () => {
    render(<HookHarness navRef={makeNavRef()} />);
    const cb = mockAddListener.mock.calls[0][0];
    await act(async () => {
      cb(makeResponse({ type: 'streak_milestone' }));
    });
    expect(mockNavigate).toHaveBeenCalledWith('Loyalty', { initialTab: 'streak' });
  });

  it('navigates to Loyalty quests tab on quest_complete tap', async () => {
    render(<HookHarness navRef={makeNavRef()} />);
    const cb = mockAddListener.mock.calls[0][0];
    await act(async () => {
      cb(makeResponse({ type: 'quest_complete' }));
    });
    expect(mockNavigate).toHaveBeenCalledWith('Loyalty', { initialTab: 'quests' });
  });

  it('navigates to Loyalty spin tab on spin_reminder tap', async () => {
    render(<HookHarness navRef={makeNavRef()} />);
    const cb = mockAddListener.mock.calls[0][0];
    await act(async () => {
      cb(makeResponse({ type: 'spin_reminder' }));
    });
    expect(mockNavigate).toHaveBeenCalledWith('Loyalty', { initialTab: 'spin' });
  });

  it('ignores non-gamification types', async () => {
    render(<HookHarness navRef={makeNavRef()} />);
    const cb = mockAddListener.mock.calls[0][0];
    await act(async () => {
      cb(makeResponse({ type: 'cart_reminder' }));
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('calls goBack when data is null', async () => {
    render(<HookHarness navRef={makeNavRef()} />);
    const cb = mockAddListener.mock.calls[0][0];
    await act(async () => {
      cb({
        actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
        notification: { request: { content: { data: null } } },
      });
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls goBack when data has no type', async () => {
    render(<HookHarness navRef={makeNavRef()} />);
    const cb = mockAddListener.mock.calls[0][0];
    await act(async () => {
      cb(makeResponse({ garbage: 'value' }));
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('ignores non-default action identifiers (dismiss)', async () => {
    render(<HookHarness navRef={makeNavRef()} />);
    const cb = mockAddListener.mock.calls[0][0];
    await act(async () => {
      cb({
        actionIdentifier: 'com.apple.UNNotificationDismissActionIdentifier',
        notification: { request: { content: { data: { type: 'streak_milestone' } } } },
      });
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does nothing when navigation is not ready', async () => {
    const notReady = { isReady: () => false, navigate: mockNavigate, goBack: mockGoBack } as any;
    render(<HookHarness navRef={notReady} />);
    const cb = mockAddListener.mock.calls[0][0];
    await act(async () => {
      cb(makeResponse({ type: 'streak_milestone' }));
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('removes listener on unmount', async () => {
    const { unmount } = render(<HookHarness navRef={makeNavRef()} />);
    const sub = mockAddListener.mock.results[0].value as { remove: jest.Mock };
    unmount();
    expect(sub.remove).toHaveBeenCalled();
  });

  it('captures exception and does not crash when handler throws Error', async () => {
    render(<HookHarness navRef={makeNavRef()} />);
    const cb = mockAddListener.mock.calls[0][0];
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('nav error');
    });
    await act(async () => {
      cb(makeResponse({ type: 'streak_milestone' }));
    });
    expect(require('@/services/crashReporting').captureException).toHaveBeenCalledWith(
      expect.any(Error),
    );
  });

  it('wraps non-Error thrown in listener catch before captureException', async () => {
    render(<HookHarness navRef={makeNavRef()} />);
    const cb = mockAddListener.mock.calls[0][0];
    mockNavigate.mockImplementationOnce(() => {
      throw 'string error';
    });
    await act(async () => {
      cb(makeResponse({ type: 'streak_milestone' }));
    });
    expect(require('@/services/crashReporting').captureException).toHaveBeenCalledWith(
      expect.any(Error),
    );
  });
});

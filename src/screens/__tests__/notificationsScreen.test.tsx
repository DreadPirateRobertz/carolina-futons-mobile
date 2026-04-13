/**
 * @file NotificationsScreen.test.tsx
 * @description TDD tests for cf-tuz NotificationsScreen — in-app gamification alerts feed.
 *
 * Covers:
 *  - renders a list of notifications
 *  - each row shows icon, message, relative time, and unread dot for unread items
 *  - mark-all-read button hides all unread dots
 *  - empty state when no notifications
 *  - loading state while fetch is in flight
 *  - error state when webMethod fails
 *  - correct icon per notification type
 *  - pull-to-refresh triggers refetch
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NotificationsScreen } from '../NotificationsScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFetchNotifications = jest.fn();

jest.mock('@/hooks/useGamificationFeed', () => ({
  useGamificationFeed: () => mockFetchNotifications(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = 1_711_152_000_000; // 2026-03-23T06:00:00Z

const notificationFixtures = [
  {
    id: 'n-001',
    type: 'streak_milestone' as const,
    message: '🔥 7-day streak! Keep it up!',
    createdAt: NOW - 5 * 60 * 1000, // 5 min ago
    read: false,
  },
  {
    id: 'n-002',
    type: 'daily_quest' as const,
    message: '✅ Daily quest complete — 50 pts earned',
    createdAt: NOW - 2 * 60 * 60 * 1000, // 2 hours ago
    read: false,
  },
  {
    id: 'n-003',
    type: 'challenge_complete' as const,
    message: '🏆 Challenge complete: Browse 5 products',
    createdAt: NOW - 24 * 60 * 60 * 1000, // 1 day ago
    read: true,
  },
  {
    id: 'n-004',
    type: 'referral' as const,
    message: '🤝 Your referral joined — 200 pts earned',
    createdAt: NOW - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    read: true,
  },
];

function makeResult(overrides: Partial<ReturnType<typeof defaultResult>> = {}) {
  return { ...defaultResult(), ...overrides };
}

function defaultResult() {
  return {
    notifications: notificationFixtures,
    loading: false,
    error: null as Error | null,
    markAllRead: jest.fn(),
    refresh: jest.fn(),
  };
}

function renderScreen(props: { testID?: string } = {}) {
  return render(
    <ThemeProvider>
      <NotificationsScreen {...props} />
    </ThemeProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchNotifications.mockReturnValue(makeResult());
  });

  // ── Rendering ──

  it('renders the screen with testID', () => {
    const { getByTestId } = renderScreen({ testID: 'notifications-screen' });
    expect(getByTestId('notifications-screen')).toBeTruthy();
  });

  it('renders all notification rows', () => {
    const { getByTestId } = renderScreen();
    notificationFixtures.forEach((n) => {
      expect(getByTestId(`notification-row-${n.id}`)).toBeTruthy();
    });
  });

  it('renders message text for each notification', () => {
    const { getByText } = renderScreen();
    expect(getByText('🔥 7-day streak! Keep it up!')).toBeTruthy();
    expect(getByText('✅ Daily quest complete — 50 pts earned')).toBeTruthy();
    expect(getByText('🏆 Challenge complete: Browse 5 products')).toBeTruthy();
    expect(getByText('🤝 Your referral joined — 200 pts earned')).toBeTruthy();
  });

  // ── Unread dots ──

  it('shows unread dot for unread notifications', () => {
    const { getByTestId, queryByTestId } = renderScreen();
    expect(getByTestId('unread-dot-n-001')).toBeTruthy();
    expect(getByTestId('unread-dot-n-002')).toBeTruthy();
  });

  it('does not show unread dot for read notifications', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('unread-dot-n-003')).toBeNull();
    expect(queryByTestId('unread-dot-n-004')).toBeNull();
  });

  // ── Mark all read ──

  it('renders mark-all-read button', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('mark-all-read-btn')).toBeTruthy();
  });

  it('calls markAllRead when mark-all-read is pressed', () => {
    const markAllRead = jest.fn();
    mockFetchNotifications.mockReturnValue(makeResult({ markAllRead }));
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('mark-all-read-btn'));
    expect(markAllRead).toHaveBeenCalledTimes(1);
  });

  it('unread dots disappear after markAllRead updates state', () => {
    const allRead = notificationFixtures.map((n) => ({ ...n, read: true }));
    mockFetchNotifications.mockReturnValue(makeResult({ notifications: allRead }));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('unread-dot-n-001')).toBeNull();
    expect(queryByTestId('unread-dot-n-002')).toBeNull();
  });

  // ── Empty state ──

  it('renders empty state when no notifications', () => {
    mockFetchNotifications.mockReturnValue(makeResult({ notifications: [] }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('notifications-empty')).toBeTruthy();
  });

  it('empty state shows correct message', () => {
    mockFetchNotifications.mockReturnValue(makeResult({ notifications: [] }));
    const { getByText } = renderScreen();
    expect(getByText('No notifications yet — keep up your streak!')).toBeTruthy();
  });

  // ── Loading state ──

  it('renders loading indicator while fetching', () => {
    mockFetchNotifications.mockReturnValue(makeResult({ notifications: [], loading: true }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('notifications-loading')).toBeTruthy();
  });

  it('does not render notification list while loading', () => {
    mockFetchNotifications.mockReturnValue(makeResult({ notifications: [], loading: true }));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('notifications-list')).toBeNull();
  });

  // ── Error state ──

  it('renders error message on API failure', () => {
    mockFetchNotifications.mockReturnValue(
      makeResult({ error: new Error('Network error'), notifications: [] }),
    );
    const { getByTestId } = renderScreen();
    expect(getByTestId('notifications-error')).toBeTruthy();
  });

  it('renders retry button on error', () => {
    const refresh = jest.fn();
    mockFetchNotifications.mockReturnValue(
      makeResult({ error: new Error('Network error'), notifications: [], refresh }),
    );
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('notifications-retry-btn'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  // ── Relative time ──

  it('shows relative time for each notification', () => {
    // 5 min ago should show "5m ago" or similar relative label
    const { getByTestId } = renderScreen();
    const row = getByTestId('notification-row-n-001');
    expect(row).toBeTruthy();
    // The time element exists inside the row
    const { getByTestId: getWithin } = { getByTestId: (id: string) => row };
    // Just verify the row renders (time formatting tested in useNotifications)
    expect(getByTestId('notification-time-n-001')).toBeTruthy();
  });

  // ── Notification type icons ──

  it('renders streak_milestone icon for streak notifications', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('notification-icon-n-001')).toBeTruthy();
  });

  it('renders all four notification type icon cells', () => {
    const { getByTestId } = renderScreen();
    notificationFixtures.forEach((n) => {
      expect(getByTestId(`notification-icon-${n.id}`)).toBeTruthy();
    });
  });

  // ── Pull-to-refresh ──

  it('calls refresh on pull-to-refresh', async () => {
    const refresh = jest.fn();
    mockFetchNotifications.mockReturnValue(makeResult({ refresh }));
    const { getByTestId } = renderScreen();
    const list = getByTestId('notifications-list');
    fireEvent(list, 'refresh');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  // ── Edge cases ──

  it('handles single notification gracefully', () => {
    mockFetchNotifications.mockReturnValue(
      makeResult({ notifications: [notificationFixtures[0]] }),
    );
    const { getByTestId } = renderScreen();
    expect(getByTestId('notification-row-n-001')).toBeTruthy();
  });

  it('renders without crashing when error and some notifications exist (stale data)', () => {
    mockFetchNotifications.mockReturnValue(
      makeResult({
        error: new Error('Stale'),
        notifications: notificationFixtures,
      }),
    );
    // Error shown but stale list still renders
    const { getByTestId } = renderScreen();
    expect(getByTestId('notifications-error')).toBeTruthy();
  });

  // ── Edge cases (cm-s0r) ───────────────────────────────────────────────────

  describe('loading with existing data (stale refresh)', () => {
    it('shows list (not full-screen spinner) when loading with non-empty notifications', () => {
      mockFetchNotifications.mockReturnValue(
        makeResult({ notifications: notificationFixtures, loading: true }),
      );
      const { getByTestId, queryByTestId } = renderScreen();
      expect(getByTestId('notifications-list')).toBeTruthy();
      expect(queryByTestId('notifications-loading')).toBeNull();
    });
  });

  describe('unknown notification type fallback', () => {
    it('renders fallback 🔔 icon for unrecognised notification type', () => {
      const unknownNotif = {
        id: 'n-unknown',
        type: 'tier_upgrade' as any,
        message: 'You reached a new tier!',
        createdAt: NOW - 1000,
        read: false,
      };
      mockFetchNotifications.mockReturnValue(makeResult({ notifications: [unknownNotif] }));
      const { getByTestId } = renderScreen();
      const icon = getByTestId('notification-icon-n-unknown');
      expect(icon.props.children).toBe('🔔');
    });
  });

  describe('relativeTime formatting', () => {
    it('shows "just now" for events less than 1 minute ago', () => {
      const fresh = { ...notificationFixtures[0], id: 'n-fresh', createdAt: Date.now() - 30_000 };
      mockFetchNotifications.mockReturnValue(makeResult({ notifications: [fresh] }));
      const { getByTestId } = renderScreen();
      expect(getByTestId('notification-time-n-fresh').props.children).toBe('just now');
    });

    it('shows "Xm ago" for events 1-59 minutes ago', () => {
      const mins = {
        ...notificationFixtures[0],
        id: 'n-mins',
        createdAt: Date.now() - 15 * 60_000,
      };
      mockFetchNotifications.mockReturnValue(makeResult({ notifications: [mins] }));
      const { getByTestId } = renderScreen();
      expect(getByTestId('notification-time-n-mins').props.children).toBe('15m ago');
    });

    it('shows "Xh ago" for events 1-23 hours ago', () => {
      const hours = {
        ...notificationFixtures[0],
        id: 'n-hours',
        createdAt: Date.now() - 3 * 3_600_000,
      };
      mockFetchNotifications.mockReturnValue(makeResult({ notifications: [hours] }));
      const { getByTestId } = renderScreen();
      expect(getByTestId('notification-time-n-hours').props.children).toBe('3h ago');
    });

    it('shows "Xd ago" for events 1+ days ago', () => {
      const days = {
        ...notificationFixtures[0],
        id: 'n-days',
        createdAt: Date.now() - 2 * 86_400_000,
      };
      mockFetchNotifications.mockReturnValue(makeResult({ notifications: [days] }));
      const { getByTestId } = renderScreen();
      expect(getByTestId('notification-time-n-days').props.children).toBe('2d ago');
    });
  });

  describe('error banner message', () => {
    it('shows static error message text in banner', () => {
      mockFetchNotifications.mockReturnValue(
        makeResult({ error: new Error('any error'), notifications: [] }),
      );
      const { getByText } = renderScreen();
      expect(getByText("Couldn't load notifications.")).toBeTruthy();
    });
  });

  describe('stale data + error: both banner and list visible', () => {
    it('shows error banner AND stale list simultaneously', () => {
      mockFetchNotifications.mockReturnValue(
        makeResult({ error: new Error('Refresh failed'), notifications: notificationFixtures }),
      );
      const { getByTestId } = renderScreen();
      expect(getByTestId('notifications-error')).toBeTruthy();
      expect(getByTestId('notifications-list')).toBeTruthy();
    });
  });

  describe('mark-all-read with async handler', () => {
    it('does not crash when markAllRead is async and resolves', async () => {
      const asyncMarkAllRead = jest.fn().mockResolvedValue(undefined);
      mockFetchNotifications.mockReturnValue(makeResult({ markAllRead: asyncMarkAllRead }));
      const { getByTestId } = renderScreen();
      expect(() => fireEvent.press(getByTestId('mark-all-read-btn'))).not.toThrow();
      expect(asyncMarkAllRead).toHaveBeenCalledTimes(1);
    });
  });
});

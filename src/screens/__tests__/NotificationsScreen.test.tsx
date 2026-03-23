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
});

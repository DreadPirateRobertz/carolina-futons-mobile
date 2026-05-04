/**
 * NotificationsScreen deeper edge cases — cm-5xf
 *
 * TDD: written before confirming coverage gaps.
 * Covers: empty+error coexistence, badge text value, mark-all-read a11y,
 * retry a11y, loading hides empty, unread dot disappears after all-read,
 * icon a11y labels, delete button a11y, badge absent with all-read list.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NotificationsScreen } from '../NotificationsScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { GamificationNotification } from '@/hooks/useGamificationFeed';

jest.mock('@/hooks/useGamificationFeed', () => ({
  useGamificationFeed: () => mockFeed(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockFeed = jest.fn();
const mockMarkAllRead = jest.fn();
const mockRefresh = jest.fn();

const NOW = Date.now();

const unreadA: GamificationNotification = {
  id: 'a', type: 'streak_milestone', message: 'Streak!', createdAt: NOW - 1000, read: false,
};
const unreadB: GamificationNotification = {
  id: 'b', type: 'daily_quest', message: 'Quest done', createdAt: NOW - 2000, read: false,
};
const readC: GamificationNotification = {
  id: 'c', type: 'referral', message: 'Referral', createdAt: NOW - 3000, read: true,
};

function feed(notifications: GamificationNotification[], overrides = {}) {
  return { notifications, loading: false, error: null, markAllRead: mockMarkAllRead, refresh: mockRefresh, ...overrides };
}

function renderScreen(props: Partial<React.ComponentProps<typeof NotificationsScreen>> = {}) {
  return render(<ThemeProvider><NotificationsScreen {...props} /></ThemeProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFeed.mockReturnValue(feed([unreadA, unreadB, readC]));
});

// ── Empty state + error coexistence ──────────────────────────────────────────

describe('empty state + error coexistence (cm-5xf)', () => {
  it('shows notifications-empty when error set and notifications empty', () => {
    mockFeed.mockReturnValue(feed([], { error: new Error('fail') }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('notifications-empty')).toBeTruthy();
  });

  it('shows error banner when error set and notifications empty', () => {
    mockFeed.mockReturnValue(feed([], { error: new Error('fail') }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('notifications-error')).toBeTruthy();
  });

  it('shows both error banner AND empty state simultaneously when error + empty', () => {
    mockFeed.mockReturnValue(feed([], { error: new Error('fail') }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('notifications-error')).toBeTruthy();
    expect(getByTestId('notifications-empty')).toBeTruthy();
  });
});

// ── Loading hides empty state ─────────────────────────────────────────────────

describe('loading state hides empty view (cm-5xf)', () => {
  it('empty view NOT shown during initial load (loading=true, notifications=[])', () => {
    mockFeed.mockReturnValue(feed([], { loading: true }));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('notifications-empty')).toBeNull();
  });

  it('full-screen spinner shown instead of empty during initial load', () => {
    mockFeed.mockReturnValue(feed([], { loading: true }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('notifications-loading')).toBeTruthy();
  });
});

// ── Unread badge number text ──────────────────────────────────────────────────

describe('unread badge number display (cm-5xf)', () => {
  it('badge accessible label encodes exact count "2 unread"', () => {
    mockFeed.mockReturnValue(feed([unreadA, unreadB, readC]));
    const { getByTestId } = renderScreen();
    expect(getByTestId('notification-badge-count').props.accessibilityLabel).toBe('2 unread');
  });

  it('badge accessible label shows "1 unread" when exactly 1 unread', () => {
    mockFeed.mockReturnValue(feed([unreadA, readC]));
    const { getByTestId } = renderScreen();
    expect(getByTestId('notification-badge-count').props.accessibilityLabel).toBe('1 unread');
  });

  it('badge absent when all notifications are read', () => {
    mockFeed.mockReturnValue(feed([readC]));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('notification-badge-count')).toBeNull();
  });

  it('badge absent when notifications list is empty', () => {
    mockFeed.mockReturnValue(feed([]));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('notification-badge-count')).toBeNull();
  });
});

// ── Unread dots disappear after mark-all-read ─────────────────────────────────

describe('unread dots after mark-all-read (cm-5xf)', () => {
  it('unread dots absent when notifications updated to all-read', () => {
    mockFeed.mockReturnValue(feed([{ ...unreadA, read: true }, { ...unreadB, read: true }]));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('unread-dot-a')).toBeNull();
    expect(queryByTestId('unread-dot-b')).toBeNull();
  });

  it('unread dot present before mark-all-read', () => {
    mockFeed.mockReturnValue(feed([unreadA, unreadB]));
    const { getByTestId } = renderScreen();
    expect(getByTestId('unread-dot-a')).toBeTruthy();
  });
});

// ── Accessibility — mark-all-read, retry, delete, icons ──────────────────────

describe('accessibility (cm-5xf)', () => {
  it('mark-all-read button has accessibilityLabel', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('mark-all-read-btn').props.accessibilityLabel).toBe(
      'Mark all notifications as read',
    );
  });

  it('retry button has accessibilityLabel "Retry loading notifications"', () => {
    mockFeed.mockReturnValue(feed([], { error: new Error('fail') }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('notifications-retry-btn').props.accessibilityLabel).toBe(
      'Retry loading notifications',
    );
  });

  it('delete button has accessibilityLabel "Delete notification"', () => {
    const { getByTestId } = renderScreen({ onDeleteNotification: jest.fn() });
    expect(getByTestId('notification-delete-btn-a').props.accessibilityLabel).toBe(
      'Delete notification',
    );
  });

  it('notification icon has accessibilityLabel matching type', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('notification-icon-a').props.accessibilityLabel).toBe('streak_milestone');
  });

  it('delete button has accessibilityRole button', () => {
    const { getByTestId } = renderScreen({ onDeleteNotification: jest.fn() });
    expect(getByTestId('notification-delete-btn-a').props.accessibilityRole).toBe('button');
  });
});

// ── Badge count accessibilityLabel ────────────────────────────────────────────

describe('badge accessibilityLabel (cm-5xf)', () => {
  it('badge has accessibilityLabel "N unread"', () => {
    mockFeed.mockReturnValue(feed([unreadA, unreadB]));
    const { getByTestId } = renderScreen();
    expect(getByTestId('notification-badge-count').props.accessibilityLabel).toBe('2 unread');
  });

  it('badge accessibilityLabel updates with count', () => {
    mockFeed.mockReturnValue(feed([unreadA]));
    const { getByTestId } = renderScreen();
    expect(getByTestId('notification-badge-count').props.accessibilityLabel).toBe('1 unread');
  });
});

// ── Error banner retry calls refresh ─────────────────────────────────────────

describe('error retry behaviour (cm-5xf)', () => {
  it('retry button calls refresh exactly once', () => {
    mockFeed.mockReturnValue(feed([], { error: new Error('fail') }));
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('notifications-retry-btn'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('error banner not shown when no error', () => {
    mockFeed.mockReturnValue(feed([unreadA]));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('notifications-error')).toBeNull();
  });

  it('error banner not shown during initial loading', () => {
    mockFeed.mockReturnValue(feed([], { loading: true, error: new Error('stale') }));
    const { queryByTestId } = renderScreen();
    // Early return on loading → no header/banner at all, just spinner
    expect(queryByTestId('notifications-error')).toBeNull();
  });
});

/**
 * NotificationsScreen deeper edge cases — cm-c2l
 *
 * Covers:
 * - Empty state deeper (accessible, badge absent)
 * - Mark-all-read deeper (badge disappears, safe when already read)
 * - Delete notification (callback, no crash without callback)
 * - Badge count update (correct count, absent when all read)
 * - Deep link on tap (callback fired, correct object, no crash without callback)
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NotificationsScreen } from '../NotificationsScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { GamificationNotification } from '@/hooks/useGamificationFeed';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFeed = jest.fn();

jest.mock('@/hooks/useGamificationFeed', () => ({
  useGamificationFeed: () => mockFeed(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = 1_711_152_000_000;

const unreadA: GamificationNotification = {
  id: 'n-001',
  type: 'streak_milestone',
  message: '7-day streak!',
  createdAt: NOW - 5 * 60 * 1000,
  read: false,
};
const unreadB: GamificationNotification = {
  id: 'n-002',
  type: 'daily_quest',
  message: 'Quest done',
  createdAt: NOW - 2 * 60 * 60 * 1000,
  read: false,
};
const readC: GamificationNotification = {
  id: 'n-003',
  type: 'challenge_complete',
  message: 'Challenge complete',
  createdAt: NOW - 24 * 60 * 60 * 1000,
  read: true,
};

const markAllRead = jest.fn();
const refresh = jest.fn();

function feedWith(notifications: GamificationNotification[], overrides = {}) {
  return {
    notifications,
    loading: false,
    error: null,
    markAllRead,
    refresh,
    ...overrides,
  };
}

function renderScreen(props: Partial<React.ComponentProps<typeof NotificationsScreen>> = {}) {
  return render(
    <ThemeProvider>
      <NotificationsScreen {...props} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Empty state deeper ───────────────────────────────────────────────────────

describe('empty state deeper', () => {
  beforeEach(() => {
    mockFeed.mockReturnValue(feedWith([]));
  });

  it('empty state text is accessible', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('notifications-empty')).toBeTruthy();
  });

  it('badge is not shown when there are no notifications', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('notification-badge-count')).toBeNull();
  });

  it('mark-all-read button is still rendered when empty', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('mark-all-read-btn')).toBeTruthy();
  });
});

// ─── Badge count update ───────────────────────────────────────────────────────

describe('badge count update', () => {
  it('shows correct unread count when 2 items are unread', () => {
    mockFeed.mockReturnValue(feedWith([unreadA, unreadB, readC]));
    const { getByTestId } = renderScreen();
    expect(getByTestId('notification-badge-count')).toBeTruthy();
    expect(getByTestId('notification-badge-count').props.accessibilityLabel).toBe('2 unread');
  });

  it('badge is absent when all notifications are read', () => {
    mockFeed.mockReturnValue(feedWith([readC]));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('notification-badge-count')).toBeNull();
  });

  it('badge shows count 1 when only one item is unread', () => {
    mockFeed.mockReturnValue(feedWith([unreadA, readC]));
    const { getByTestId } = renderScreen();
    expect(getByTestId('notification-badge-count').props.accessibilityLabel).toBe('1 unread');
  });
});

// ─── Mark-all-read deeper ─────────────────────────────────────────────────────

describe('mark-all-read deeper', () => {
  it('badge disappears after mark-all-read updates feed to all read', async () => {
    const allRead = [
      { ...unreadA, read: true },
      { ...unreadB, read: true },
    ];
    // Start with 2 unread, markAllRead will flip them
    let currentNotifications = [unreadA, unreadB];
    markAllRead.mockImplementation(() => {
      currentNotifications = allRead;
      mockFeed.mockReturnValue(feedWith(allRead));
    });
    mockFeed.mockReturnValue(feedWith(currentNotifications));

    const { getByTestId, queryByTestId, rerender } = renderScreen();
    expect(getByTestId('notification-badge-count')).toBeTruthy();

    fireEvent.press(getByTestId('mark-all-read-btn'));
    // Re-render with updated feed
    rerender(
      <ThemeProvider>
        <NotificationsScreen />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(queryByTestId('notification-badge-count')).toBeNull();
    });
  });

  it('pressing mark-all-read when already all-read does not crash', () => {
    mockFeed.mockReturnValue(feedWith([readC]));
    const { getByTestId } = renderScreen();
    expect(() => fireEvent.press(getByTestId('mark-all-read-btn'))).not.toThrow();
    expect(markAllRead).toHaveBeenCalledTimes(1);
  });
});

// ─── Delete notification ──────────────────────────────────────────────────────

describe('delete notification', () => {
  it('delete button renders for each notification row when callback provided', () => {
    mockFeed.mockReturnValue(feedWith([unreadA, unreadB]));
    const onDeleteNotification = jest.fn();
    const { getByTestId } = renderScreen({ onDeleteNotification });
    expect(getByTestId('notification-delete-btn-n-001')).toBeTruthy();
    expect(getByTestId('notification-delete-btn-n-002')).toBeTruthy();
  });

  it('delete button is not rendered when no callback provided', () => {
    mockFeed.mockReturnValue(feedWith([unreadA]));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('notification-delete-btn-n-001')).toBeNull();
  });

  it('pressing delete calls onDeleteNotification with the correct id', () => {
    mockFeed.mockReturnValue(feedWith([unreadA, unreadB]));
    const onDeleteNotification = jest.fn();
    const { getByTestId } = renderScreen({ onDeleteNotification });
    fireEvent.press(getByTestId('notification-delete-btn-n-002'));
    expect(onDeleteNotification).toHaveBeenCalledTimes(1);
    expect(onDeleteNotification).toHaveBeenCalledWith('n-002');
  });

  it('deleting first item calls callback with first item id', () => {
    mockFeed.mockReturnValue(feedWith([unreadA, readC]));
    const onDeleteNotification = jest.fn();
    const { getByTestId } = renderScreen({ onDeleteNotification });
    fireEvent.press(getByTestId('notification-delete-btn-n-001'));
    expect(onDeleteNotification).toHaveBeenCalledWith('n-001');
  });
});

// ─── Deep link on tap ─────────────────────────────────────────────────────────

describe('deep link on tap', () => {
  it('pressing a row calls onNotificationPress', () => {
    mockFeed.mockReturnValue(feedWith([unreadA]));
    const onNotificationPress = jest.fn();
    const { getByTestId } = renderScreen({ onNotificationPress });
    fireEvent.press(getByTestId('notification-row-n-001'));
    expect(onNotificationPress).toHaveBeenCalledTimes(1);
  });

  it('onNotificationPress receives the correct notification object', () => {
    mockFeed.mockReturnValue(feedWith([unreadA, unreadB]));
    const onNotificationPress = jest.fn();
    const { getByTestId } = renderScreen({ onNotificationPress });
    fireEvent.press(getByTestId('notification-row-n-002'));
    expect(onNotificationPress).toHaveBeenCalledWith(unreadB);
  });

  it('pressing a row does not crash when no onNotificationPress provided', () => {
    mockFeed.mockReturnValue(feedWith([unreadA]));
    const { getByTestId } = renderScreen();
    expect(() => fireEvent.press(getByTestId('notification-row-n-001'))).not.toThrow();
  });

  it('row has accessibilityRole button when onNotificationPress provided', () => {
    mockFeed.mockReturnValue(feedWith([unreadA]));
    const onNotificationPress = jest.fn();
    const { getByTestId } = renderScreen({ onNotificationPress });
    expect(getByTestId('notification-row-n-001').props.accessibilityRole).toBe('button');
  });

  it('row has no accessibilityRole when no onNotificationPress provided', () => {
    mockFeed.mockReturnValue(feedWith([unreadA]));
    const { getByTestId } = renderScreen();
    expect(getByTestId('notification-row-n-001').props.accessibilityRole).toBeUndefined();
  });
});

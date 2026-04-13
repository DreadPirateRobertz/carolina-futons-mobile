/**
 * @module PointsHistoryScreen.test
 *
 * TDD tests for PointsHistoryScreen.
 * cf-g4r / Phase 7 gamification / cm-abu edge cases
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { PointsHistoryScreen } from '../PointsHistoryScreen';
import type { PointsEvent } from '@/hooks/usePointsHistory';

import { usePointsHistory } from '@/hooks/usePointsHistory';

// ── Mock usePointsHistory ────────────────────────────────────────────────────

const mockRefresh = jest.fn();

const defaultHookState = {
  events: [] as PointsEvent[],
  loading: false,
  error: null as string | null,
  refresh: mockRefresh,
};

jest.mock('@/hooks/usePointsHistory', () => ({
  usePointsHistory: jest.fn(() => defaultHookState),
}));
const mockUsePointsHistory = usePointsHistory as jest.Mock;

const MOCK_EVENTS: PointsEvent[] = [
  {
    id: 'ev-1',
    type: 'purchase',
    description: 'Ordered Ashley Sectional',
    points: 250,
    earnedAt: '2026-03-20T14:00:00Z',
  },
  {
    id: 'ev-2',
    type: 'review',
    description: 'Reviewed Blue Ridge Sofa',
    points: 50,
    earnedAt: '2026-03-18T09:00:00Z',
  },
  {
    id: 'ev-3',
    type: 'referral',
    description: 'Referred a friend',
    points: 100,
    earnedAt: '2026-03-10T10:00:00Z',
  },
  {
    id: 'ev-4',
    type: 'challenge_complete',
    description: 'Spring Refresh challenge',
    points: 500,
    earnedAt: '2026-03-08T09:00:00Z',
  },
  {
    id: 'ev-5',
    type: 'streak_milestone',
    description: '7-day streak',
    points: 75,
    earnedAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'ev-6',
    type: 'daily_quest',
    description: 'Daily quest completed',
    points: 25,
    earnedAt: '2026-02-28T12:00:00Z',
  },
];

function renderScreen(props: React.ComponentProps<typeof PointsHistoryScreen> = {}) {
  return render(
    <ThemeProvider>
      <PointsHistoryScreen {...props} />
    </ThemeProvider>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PointsHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePointsHistory.mockReturnValue({ ...defaultHookState });
  });

  // ── Render ────────────────────────────────────────────────────────────────

  it('renders without crashing', () => {
    expect(() => renderScreen()).not.toThrow();
  });

  it('renders with correct testID', () => {
    const { getByTestId } = renderScreen({ testID: 'pts-history' });
    expect(getByTestId('pts-history')).toBeTruthy();
  });

  // ── Loading ───────────────────────────────────────────────────────────────

  it('renders skeleton when loading=true', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultHookState, loading: true });
    const { getByTestId } = renderScreen();
    expect(getByTestId('points-history-loading')).toBeTruthy();
  });

  it('renders content (list) when loading=false', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: MOCK_EVENTS, loading: false });
    const { getByTestId } = renderScreen();
    expect(getByTestId('points-history-list')).toBeTruthy();
  });

  it('shows loading spinner when loading=true', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultHookState, loading: true });
    const { getByTestId } = renderScreen();
    expect(getByTestId('points-history-loading')).toBeTruthy();
  });

  it('does not show list when loading', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultHookState, loading: true });
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('points-history-list')).toBeNull();
  });

  // ── Error ─────────────────────────────────────────────────────────────────

  it('shows error message when error is set', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultHookState, error: 'Failed to load' });
    const { getByTestId } = renderScreen();
    expect(getByTestId('points-history-error')).toBeTruthy();
  });

  it('shows retry button on error', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultHookState, error: 'Failed to load' });
    const { getByTestId } = renderScreen();
    expect(getByTestId('points-history-retry')).toBeTruthy();
  });

  it('calls refresh on retry press', () => {
    mockUsePointsHistory.mockReturnValue({
      ...defaultHookState,
      error: 'Failed to load',
      refresh: mockRefresh,
    });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('points-history-retry'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  // ── Empty ─────────────────────────────────────────────────────────────────

  it('shows empty state when events array is empty', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: [] });
    const { getByTestId } = renderScreen();
    expect(getByTestId('points-history-empty')).toBeTruthy();
  });

  // ── Events list ───────────────────────────────────────────────────────────

  it('renders the events list when events exist', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: MOCK_EVENTS });
    const { getByTestId } = renderScreen();
    expect(getByTestId('points-history-list')).toBeTruthy();
  });

  it('renders a row for each event', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: MOCK_EVENTS });
    const { getByTestId } = renderScreen();
    MOCK_EVENTS.forEach((ev) => {
      expect(getByTestId(`points-event-row-${ev.id}`)).toBeTruthy();
    });
  });

  it('shows description text for each event', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: MOCK_EVENTS });
    const { getByText } = renderScreen();
    expect(getByText('Ordered Ashley Sectional')).toBeTruthy();
    expect(getByText('Reviewed Blue Ridge Sofa')).toBeTruthy();
  });

  it('shows "+N pts" for each event', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: MOCK_EVENTS });
    const { getByTestId } = renderScreen();
    const row = getByTestId('points-event-points-ev-1');
    expect(row.props.children).toMatch(/\+250/);
  });

  it('renders icon for each event type', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: MOCK_EVENTS });
    const { getByTestId } = renderScreen();
    MOCK_EVENTS.forEach((ev) => {
      expect(getByTestId(`points-event-icon-${ev.id}`)).toBeTruthy();
    });
  });

  // ── Edge cases (cm-abu) ───────────────────────────────────────────────────

  describe('unknown event type', () => {
    it('renders fallback ✨ icon for unrecognised event type', () => {
      const unknownEvent: PointsEvent = {
        id: 'ev-unknown',
        type: 'unknown_type' as PointsEvent['type'],
        description: 'Mystery event',
        points: 10,
        earnedAt: '2026-03-01T08:00:00Z',
      };
      mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: [unknownEvent] });
      const { getByTestId } = renderScreen();
      const icon = getByTestId('points-event-icon-ev-unknown');
      expect(icon.props.children).toBe('✨');
    });
  });

  describe('relativeDate formatting', () => {
    function makeEvent(earnedAt: string): PointsEvent {
      return { id: 'ev-date', type: 'purchase', description: 'test', points: 10, earnedAt };
    }

    it('shows "Today" for an event earned within the last 24h', () => {
      const earnedAt = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1h ago
      mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: [makeEvent(earnedAt)] });
      const { getByText } = renderScreen();
      expect(getByText('Today')).toBeTruthy();
    });

    it('shows "Yesterday" for an event earned ~1 day ago', () => {
      const earnedAt = new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString(); // 27h ago
      mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: [makeEvent(earnedAt)] });
      const { getByText } = renderScreen();
      expect(getByText('Yesterday')).toBeTruthy();
    });

    it('shows "Xd ago" for events 2-6 days old', () => {
      const earnedAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(); // 3d ago
      mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: [makeEvent(earnedAt)] });
      const { getByText } = renderScreen();
      expect(getByText('3d ago')).toBeTruthy();
    });

    it('shows "Xw ago" for events 7-29 days old', () => {
      const earnedAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(); // 2w ago
      mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: [makeEvent(earnedAt)] });
      const { getByText } = renderScreen();
      expect(getByText('2w ago')).toBeTruthy();
    });

    it('shows "Xmo ago" for events 30+ days old', () => {
      const earnedAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(); // 60d ago
      mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: [makeEvent(earnedAt)] });
      const { getByText } = renderScreen();
      expect(getByText('2mo ago')).toBeTruthy();
    });
  });

  describe('boundary: single event', () => {
    it('renders a list with exactly one event', () => {
      const single: PointsEvent = {
        id: 'ev-single',
        type: 'review',
        description: 'Reviewed item',
        points: 50,
        earnedAt: '2026-03-20T14:00:00Z',
      };
      mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: [single] });
      const { getByTestId } = renderScreen();
      expect(getByTestId('points-history-list')).toBeTruthy();
      expect(getByTestId('points-event-row-ev-single')).toBeTruthy();
    });
  });

  describe('boundary: 1-point event', () => {
    it('shows "+1 pts" for an event worth 1 point', () => {
      const tiny: PointsEvent = {
        id: 'ev-tiny',
        type: 'daily_quest',
        description: 'Mini quest',
        points: 1,
        earnedAt: '2026-03-20T14:00:00Z',
      };
      mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: [tiny] });
      const { getByTestId } = renderScreen();
      expect(getByTestId('points-event-points-ev-tiny').props.children).toBe('+1 pts');
    });
  });

  describe('default testID', () => {
    it('renders with default testID points-history-screen when no testID prop', () => {
      mockUsePointsHistory.mockReturnValue({ ...defaultHookState, events: MOCK_EVENTS });
      const { getByTestId } = renderScreen();
      expect(getByTestId('points-history-screen')).toBeTruthy();
    });
  });

  describe('error message content', () => {
    it('displays the exact error string from the hook', () => {
      mockUsePointsHistory.mockReturnValue({
        ...defaultHookState,
        error: 'Connection timed out',
      });
      const { getByTestId } = renderScreen();
      expect(getByTestId('points-history-error').props.children).toBe('Connection timed out');
    });
  });
});

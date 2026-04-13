/**
 * LeaderboardScreen tests — cf-op6 / cm-abu
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LeaderboardScreen } from '../LeaderboardScreen';
import type { LeaderboardEntry } from '@/hooks/useLeaderboard';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { getTierForPoints } from '@/data/loyaltyTiers';

const mockRefresh = jest.fn();
const mockSetPeriod = jest.fn();

const ENTRIES: LeaderboardEntry[] = [
  { memberId: 'm1', displayName: 'Alice', points: 2500, tier: getTierForPoints(2500), rank: 1 },
  { memberId: 'm2', displayName: 'Bob', points: 800, tier: getTierForPoints(800), rank: 2 },
  { memberId: 'm3', displayName: 'Carol', points: 200, tier: getTierForPoints(200), rank: 3 },
];

let mockHookState = {
  entries: ENTRIES,
  currentUserRank: 2,
  period: 'allTime' as 'allTime' | 'weekly',
  loading: false,
  error: null as string | null,
  refresh: mockRefresh,
  setPeriod: mockSetPeriod,
};

jest.mock('@/hooks/useLeaderboard', () => ({
  useLeaderboard: () => mockHookState,
}));

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRefresh.mockResolvedValue(undefined);
  mockHookState = {
    entries: ENTRIES,
    currentUserRank: 2,
    period: 'allTime',
    loading: false,
    error: null,
    refresh: mockRefresh,
    setPeriod: mockSetPeriod,
  };
});

describe('LeaderboardScreen', () => {
  describe('loading state', () => {
    it('renders skeleton when loading=true', () => {
      mockHookState = { ...mockHookState, entries: [], loading: true };
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('leaderboard-loading')).toBeTruthy();
    });

    it('renders content (list) when loading=false', () => {
      mockHookState = { ...mockHookState, loading: false };
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('leaderboard-list')).toBeTruthy();
    });

    it('shows activity indicator while loading', () => {
      mockHookState = { ...mockHookState, entries: [], loading: true };
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('leaderboard-loading')).toBeTruthy();
    });

    it('hides list while loading', () => {
      mockHookState = { ...mockHookState, entries: [], loading: true };
      const { queryByTestId } = wrap(<LeaderboardScreen />);
      expect(queryByTestId('leaderboard-list')).toBeNull();
    });
  });

  describe('error state', () => {
    it('shows error message on failure', () => {
      mockHookState = { ...mockHookState, entries: [], error: 'Network error' };
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('leaderboard-error')).toBeTruthy();
    });

    it('shows retry button on error', () => {
      mockHookState = { ...mockHookState, entries: [], error: 'fail' };
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('leaderboard-retry')).toBeTruthy();
    });

    it('retry button calls refresh', () => {
      mockHookState = { ...mockHookState, entries: [], error: 'fail' };
      const { getByTestId } = wrap(<LeaderboardScreen />);
      fireEvent.press(getByTestId('leaderboard-retry'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state', () => {
    it('shows empty message when entries are empty and not loading', () => {
      mockHookState = { ...mockHookState, entries: [], error: null };
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('leaderboard-empty')).toBeTruthy();
    });
  });

  describe('list rendering', () => {
    it('renders leaderboard list container', () => {
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('leaderboard-list')).toBeTruthy();
    });

    it('renders all entries', () => {
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('leaderboard-row-1')).toBeTruthy();
      expect(getByTestId('leaderboard-row-2')).toBeTruthy();
      expect(getByTestId('leaderboard-row-3')).toBeTruthy();
    });

    it('shows current user rank footer when rank is available', () => {
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('leaderboard-your-rank')).toBeTruthy();
    });

    it('does not show rank footer when currentUserRank is null', () => {
      mockHookState = { ...mockHookState, currentUserRank: null as any };
      const { queryByTestId } = wrap(<LeaderboardScreen />);
      expect(queryByTestId('leaderboard-your-rank')).toBeNull();
    });

    it('passes isCurrentUser=true only to the row matching currentUserRank', () => {
      // currentUserRank = 2 (Bob) in default fixture
      const { getByTestId } = wrap(<LeaderboardScreen />);
      // Row 2 should have highlighted border style
      const row2 = getByTestId('leaderboard-row-2');
      const row1 = getByTestId('leaderboard-row-1');
      const styles2 = row2.props.style.flat ? row2.props.style.flat() : row2.props.style;
      const styles1 = row1.props.style.flat ? row1.props.style.flat() : row1.props.style;
      const hasBorder = (s: unknown[]) =>
        s.some((x) => x && typeof x === 'object' && 'borderWidth' in (x as object));
      expect(hasBorder(styles2)).toBe(true);
      expect(hasBorder(styles1)).toBe(false);
    });
  });

  describe('period toggle', () => {
    it('renders toggle with both options', () => {
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('toggle-allTime')).toBeTruthy();
      expect(getByTestId('toggle-weekly')).toBeTruthy();
    });

    it('pressing weekly toggle calls setPeriod', () => {
      const { getByTestId } = wrap(<LeaderboardScreen />);
      fireEvent.press(getByTestId('toggle-weekly'));
      expect(mockSetPeriod).toHaveBeenCalledWith('weekly');
    });

    it('pressing allTime toggle calls setPeriod', () => {
      mockHookState = { ...mockHookState, period: 'weekly' };
      const { getByTestId } = wrap(<LeaderboardScreen />);
      fireEvent.press(getByTestId('toggle-allTime'));
      expect(mockSetPeriod).toHaveBeenCalledWith('allTime');
    });
  });

  describe('pull to refresh', () => {
    it('FlatList has refreshControl', () => {
      const { getByTestId } = wrap(<LeaderboardScreen />);
      const list = getByTestId('leaderboard-list');
      expect(list.props.refreshControl).toBeTruthy();
    });
  });

  describe('null displayName fallback', () => {
    it('renders CF Member for null displayName', () => {
      mockHookState = {
        ...mockHookState,
        entries: [
          { memberId: 'm1', displayName: null, points: 500, tier: getTierForPoints(500), rank: 1 },
        ],
      };
      const { getAllByTestId } = wrap(<LeaderboardScreen />);
      const nicknames = getAllByTestId('leaderboard-row-nickname');
      expect(nicknames[0].props.children).toBe('CF Member');
    });
  });

  describe('accessibility', () => {
    it('screen has testID', () => {
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('leaderboard-screen')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = wrap(<LeaderboardScreen testID="custom-lb" />);
      expect(getByTestId('custom-lb')).toBeTruthy();
    });
  });

  // ── Edge cases (cm-abu) ───────────────────────────────────────────────────

  describe('boundary: single entry', () => {
    it('renders list with exactly one entry', () => {
      mockHookState = {
        ...mockHookState,
        entries: [{ memberId: 'm1', displayName: 'Solo', points: 500, tier: getTierForPoints(500), rank: 1 }],
        currentUserRank: 1,
      };
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('leaderboard-list')).toBeTruthy();
      expect(getByTestId('leaderboard-row-1')).toBeTruthy();
    });
  });

  describe('boundary: 0-point entry', () => {
    it('renders entry with 0 points (Trail Blazer tier)', () => {
      mockHookState = {
        ...mockHookState,
        entries: [
          { memberId: 'm1', displayName: 'Newbie', points: 0, tier: getTierForPoints(0), rank: 1 },
        ],
        currentUserRank: 1,
      };
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('leaderboard-row-1')).toBeTruthy();
    });
  });

  describe('error message content', () => {
    it('renders the exact error string from the hook', () => {
      mockHookState = { ...mockHookState, entries: [], error: 'Server unavailable' };
      const { getByText } = wrap(<LeaderboardScreen />);
      expect(getByText('Server unavailable')).toBeTruthy();
    });
  });

  describe('large rank in footer', () => {
    it('shows large rank number (e.g. 50) in your-rank footer', () => {
      mockHookState = { ...mockHookState, currentUserRank: 50 };
      const { getByTestId, getByText } = wrap(<LeaderboardScreen />);
      expect(getByTestId('leaderboard-your-rank')).toBeTruthy();
      expect(getByText('Your rank: #50')).toBeTruthy();
    });
  });

  describe('loading + error coexistence', () => {
    it('shows skeleton (not error) when both loading and error are set', () => {
      mockHookState = { ...mockHookState, entries: [], loading: true, error: 'stale error' };
      const { getByTestId, queryByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('leaderboard-loading')).toBeTruthy();
      expect(queryByTestId('leaderboard-error')).toBeNull();
    });
  });

  describe('period toggle active state', () => {
    it('weekly toggle is active when period=weekly', () => {
      mockHookState = { ...mockHookState, period: 'weekly' };
      const { getByTestId } = wrap(<LeaderboardScreen />);
      // Active button receives mountainBlue background — accessible via style prop
      const weeklyBtn = getByTestId('toggle-weekly');
      const flatStyles = Array.isArray(weeklyBtn.props.style)
        ? weeklyBtn.props.style.flat(Infinity)
        : [weeklyBtn.props.style];
      const hasBlue = flatStyles.some(
        (s: unknown) => s && typeof s === 'object' && 'backgroundColor' in (s as object),
      );
      expect(hasBlue).toBe(true);
    });
  });

  describe('Accessibility — period toggle + retry button (cm-b6v)', () => {
    it('all-time toggle has accessibilityLabel and role', () => {
      const { getByTestId } = wrap(<LeaderboardScreen />);
      const btn = getByTestId('toggle-allTime');
      expect(btn.props.accessibilityLabel).toBe('All time leaderboard');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('weekly toggle has accessibilityLabel and role', () => {
      const { getByTestId } = wrap(<LeaderboardScreen />);
      const btn = getByTestId('toggle-weekly');
      expect(btn.props.accessibilityLabel).toBe('Weekly leaderboard');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('all-time toggle is marked selected when period=allTime', () => {
      mockHookState = { ...mockHookState, period: 'allTime' };
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('toggle-allTime').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
      expect(getByTestId('toggle-weekly').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false }),
      );
    });

    it('weekly toggle is marked selected when period=weekly', () => {
      mockHookState = { ...mockHookState, period: 'weekly' };
      const { getByTestId } = wrap(<LeaderboardScreen />);
      expect(getByTestId('toggle-weekly').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
      expect(getByTestId('toggle-allTime').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false }),
      );
    });

    it('retry button has accessibilityLabel and role', () => {
      mockHookState = { ...mockHookState, entries: [], error: 'Network error', loading: false };
      const { getByTestId } = wrap(<LeaderboardScreen />);
      const btn = getByTestId('leaderboard-retry');
      expect(btn.props.accessibilityLabel).toBe('Retry loading leaderboard');
      expect(btn.props.accessibilityRole).toBe('button');
    });
  });
});

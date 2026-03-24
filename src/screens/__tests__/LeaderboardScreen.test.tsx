/**
 * LeaderboardScreen tests — cf-op6
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LeaderboardScreen } from '../LeaderboardScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockRefresh = jest.fn();
const mockSetPeriod = jest.fn();

const ENTRIES = [
  { memberId: 'm1', displayName: 'Alice', points: 2500, tier: 'gold', rank: 1 },
  { memberId: 'm2', displayName: 'Bob', points: 800, tier: 'silver', rank: 2 },
  { memberId: 'm3', displayName: 'Carol', points: 200, tier: 'bronze', rank: 3 },
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
        entries: [{ memberId: 'm1', displayName: null, points: 500, tier: 'bronze', rank: 1 }],
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
});

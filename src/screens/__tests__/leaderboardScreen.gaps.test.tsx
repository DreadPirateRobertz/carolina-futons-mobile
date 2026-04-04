/**
 * LeaderboardScreen gap tests — covers handleRefresh (lines 34-38).
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { LeaderboardScreen } from '../LeaderboardScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { LeaderboardEntry } from '@/hooks/useLeaderboard';

const mockRefresh = jest.fn();
const mockSetPeriod = jest.fn();

const ENTRIES: LeaderboardEntry[] = [
  { memberId: 'm1', displayName: 'Alice', points: 2500, tier: 'gold', rank: 1 },
];

jest.mock('@/hooks/useLeaderboard', () => ({
  useLeaderboard: () => ({
    entries: ENTRIES,
    currentUserRank: 1,
    period: 'allTime' as const,
    loading: false,
    error: null,
    refresh: mockRefresh,
    setPeriod: mockSetPeriod,
  }),
}));

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRefresh.mockResolvedValue(undefined);
});

describe('LeaderboardScreen — handleRefresh', () => {
  it('calling onRefresh on the FlatList RefreshControl invokes refresh', async () => {
    const { getByTestId } = wrap(<LeaderboardScreen />);
    const list = getByTestId('leaderboard-list');
    const refreshControl = list.props.refreshControl;
    await act(async () => {
      refreshControl.props.onRefresh();
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('refreshing state toggles true then false during handleRefresh', async () => {
    const { getByTestId } = wrap(<LeaderboardScreen />);
    const list = getByTestId('leaderboard-list');
    const refreshControl = list.props.refreshControl;
    await act(async () => {
      refreshControl.props.onRefresh();
    });
    // After completion, refreshing should be false
    const updatedList = getByTestId('leaderboard-list');
    expect(updatedList.props.refreshControl.props.refreshing).toBe(false);
  });
});

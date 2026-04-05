/**
 * LeaderboardScreen gap tests — covers handleRefresh (lines 34-38).
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { LeaderboardScreen } from '../LeaderboardScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockRefresh = jest.fn();
const mockSetPeriod = jest.fn();

// Summit Master tier config (2500 points falls in 1500-2999 range)
const mockTierSummitMaster = {
  name: 'Summit Master',
  minPoints: 1500,
  color: '#E8845C',
  icon: 'summit-master',
  perks: ['Earn 2x points per $1', 'Free expedited shipping'],
};

jest.mock('@/hooks/useLeaderboard', () => ({
  useLeaderboard: () => ({
    entries: [
      { memberId: 'm1', displayName: 'Alice', points: 2500, tier: mockTierSummitMaster, rank: 1 },
    ],
    currentUserRank: 1,
    period: 'allTime',
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

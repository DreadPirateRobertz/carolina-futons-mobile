/**
 * LeaderboardScreen — cm-bt2 edge case coverage.
 *
 * Audits: skeleton/loading mutual exclusivity, error/empty mutual exclusivity,
 * period toggle visibility during loading, and SkeletonGrid row wiring.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LeaderboardScreen } from '../LeaderboardScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { LeaderboardEntry } from '@/hooks/useLeaderboard';
import { getTierForPoints } from '@/data/loyaltyTiers';

const mockRefresh = jest.fn();
const mockSetPeriod = jest.fn();

const ENTRIES: LeaderboardEntry[] = [
  { memberId: 'm1', displayName: 'Alice', points: 2500, tier: getTierForPoints(2500), rank: 1 },
  { memberId: 'm2', displayName: 'Bob', points: 800, tier: getTierForPoints(800), rank: 2 },
];

let mockState = {
  entries: [] as LeaderboardEntry[],
  currentUserRank: null as number | null,
  period: 'allTime' as 'allTime' | 'weekly',
  loading: false,
  error: null as string | null,
  refresh: mockRefresh,
  setPeriod: mockSetPeriod,
};

jest.mock('@/hooks/useLeaderboard', () => ({
  useLeaderboard: () => mockState,
}));

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRefresh.mockResolvedValue(undefined);
  mockState = {
    entries: [],
    currentUserRank: null,
    period: 'allTime',
    loading: false,
    error: null,
    refresh: mockRefresh,
    setPeriod: mockSetPeriod,
  };
});

describe('LeaderboardScreen — skeleton/loading mutual exclusivity (cm-bt2)', () => {
  it('loading=true does NOT show empty state', () => {
    mockState = { ...mockState, loading: true };
    const { queryByTestId } = wrap(<LeaderboardScreen />);
    expect(queryByTestId('leaderboard-empty')).toBeNull();
  });

  it('loading=true does NOT show error state', () => {
    mockState = { ...mockState, loading: true, error: 'Network error' };
    const { queryByTestId } = wrap(<LeaderboardScreen />);
    expect(queryByTestId('leaderboard-error')).toBeNull();
  });

  it('loading=true does NOT show the list', () => {
    mockState = { ...mockState, loading: true, entries: ENTRIES };
    const { queryByTestId } = wrap(<LeaderboardScreen />);
    expect(queryByTestId('leaderboard-list')).toBeNull();
  });

  it('loading=true DOES show the period toggle (always visible)', () => {
    mockState = { ...mockState, loading: true };
    const { getByTestId } = wrap(<LeaderboardScreen />);
    expect(getByTestId('toggle-allTime')).toBeTruthy();
    expect(getByTestId('toggle-weekly')).toBeTruthy();
  });

  it('period toggle is pressable during loading', () => {
    mockState = { ...mockState, loading: true };
    const { getByTestId } = wrap(<LeaderboardScreen />);
    fireEvent.press(getByTestId('toggle-weekly'));
    expect(mockSetPeriod).toHaveBeenCalledWith('weekly');
  });
});

describe('LeaderboardScreen — error state mutual exclusivity (cm-bt2)', () => {
  beforeEach(() => {
    mockState = { ...mockState, loading: false, error: 'Server error', entries: ENTRIES };
  });

  it('error state does NOT show the list', () => {
    const { queryByTestId } = wrap(<LeaderboardScreen />);
    expect(queryByTestId('leaderboard-list')).toBeNull();
  });

  it('error state does NOT show the empty view', () => {
    const { queryByTestId } = wrap(<LeaderboardScreen />);
    expect(queryByTestId('leaderboard-empty')).toBeNull();
  });

  it('error state does NOT show the skeleton', () => {
    const { queryByTestId } = wrap(<LeaderboardScreen />);
    expect(queryByTestId('leaderboard-loading')).toBeNull();
  });
});

describe('LeaderboardScreen — empty state mutual exclusivity (cm-bt2)', () => {
  beforeEach(() => {
    mockState = { ...mockState, loading: false, error: null, entries: [] };
  });

  it('empty state does NOT show the list', () => {
    const { queryByTestId } = wrap(<LeaderboardScreen />);
    expect(queryByTestId('leaderboard-list')).toBeNull();
  });

  it('empty state does NOT show the error view', () => {
    const { queryByTestId } = wrap(<LeaderboardScreen />);
    expect(queryByTestId('leaderboard-error')).toBeNull();
  });

  it('empty state does NOT show the skeleton', () => {
    const { queryByTestId } = wrap(<LeaderboardScreen />);
    expect(queryByTestId('leaderboard-loading')).toBeNull();
  });
});

describe('LeaderboardScreen — skeleton wiring (cm-bt2)', () => {
  it('skeleton testID is leaderboard-loading', () => {
    mockState = { ...mockState, loading: true };
    const { getByTestId } = wrap(<LeaderboardScreen />);
    expect(getByTestId('leaderboard-loading')).toBeTruthy();
  });

  it('switching period while skeleton is shown calls setPeriod', () => {
    mockState = { ...mockState, loading: true, period: 'allTime' };
    const { getByTestId } = wrap(<LeaderboardScreen />);
    fireEvent.press(getByTestId('toggle-weekly'));
    expect(mockSetPeriod).toHaveBeenCalledWith('weekly');
  });
});

describe('LeaderboardScreen — list state mutual exclusivity (cm-bt2)', () => {
  beforeEach(() => {
    mockState = { ...mockState, loading: false, error: null, entries: ENTRIES };
  });

  it('list state does NOT show the skeleton', () => {
    const { queryByTestId } = wrap(<LeaderboardScreen />);
    expect(queryByTestId('leaderboard-loading')).toBeNull();
  });

  it('list state does NOT show the empty view', () => {
    const { queryByTestId } = wrap(<LeaderboardScreen />);
    expect(queryByTestId('leaderboard-empty')).toBeNull();
  });

  it('list state does NOT show the error view', () => {
    const { queryByTestId } = wrap(<LeaderboardScreen />);
    expect(queryByTestId('leaderboard-error')).toBeNull();
  });
});

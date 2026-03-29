/**
 * Tests for GameProfileCard — cf-zlp
 * TDD: written before implementation.
 *
 * Covers: populated state, individual loading skeletons, zero-streak hides chip,
 * tap-streak opens bottom sheet (startDate + next milestone), tap-rank callback,
 * tap-points callback, sheet dismiss.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GameProfileCard } from '../GameProfileCard';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mock ──────────────────────────────────────────────────────────────────────

const mockUseGameProfile = jest.fn();
jest.mock('@/hooks/useGameProfile', () => ({
  useGameProfile: () => mockUseGameProfile(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const POPULATED = {
  streakDays: 14,
  streakStartDate: '2026-03-09',
  nextMilestoneDays: 30,
  rank: 5,
  totalPoints: 1250,
  tier: 'silver' as const,
  streakLoading: false,
  rankLoading: false,
  pointsLoading: false,
  error: null,
};

const ZERO_STREAK = { ...POPULATED, streakDays: 0 };

const STREAK_LOADING = { ...POPULATED, streakDays: 0, streakLoading: true };
const RANK_LOADING = { ...POPULATED, rank: null, rankLoading: true };
const POINTS_LOADING = { ...POPULATED, totalPoints: 0, pointsLoading: true };

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const onNavigateToLeaderboard = jest.fn();
const onNavigateToPointsHistory = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockUseGameProfile.mockReturnValue(POPULATED);
});

// ── Root container ────────────────────────────────────────────────────────────

describe('GameProfileCard — root', () => {
  it('renders game-profile-card testID', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(getByTestId('game-profile-card')).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = wrap(<GameProfileCard testID="my-card" />);
    expect(getByTestId('my-card')).toBeTruthy();
  });
});

// ── Streak chip ───────────────────────────────────────────────────────────────

describe('Streak chip', () => {
  it('renders streak-chip when streak > 0', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(getByTestId('streak-chip')).toBeTruthy();
  });

  it('shows streak day count', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(getByTestId('streak-days').props.children).toBe(14);
  });

  it('hides streak-chip when streakDays = 0', () => {
    mockUseGameProfile.mockReturnValue(ZERO_STREAK);
    const { queryByTestId } = wrap(<GameProfileCard />);
    expect(queryByTestId('streak-chip')).toBeNull();
  });

  it('shows streak-loading skeleton while streak loads', () => {
    mockUseGameProfile.mockReturnValue(STREAK_LOADING);
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(getByTestId('streak-loading')).toBeTruthy();
  });

  it('hides streak-chip while streak loads', () => {
    mockUseGameProfile.mockReturnValue(STREAK_LOADING);
    const { queryByTestId } = wrap(<GameProfileCard />);
    expect(queryByTestId('streak-chip')).toBeNull();
  });
});

// ── Rank chip ─────────────────────────────────────────────────────────────────

describe('Rank chip', () => {
  it('renders rank-chip', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(getByTestId('rank-chip')).toBeTruthy();
  });

  it('shows rank value', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(getByTestId('rank-value').props.children).toBe(5);
  });

  it('shows rank-loading skeleton while rank loads', () => {
    mockUseGameProfile.mockReturnValue(RANK_LOADING);
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(getByTestId('rank-loading')).toBeTruthy();
  });

  it('hides rank-value while rank loads', () => {
    mockUseGameProfile.mockReturnValue(RANK_LOADING);
    const { queryByTestId } = wrap(<GameProfileCard />);
    expect(queryByTestId('rank-value')).toBeNull();
  });
});

// ── Points chip ───────────────────────────────────────────────────────────────

describe('Points chip', () => {
  it('renders points-chip', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(getByTestId('points-chip')).toBeTruthy();
  });

  it('shows total points value', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(getByTestId('points-value').props.children).toBe(1250);
  });

  it('shows points-loading skeleton while points loads', () => {
    mockUseGameProfile.mockReturnValue(POINTS_LOADING);
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(getByTestId('points-loading')).toBeTruthy();
  });

  it('hides points-value while points loads', () => {
    mockUseGameProfile.mockReturnValue(POINTS_LOADING);
    const { queryByTestId } = wrap(<GameProfileCard />);
    expect(queryByTestId('points-value')).toBeNull();
  });
});

// ── Tier badge ────────────────────────────────────────────────────────────────

describe('Tier badge', () => {
  it('renders tier-badge', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(getByTestId('tier-badge')).toBeTruthy();
  });
});

// ── Streak bottom sheet ───────────────────────────────────────────────────────

describe('Streak bottom sheet', () => {
  it('sheet is closed initially', () => {
    const { queryByTestId } = wrap(<GameProfileCard />);
    expect(queryByTestId('streak-sheet')).toBeNull();
  });

  it('tapping streak-chip opens streak-sheet', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    fireEvent.press(getByTestId('streak-chip'));
    expect(getByTestId('streak-sheet')).toBeTruthy();
  });

  it('sheet shows streak start date', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    fireEvent.press(getByTestId('streak-chip'));
    expect(getByTestId('streak-sheet-start-date')).toBeTruthy();
  });

  it('sheet shows next milestone text', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    fireEvent.press(getByTestId('streak-chip'));
    expect(getByTestId('streak-sheet-next-milestone')).toBeTruthy();
  });

  it('sheet close button dismisses sheet', () => {
    const { getByTestId, queryByTestId } = wrap(<GameProfileCard />);
    fireEvent.press(getByTestId('streak-chip'));
    fireEvent.press(getByTestId('streak-sheet-close'));
    expect(queryByTestId('streak-sheet')).toBeNull();
  });
});

// ── Navigation callbacks ──────────────────────────────────────────────────────

describe('Navigation callbacks', () => {
  it('tapping rank-chip calls onNavigateToLeaderboard', () => {
    const { getByTestId } = wrap(
      <GameProfileCard onNavigateToLeaderboard={onNavigateToLeaderboard} />,
    );
    fireEvent.press(getByTestId('rank-chip'));
    expect(onNavigateToLeaderboard).toHaveBeenCalledTimes(1);
  });

  it('tapping points-chip calls onNavigateToPointsHistory', () => {
    const { getByTestId } = wrap(
      <GameProfileCard onNavigateToPointsHistory={onNavigateToPointsHistory} />,
    );
    fireEvent.press(getByTestId('points-chip'));
    expect(onNavigateToPointsHistory).toHaveBeenCalledTimes(1);
  });

  it('tapping rank-chip is safe with no callback', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(() => fireEvent.press(getByTestId('rank-chip'))).not.toThrow();
  });

  it('tapping points-chip is safe with no callback', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(() => fireEvent.press(getByTestId('points-chip'))).not.toThrow();
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────

describe('Accessibility', () => {
  it('streak chip has descriptive accessibilityLabel', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    const chip = getByTestId('streak-chip');
    expect(chip.props.accessibilityLabel).toContain('14');
    expect(chip.props.accessibilityLabel).toContain('streak');
  });

  it('streak chip has accessibilityRole button', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(getByTestId('streak-chip').props.accessibilityRole).toBe('button');
  });

  it('rank chip has descriptive accessibilityLabel', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    const chip = getByTestId('rank-chip');
    expect(chip.props.accessibilityLabel).toContain('5');
  });

  it('rank chip has accessibilityRole button', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(getByTestId('rank-chip').props.accessibilityRole).toBe('button');
  });

  it('points chip has descriptive accessibilityLabel', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    const chip = getByTestId('points-chip');
    expect(chip.props.accessibilityLabel).toContain('1250');
  });

  it('points chip has accessibilityRole button', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    expect(getByTestId('points-chip').props.accessibilityRole).toBe('button');
  });

  it('close button in streak sheet has accessibilityLabel', () => {
    const { getByTestId } = wrap(<GameProfileCard />);
    fireEvent.press(getByTestId('streak-chip'));
    const closeBtn = getByTestId('streak-sheet-close');
    expect(closeBtn.props.accessibilityLabel).toBeTruthy();
    expect(closeBtn.props.accessibilityRole).toBe('button');
  });
});

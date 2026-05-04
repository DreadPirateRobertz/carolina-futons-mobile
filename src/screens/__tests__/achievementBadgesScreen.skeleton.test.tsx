/**
 * AchievementBadgesScreen — cm-bue skeleton migration tests.
 *
 * TDD: written BEFORE skeleton implementation.
 * Verifies ActivityIndicator is replaced by SkeletonBox/Shimmer grid matching
 * the 3-column badge layout (6 skeleton cards).
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { AchievementBadgesScreen } from '../AchievementBadgesScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockUseAchievements = jest.fn();
jest.mock('@/hooks/useAchievements', () => ({
  useAchievements: () => mockUseAchievements(),
}));

const LOADING_STATE = { achievements: [], loading: true, error: null };
const ERROR_STATE = { achievements: [], loading: false, error: 'Fetch failed' };
const LOADED_STATE = { achievements: [], loading: false, error: null };

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAchievements.mockReturnValue(LOADED_STATE);
});

// ── Skeleton replaces ActivityIndicator ──────────────────────────────────────

describe('AchievementBadgesScreen — skeleton loading (cm-bue)', () => {
  it('shows achievements-skeleton wrapper while loading', () => {
    mockUseAchievements.mockReturnValue(LOADING_STATE);
    const { getByTestId } = wrap(<AchievementBadgesScreen />);
    expect(getByTestId('achievements-skeleton')).toBeTruthy();
  });

  it('does NOT show ActivityIndicator achievements-loading while loading', () => {
    mockUseAchievements.mockReturnValue(LOADING_STATE);
    const { queryByTestId } = wrap(<AchievementBadgesScreen />);
    expect(queryByTestId('achievements-loading')).toBeNull();
  });

  it('shows 6 skeleton badge cards while loading', () => {
    mockUseAchievements.mockReturnValue(LOADING_STATE);
    const { getByTestId } = wrap(<AchievementBadgesScreen />);
    for (let i = 0; i < 6; i++) {
      expect(getByTestId(`badge-skeleton-${i}`)).toBeTruthy();
    }
  });

  it('skeleton is hidden when not loading', () => {
    mockUseAchievements.mockReturnValue(LOADED_STATE);
    const { queryByTestId } = wrap(<AchievementBadgesScreen />);
    expect(queryByTestId('achievements-skeleton')).toBeNull();
  });

  it('skeleton is hidden on error', () => {
    mockUseAchievements.mockReturnValue(ERROR_STATE);
    const { queryByTestId } = wrap(<AchievementBadgesScreen />);
    expect(queryByTestId('achievements-skeleton')).toBeNull();
  });
});

// ── Screen accepts testID prop ────────────────────────────────────────────────

describe('AchievementBadgesScreen — testID prop (cm-bue)', () => {
  it('accepts custom testID on loading state root', () => {
    mockUseAchievements.mockReturnValue(LOADING_STATE);
    const { getByTestId } = wrap(<AchievementBadgesScreen testID="my-achievements" />);
    expect(getByTestId('my-achievements')).toBeTruthy();
  });

  it('accepts custom testID on loaded state root', () => {
    mockUseAchievements.mockReturnValue(LOADED_STATE);
    const { getByTestId } = wrap(<AchievementBadgesScreen testID="my-achievements" />);
    expect(getByTestId('my-achievements')).toBeTruthy();
  });

  it('accepts custom testID on error state root', () => {
    mockUseAchievements.mockReturnValue(ERROR_STATE);
    const { getByTestId } = wrap(<AchievementBadgesScreen testID="my-achievements" />);
    expect(getByTestId('my-achievements')).toBeTruthy();
  });

  it('defaults to achievements-screen when no testID provided', () => {
    const { getByTestId } = wrap(<AchievementBadgesScreen />);
    expect(getByTestId('achievements-screen')).toBeTruthy();
  });
});

// ── Mutual exclusivity ────────────────────────────────────────────────────────

describe('AchievementBadgesScreen — skeleton state exclusivity (cm-bue)', () => {
  it('skeleton loading does NOT show badge-grid', () => {
    mockUseAchievements.mockReturnValue(LOADING_STATE);
    const { queryByTestId } = wrap(<AchievementBadgesScreen />);
    expect(queryByTestId('badge-grid')).toBeNull();
  });

  it('skeleton loading does NOT show achievements-error', () => {
    mockUseAchievements.mockReturnValue({ ...LOADING_STATE, error: 'stale' });
    const { queryByTestId } = wrap(<AchievementBadgesScreen />);
    expect(queryByTestId('achievements-error')).toBeNull();
  });
});

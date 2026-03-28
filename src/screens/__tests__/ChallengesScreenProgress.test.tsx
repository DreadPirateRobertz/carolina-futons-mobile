/**
 * @module ChallengesScreenProgress.test
 *
 * Tests for the progress summary hero section added to ChallengesScreen.
 * Verifies the progress summary card displays member stats from useChallengeProgress.
 *
 * hq-elfso
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { ChallengesScreen } from '../ChallengesScreen';
import type { GroupedChallenges, CatalogChallenge } from '@/hooks/useChallengeCatalog';

// ── Helpers ──────────────────────────────────────────────────────────

const FUTURE = '2027-01-01T00:00:00Z';

function makeChallenge(overrides: Partial<CatalogChallenge> = {}): CatalogChallenge {
  return {
    id: 'ch-1',
    title: 'Spring Refresh',
    description: 'Browse 5 new arrivals',
    goal: 5,
    unit: 'products',
    pointReward: 500,
    expiresAt: FUTURE,
    progress: 3,
    progressRatio: 0.6,
    completed: false,
    isExpired: false,
    ...overrides,
  };
}

const emptyGrouped: GroupedChallenges = {
  inProgress: [],
  available: [],
  completed: [],
  expired: [],
};

// ── Mock hooks ──────────────────────────────────────────────────────

const mockRefresh = jest.fn();
const mockCatalog = jest.fn(() => ({
  challenges: [] as CatalogChallenge[],
  grouped: emptyGrouped,
  loading: false,
  error: null as string | null,
  refresh: mockRefresh,
}));

jest.mock('@/hooks/useChallengeCatalog', () => ({
  useChallengeCatalog: () => mockCatalog(),
}));

const mockProgressRefresh = jest.fn();
const mockProgress = jest.fn(() => ({
  progressItems: [],
  summary: { totalPointsEarned: 0, completedCount: 0, activeCount: 0 },
  loading: false,
  error: null as string | null,
  refresh: mockProgressRefresh,
}));

jest.mock('@/hooks/useChallengeProgress', () => ({
  useChallengeProgress: () => mockProgress(),
}));

function renderScreen() {
  return render(
    <ThemeProvider>
      <ChallengesScreen />
    </ThemeProvider>,
  );
}

// ── Tests ───────────────────────────────────────────────────────────

describe('ChallengesScreen — Progress Summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCatalog.mockReturnValue({
      challenges: [makeChallenge()],
      grouped: { ...emptyGrouped, inProgress: [makeChallenge()] },
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
    mockProgress.mockReturnValue({
      progressItems: [],
      summary: { totalPointsEarned: 750, completedCount: 3, activeCount: 2 },
      loading: false,
      error: null,
      refresh: mockProgressRefresh,
    });
  });

  it('renders progress summary section', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('challenge-progress-summary')).toBeTruthy();
  });

  it('displays total points earned', () => {
    const { getByTestId } = renderScreen();
    const el = getByTestId('progress-total-points');
    expect(el.props.children).toMatch(/750/);
  });

  it('displays completed challenge count', () => {
    const { getByTestId } = renderScreen();
    const el = getByTestId('progress-completed-count');
    expect(el.props.children).toMatch(/3/);
  });

  it('displays active challenge count', () => {
    const { getByTestId } = renderScreen();
    const el = getByTestId('progress-active-count');
    expect(el.props.children).toMatch(/2/);
  });

  it('hides progress summary when both hooks are loading', () => {
    mockCatalog.mockReturnValue({
      challenges: [],
      grouped: emptyGrouped,
      loading: true,
      error: null,
      refresh: mockRefresh,
    });
    mockProgress.mockReturnValue({
      progressItems: [],
      summary: { totalPointsEarned: 0, completedCount: 0, activeCount: 0 },
      loading: true,
      error: null,
      refresh: mockProgressRefresh,
    });
    const { getByTestId, queryByTestId } = renderScreen();
    expect(getByTestId('challenges-loading')).toBeTruthy();
    expect(queryByTestId('challenge-progress-summary')).toBeNull();
  });

  it('shows progress summary even when progress hook has error (graceful degradation)', () => {
    mockProgress.mockReturnValue({
      progressItems: [],
      summary: { totalPointsEarned: 0, completedCount: 0, activeCount: 0 },
      loading: false,
      error: 'Unable to load challenge progress.',
      refresh: mockProgressRefresh,
    });
    const { getByTestId } = renderScreen();
    // Summary still renders with zero values — doesn't block the catalog
    expect(getByTestId('challenge-progress-summary')).toBeTruthy();
  });

  it('shows zero values when no progress data', () => {
    mockProgress.mockReturnValue({
      progressItems: [],
      summary: { totalPointsEarned: 0, completedCount: 0, activeCount: 0 },
      loading: false,
      error: null,
      refresh: mockProgressRefresh,
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('progress-total-points').props.children).toMatch(/0/);
  });

  it('does not show progress summary on catalog error screen', () => {
    mockCatalog.mockReturnValue({
      challenges: [],
      grouped: emptyGrouped,
      loading: false,
      error: 'Failed to load',
      refresh: mockRefresh,
    });
    const { queryByTestId, getByTestId } = renderScreen();
    expect(getByTestId('challenges-error')).toBeTruthy();
    expect(queryByTestId('challenge-progress-summary')).toBeNull();
  });
});

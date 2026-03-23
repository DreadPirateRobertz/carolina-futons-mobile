/**
 * @module ChallengesScreen.test
 *
 * TDD tests for ChallengesScreen.
 * cf-rv9 / Phase 7 gamification
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { ChallengesScreen } from '../ChallengesScreen';
import type { CatalogChallenge, GroupedChallenges } from '@/hooks/useChallengeCatalog';

// ── Helpers ──────────────────────────────────────────────────────────────────

const FUTURE = '2027-01-01T00:00:00Z';
const PAST = '2020-01-01T00:00:00Z';

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

// ── Mock useChallengeCatalog ─────────────────────────────────────────────────

const mockRefresh = jest.fn();
jest.mock('@/hooks/useChallengeCatalog', () => ({
  useChallengeCatalog: jest.fn(() => ({
    challenges: [],
    grouped: emptyGrouped,
    loading: false,
    error: null,
    refresh: mockRefresh,
  })),
}));

import { useChallengeCatalog } from '@/hooks/useChallengeCatalog';
const mockHook = useChallengeCatalog as jest.Mock;

function renderScreen() {
  return render(
    <ThemeProvider>
      <ChallengesScreen />
    </ThemeProvider>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ChallengesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHook.mockReturnValue({
      challenges: [],
      grouped: emptyGrouped,
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
  });

  it('renders without crashing', () => {
    expect(() => renderScreen()).not.toThrow();
  });

  it('shows loading skeleton when loading=true', () => {
    mockHook.mockReturnValue({
      challenges: [],
      grouped: emptyGrouped,
      loading: true,
      error: null,
      refresh: mockRefresh,
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('challenges-loading')).toBeTruthy();
  });

  it('shows error message when error is set', () => {
    mockHook.mockReturnValue({
      challenges: [],
      grouped: emptyGrouped,
      loading: false,
      error: 'Failed to load',
      refresh: mockRefresh,
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('challenges-error')).toBeTruthy();
  });

  it('shows "In Progress" section header when inProgress is non-empty', () => {
    mockHook.mockReturnValue({
      challenges: [makeChallenge()],
      grouped: { ...emptyGrouped, inProgress: [makeChallenge()] },
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('section-in-progress')).toBeTruthy();
  });

  it('shows "Available" section header when available is non-empty', () => {
    const ch = makeChallenge({ id: 'ch-2', progress: 0, progressRatio: 0 });
    mockHook.mockReturnValue({
      challenges: [ch],
      grouped: { ...emptyGrouped, available: [ch] },
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('section-available')).toBeTruthy();
  });

  it('shows "Completed" section header when completed is non-empty', () => {
    const ch = makeChallenge({ id: 'ch-3', completed: true, progressRatio: 1 });
    mockHook.mockReturnValue({
      challenges: [ch],
      grouped: { ...emptyGrouped, completed: [ch] },
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('section-completed')).toBeTruthy();
  });

  it('renders a challenge row with testID', () => {
    const ch = makeChallenge();
    mockHook.mockReturnValue({
      challenges: [ch],
      grouped: { ...emptyGrouped, inProgress: [ch] },
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('challenge-row-ch-1')).toBeTruthy();
  });

  it('shows progress bar on in-progress challenge', () => {
    const ch = makeChallenge();
    mockHook.mockReturnValue({
      challenges: [ch],
      grouped: { ...emptyGrouped, inProgress: [ch] },
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('challenge-progress-ch-1')).toBeTruthy();
  });

  it('shows point reward on each row', () => {
    const ch = makeChallenge();
    mockHook.mockReturnValue({
      challenges: [ch],
      grouped: { ...emptyGrouped, inProgress: [ch] },
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
    const { getByTestId } = renderScreen();
    const reward = getByTestId('challenge-reward-ch-1');
    expect(reward.props.children).toMatch(/500/);
  });

  it('shows checkmark on completed challenge row', () => {
    const ch = makeChallenge({ id: 'ch-3', completed: true, progressRatio: 1 });
    mockHook.mockReturnValue({
      challenges: [ch],
      grouped: { ...emptyGrouped, completed: [ch] },
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('challenge-completed-badge-ch-3')).toBeTruthy();
  });

  it('shows expired badge on expired challenge row', () => {
    const ch = makeChallenge({ id: 'ch-4', isExpired: true, expiresAt: PAST });
    mockHook.mockReturnValue({
      challenges: [ch],
      grouped: { ...emptyGrouped, expired: [ch] },
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('challenge-expired-badge-ch-4')).toBeTruthy();
  });

  it('shows all-empty state when all groups are empty', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('challenges-empty')).toBeTruthy();
  });
});

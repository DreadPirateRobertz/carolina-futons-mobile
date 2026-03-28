/**
 * ChallengesScreen cross-rig event bus tests — cf-87tn
 *
 * Verifies that emitChallengeStarted fires for each in-progress challenge
 * when the screen mounts with loaded data.
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { ChallengesScreen, __resetChallengeEmitState } from '../ChallengesScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { CatalogChallenge, GroupedChallenges } from '@/hooks/useChallengeCatalog';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockEmitChallengeStarted = jest.fn(() => Promise.resolve({ success: true }));
jest.mock('@/services/crossRigEventBus', () => ({
  emitChallengeStarted: (...args: any) => mockEmitChallengeStarted(...args),
}));

const mockWixClient = { callFunction: jest.fn(() => Promise.resolve({ success: true })) };
jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => mockWixClient,
}));

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

const mockHook = jest.fn();
jest.mock('@/hooks/useChallengeCatalog', () => ({
  useChallengeCatalog: () => mockHook(),
}));

jest.mock('@/hooks/useChallengeProgress', () => ({
  useChallengeProgress: () => ({
    progressItems: [],
    summary: { totalPointsEarned: 0, completedCount: 0, activeCount: 0 },
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

const mockCaptureException = jest.fn();
jest.mock('@/services/crashReporting', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

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

const DEFAULT_LOYALTY = {
  points: 500,
  tier: 'silver' as const,
  nextTier: 'gold' as const,
  pointsToNext: 1000,
  progress: 25,
  loading: false,
  error: null,
  refreshPoints: jest.fn(),
};

function renderScreen() {
  return render(
    <ThemeProvider>
      <ChallengesScreen />
    </ThemeProvider>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ChallengesScreen — crossRigEventBus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetChallengeEmitState();
    mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
  });

  it('calls emitChallengeStarted for each in-progress challenge on mount', async () => {
    const ch1 = makeChallenge({ id: 'ch-1' });
    const ch2 = makeChallenge({ id: 'ch-2', title: 'Summer Sale' });
    mockHook.mockReturnValue({
      grouped: { ...emptyGrouped, inProgress: [ch1, ch2] },
      loading: false,
      error: null,
    });
    renderScreen();
    await new Promise((r) => setTimeout(r, 10));
    expect(mockEmitChallengeStarted).toHaveBeenCalledTimes(2);
    expect(mockEmitChallengeStarted).toHaveBeenCalledWith(
      mockWixClient,
      expect.objectContaining({ challengeId: 'ch-1' }),
    );
    expect(mockEmitChallengeStarted).toHaveBeenCalledWith(
      mockWixClient,
      expect.objectContaining({ challengeId: 'ch-2' }),
    );
  });

  it('does not call emitChallengeStarted when no in-progress challenges', async () => {
    mockHook.mockReturnValue({
      grouped: emptyGrouped,
      loading: false,
      error: null,
    });
    renderScreen();
    await Promise.resolve();
    expect(mockEmitChallengeStarted).not.toHaveBeenCalled();
  });

  it('does not call emitChallengeStarted while loading', async () => {
    mockHook.mockReturnValue({
      grouped: { ...emptyGrouped, inProgress: [makeChallenge()] },
      loading: true,
      error: null,
    });
    renderScreen();
    await Promise.resolve();
    expect(mockEmitChallengeStarted).not.toHaveBeenCalled();
  });

  it('passes currentPoints from loyalty to emitChallengeStarted', async () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 850 });
    mockHook.mockReturnValue({
      grouped: { ...emptyGrouped, inProgress: [makeChallenge({ id: 'ch-abc' })] },
      loading: false,
      error: null,
    });
    renderScreen();
    await new Promise((r) => setTimeout(r, 10));
    expect(mockEmitChallengeStarted).toHaveBeenCalledWith(
      mockWixClient,
      expect.objectContaining({ challengeId: 'ch-abc', currentPoints: 850 }),
    );
  });

  it('does not re-emit for the same challenge on remount (module-level dedup)', async () => {
    const ch = makeChallenge({ id: 'ch-dedup' });
    mockHook.mockReturnValue({
      grouped: { ...emptyGrouped, inProgress: [ch] },
      loading: false,
      error: null,
    });

    const { unmount } = renderScreen();
    await new Promise((r) => setTimeout(r, 10));
    expect(mockEmitChallengeStarted).toHaveBeenCalledTimes(1);

    unmount();
    mockEmitChallengeStarted.mockClear();

    renderScreen();
    await new Promise((r) => setTimeout(r, 10));
    expect(mockEmitChallengeStarted).not.toHaveBeenCalled();
  });

  it('captures exception when emitChallengeStarted rejects', async () => {
    mockEmitChallengeStarted.mockRejectedValueOnce(new Error('event bus down'));
    mockHook.mockReturnValue({
      grouped: { ...emptyGrouped, inProgress: [makeChallenge({ id: 'ch-fail' })] },
      loading: false,
      error: null,
    });
    renderScreen();
    await new Promise((r) => setTimeout(r, 10));
    expect(mockCaptureException).toHaveBeenCalled();
  });

});

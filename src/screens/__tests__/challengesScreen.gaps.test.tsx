/**
 * ChallengesScreen gap coverage — cm-ajd
 *
 * Covers outer catch block (ChallengesScreen.tsx L287) where
 * getWixClientSingleton() throws synchronously. The existing crossRig
 * suite exercises async rejection paths; sync-throw was uncovered.
 */

import React from 'react';
import { act, render } from '@testing-library/react-native';
import { ChallengesScreen, __resetChallengeEmitState } from '../ChallengesScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { CatalogChallenge, GroupedChallenges } from '@/hooks/useChallengeCatalog';

jest.mock('@/services/crossRigEventBus', () => ({
  emitChallengeStarted: jest.fn(() => Promise.resolve({ success: true })),
}));
const mockEmitChallengeStarted = jest.requireMock('@/services/crossRigEventBus')
  .emitChallengeStarted as jest.Mock;

const mockGetWixClient = jest.fn();
jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => mockGetWixClient(),
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

function renderScreen() {
  return render(
    <ThemeProvider>
      <ChallengesScreen />
    </ThemeProvider>,
  );
}

describe('ChallengesScreen — sync-throw resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetChallengeEmitState();
    mockUseLoyalty.mockReturnValue({
      points: 500,
      tier: { name: 'Trail Blazer' },
      nextTier: null,
      pointsToNext: 0,
      progress: 0,
      loading: false,
      error: null,
      refreshPoints: jest.fn(),
    });
  });

  it('captures exception when getWixClientSingleton throws synchronously on mount', async () => {
    const ch = makeChallenge();
    mockHook.mockReturnValue({
      challenges: [ch],
      grouped: { ...emptyGrouped, inProgress: [ch] },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockGetWixClient.mockImplementationOnce(() => {
      throw new Error('wix singleton unavailable');
    });

    renderScreen();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));
    const err = mockCaptureException.mock.calls[0][0] as Error;
    expect(err.message).toMatch(/wix singleton unavailable/);
    // Swallowing should prevent any downstream emit call when client retrieval fails
    expect(mockEmitChallengeStarted).not.toHaveBeenCalled();
  });

  it('wraps non-Error throws into Error on the outer catch path', async () => {
    const ch = makeChallenge({ id: 'ch-9' });
    mockHook.mockReturnValue({
      challenges: [ch],
      grouped: { ...emptyGrouped, inProgress: [ch] },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockGetWixClient.mockImplementationOnce(() => {
      throw { code: 'NO_CLIENT' };
    });

    renderScreen();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockCaptureException).toHaveBeenCalled();
    const err = mockCaptureException.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
  });

  it('does not invoke getWixClientSingleton when inProgress is empty (guard)', async () => {
    mockHook.mockReturnValue({
      challenges: [],
      grouped: emptyGrouped,
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockGetWixClient.mockImplementation(() => {
      throw new Error('should not be called');
    });

    renderScreen();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(mockGetWixClient).not.toHaveBeenCalled();
  });
});

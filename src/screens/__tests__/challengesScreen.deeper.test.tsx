/**
 * ChallengesScreen deeper edge case tests — cm-afw
 *
 * Covers:
 *  - Error state: challenges-error testID, message text, no sections shown
 *  - Empty grouped: challenges-empty testID, message text, guards against loading/error
 *  - Loading: challenges-loading testID (ActivityIndicator), no content shown
 *  - Challenge card press: onChallengePress callback fired with challengeId
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { ChallengesScreen } from '../ChallengesScreen';
import type { CatalogChallenge, GroupedChallenges } from '@/hooks/useChallengeCatalog';
import { useChallengeCatalog } from '@/hooks/useChallengeCatalog';

// ── Fixtures ──────────────────────────────────────────────────────────────────

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

// ── Mocks ─────────────────────────────────────────────────────────────────────

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
const mockHook = useChallengeCatalog as jest.Mock;

jest.mock('@/hooks/useChallengeProgress', () => ({
  useChallengeProgress: () => ({
    summary: { totalPointsEarned: 0, completedCount: 0, activeCount: 0 },
  }),
}));

jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => ({ points: 0 }),
}));

jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: jest.fn(() => ({ callFunction: jest.fn() })),
}));

jest.mock('@/services/crossRigEventBus', () => ({
  emitChallengeStarted: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderScreen(props: React.ComponentProps<typeof ChallengesScreen> = {}) {
  return render(
    <ThemeProvider>
      <ChallengesScreen {...props} />
    </ThemeProvider>,
  );
}

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

// ── Error state ───────────────────────────────────────────────────────────────

describe('ChallengesScreen — error state (deeper)', () => {
  beforeEach(() => {
    mockHook.mockReturnValue({
      challenges: [],
      grouped: emptyGrouped,
      loading: false,
      error: 'Network request failed',
      refresh: mockRefresh,
    });
  });

  it('renders challenges-error testID when error is set', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('challenges-error')).toBeTruthy();
  });

  it('shows the error message text', () => {
    const { getByText } = renderScreen();
    expect(getByText('Network request failed')).toBeTruthy();
  });

  it('does not show loading indicator in error state', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('challenges-loading')).toBeNull();
  });

  it('does not show empty state in error state', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('challenges-empty')).toBeNull();
  });

  it('does not show any section headers in error state', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('section-in-progress')).toBeNull();
    expect(queryByTestId('section-available')).toBeNull();
    expect(queryByTestId('section-completed')).toBeNull();
    expect(queryByTestId('section-expired')).toBeNull();
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe('ChallengesScreen — empty grouped state (deeper)', () => {
  it('renders challenges-empty testID when all groups are empty', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('challenges-empty')).toBeTruthy();
  });

  it('shows the empty state message text', () => {
    const { getByTestId } = renderScreen();
    const el = getByTestId('challenges-empty');
    expect(el.props.children).toBeTruthy();
  });

  it('does not show loading indicator in empty state', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('challenges-loading')).toBeNull();
  });

  it('does not show error state when empty', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('challenges-error')).toBeNull();
  });

  it('does not show any section headers when empty', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('section-in-progress')).toBeNull();
    expect(queryByTestId('section-available')).toBeNull();
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('ChallengesScreen — loading state (deeper)', () => {
  beforeEach(() => {
    mockHook.mockReturnValue({
      challenges: [],
      grouped: emptyGrouped,
      loading: true,
      error: null,
      refresh: mockRefresh,
    });
  });

  it('shows challenges-loading testID (ActivityIndicator) while loading', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('challenges-loading')).toBeTruthy();
  });

  it('does not show error state while loading', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('challenges-error')).toBeNull();
  });

  it('does not show empty state while loading', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('challenges-empty')).toBeNull();
  });

  it('does not show any section headers while loading', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('section-in-progress')).toBeNull();
    expect(queryByTestId('section-available')).toBeNull();
  });
});

// ── Challenge card press ──────────────────────────────────────────────────────

describe('ChallengesScreen — challenge card press', () => {
  const ch = makeChallenge({ id: 'ch-press' });

  beforeEach(() => {
    mockHook.mockReturnValue({
      challenges: [ch],
      grouped: { ...emptyGrouped, available: [ch] },
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
  });

  it('calls onChallengePress with the challenge id when row is pressed', () => {
    const onChallengePress = jest.fn();
    const { getByTestId } = renderScreen({ onChallengePress });
    fireEvent.press(getByTestId('challenge-row-ch-press'));
    expect(onChallengePress).toHaveBeenCalledWith('ch-press');
  });

  it('does not throw when onChallengePress is not provided', () => {
    const { getByTestId } = renderScreen();
    expect(() => fireEvent.press(getByTestId('challenge-row-ch-press'))).not.toThrow();
  });

  it('calls onChallengePress once per press', () => {
    const onChallengePress = jest.fn();
    const { getByTestId } = renderScreen({ onChallengePress });
    fireEvent.press(getByTestId('challenge-row-ch-press'));
    fireEvent.press(getByTestId('challenge-row-ch-press'));
    expect(onChallengePress).toHaveBeenCalledTimes(2);
  });
});

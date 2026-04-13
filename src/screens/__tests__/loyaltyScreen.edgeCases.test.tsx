/**
 * LoyaltyScreen edge-case tests — cm-ajd
 *
 * Deeper coverage: all four tiers, progress boundaries, custom testID,
 * tier-emit gated on loading, and sync throws from the Wix client.
 */

import React from 'react';
import { act, render } from '@testing-library/react-native';
import { LoyaltyScreen, __resetStreakEmitState, __resetTierEmitState } from '../LoyaltyScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { LOYALTY_TIERS } from '@/data/loyaltyTiers';

const [TRAIL_BLAZER, MOUNTAIN_GUIDE, SUMMIT_MASTER, BLUE_RIDGE_LEGEND] = LOYALTY_TIERS;

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/services/crossRigEventBus', () => ({
  emitStreakExtended: jest.fn(() => Promise.resolve({ success: true })),
  emitTierChanged: jest.fn(() => Promise.resolve({ success: true })),
}));
const mockEmitTierChanged = jest.requireMock('@/services/crossRigEventBus')
  .emitTierChanged as jest.Mock;

const mockGetWixClient = jest.fn();
jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => mockGetWixClient(),
}));

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

const mockUseStreak = jest.fn();
jest.mock('@/hooks/useStreak', () => ({
  useStreak: () => mockUseStreak(),
}));

const mockCaptureException = jest.fn();
jest.mock('@/services/crashReporting', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const DEFAULT_LOYALTY = {
  points: 750,
  tier: TRAIL_BLAZER,
  nextTier: MOUNTAIN_GUIDE,
  pointsToNext: 250,
  progress: 60,
  loading: false,
  error: null,
  refreshPoints: jest.fn(),
};

const STREAK_SAME_DAY = { streak: 5, loading: false, wasExtendedToday: false };

function renderScreen(props: Partial<React.ComponentProps<typeof LoyaltyScreen>> = {}) {
  return render(
    <ThemeProvider>
      <LoyaltyScreen {...props} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetStreakEmitState();
  __resetTierEmitState();
  mockGetWixClient.mockReturnValue({ callFunction: jest.fn() });
  mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
  mockUseStreak.mockReturnValue(STREAK_SAME_DAY);
});

// ── Tier rendering — all four tiers ──────────────────────────────────────────

describe('LoyaltyScreen — tier rendering across all four tiers', () => {
  it('renders Trail Blazer tier without throwing', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, tier: TRAIL_BLAZER });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-tier-badge')).toBeTruthy();
    expect(getByTestId('loyalty-tier-perk-card')).toBeTruthy();
  });

  it('renders Mountain Guide tier without throwing', () => {
    mockUseLoyalty.mockReturnValue({
      ...DEFAULT_LOYALTY,
      tier: MOUNTAIN_GUIDE,
      nextTier: SUMMIT_MASTER,
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-tier-badge')).toBeTruthy();
  });

  it('renders Summit Master tier without throwing', () => {
    mockUseLoyalty.mockReturnValue({
      ...DEFAULT_LOYALTY,
      tier: SUMMIT_MASTER,
      nextTier: BLUE_RIDGE_LEGEND,
      points: 2000,
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-tier-badge')).toBeTruthy();
  });

  it('renders Blue Ridge Legend (max) tier with no progress bar', () => {
    mockUseLoyalty.mockReturnValue({
      ...DEFAULT_LOYALTY,
      tier: BLUE_RIDGE_LEGEND,
      nextTier: null,
      points: 5000,
      progress: 100,
    });
    const { queryByTestId, getByTestId } = renderScreen();
    expect(queryByTestId('loyalty-progress')).toBeNull();
    expect(getByTestId('loyalty-tier-badge')).toBeTruthy();
  });
});

// ── Progress boundaries ──────────────────────────────────────────────────────

describe('LoyaltyScreen — progress boundaries', () => {
  it('renders progress bar when progress=0 (just entered new tier)', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, progress: 0, points: 500 });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-progress')).toBeTruthy();
  });

  it('renders progress label containing next-tier threshold + name', () => {
    mockUseLoyalty.mockReturnValue({
      ...DEFAULT_LOYALTY,
      points: 800,
      progress: 60,
      nextTier: MOUNTAIN_GUIDE,
    });
    const { getByText } = renderScreen();
    expect(getByText(/800.*\/.*500.*to.*Mountain Guide/)).toBeTruthy();
  });
});

// ── Very large balance ───────────────────────────────────────────────────────

describe('LoyaltyScreen — large points balance', () => {
  it('renders 1,000,000 points without truncating', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 1_000_000 });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-points').props.children).toBe(1_000_000);
  });
});

// ── Custom testID override ───────────────────────────────────────────────────

describe('LoyaltyScreen — testID overrides', () => {
  it('applies custom testID on loading state', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, loading: true });
    const { getByTestId } = renderScreen({ testID: 'custom-loyalty' });
    expect(getByTestId('custom-loyalty')).toBeTruthy();
  });

  it('applies custom testID on error state', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: 'boom', loading: false });
    const { getByTestId } = renderScreen({ testID: 'custom-loyalty' });
    expect(getByTestId('custom-loyalty')).toBeTruthy();
  });
});

// ── Tier emit — gated on loading & sync throws ───────────────────────────────

describe('LoyaltyScreen — tier-emit edge cases', () => {
  it('does not emit tier change while loading=true', async () => {
    const { rerender } = render(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );

    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, tier: TRAIL_BLAZER, loading: true });
    rerender(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    await act(async () => await new Promise((r) => setTimeout(r, 5)));

    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, tier: MOUNTAIN_GUIDE, loading: true });
    rerender(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    await act(async () => await new Promise((r) => setTimeout(r, 5)));

    expect(mockEmitTierChanged).not.toHaveBeenCalled();
  });

  it('captures exception when getWixClientSingleton throws synchronously during tier change', async () => {
    const { rerender } = render(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, tier: TRAIL_BLAZER });
    rerender(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    await act(async () => await new Promise((r) => setTimeout(r, 5)));

    mockGetWixClient.mockImplementationOnce(() => {
      throw new Error('wix client unavailable');
    });
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, tier: MOUNTAIN_GUIDE });
    rerender(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    await act(async () => await new Promise((r) => setTimeout(r, 5)));

    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockEmitTierChanged).not.toHaveBeenCalled();
  });
});

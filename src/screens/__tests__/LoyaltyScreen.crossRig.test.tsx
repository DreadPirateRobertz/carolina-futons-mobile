/**
 * LoyaltyScreen cross-rig event bus tests — cf-87tn
 *
 * Verifies that emitStreakExtended fires when the screen mounts
 * and wasExtendedToday is true.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LoyaltyScreen } from '../LoyaltyScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockEmitStreakExtended = jest.fn(() => Promise.resolve({ success: true }));
jest.mock('@/services/crossRigEventBus', () => ({
  emitStreakExtended: (...args: any[]) => mockEmitStreakExtended(...args),
}));

const mockWixClient = { callFunction: jest.fn(() => Promise.resolve({ success: true })) };
const mockGetWixClient = jest.fn(() => mockWixClient);
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

// ── Fixtures ─────────────────────────────────────────────────────────────────

const DEFAULT_LOYALTY = {
  points: 750,
  tier: 'bronze' as const,
  nextTier: 'silver' as const,
  pointsToNext: 250,
  progress: 60,
  loading: false,
  error: null,
  refreshPoints: jest.fn(),
};

const STREAK_EXTENDED = { streak: 5, loading: false, wasExtendedToday: true };
const STREAK_SAME_DAY = { streak: 5, loading: false, wasExtendedToday: false };
const STREAK_LOADING = { streak: 1, loading: true, wasExtendedToday: false };

function renderScreen() {
  return render(
    <ThemeProvider>
      <LoyaltyScreen />
    </ThemeProvider>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('LoyaltyScreen — crossRigEventBus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
    mockUseStreak.mockReturnValue(STREAK_EXTENDED);
  });

  it('calls emitStreakExtended when wasExtendedToday is true', async () => {
    renderScreen();
    await Promise.resolve(); // flush effects
    expect(mockEmitStreakExtended).toHaveBeenCalledTimes(1);
    expect(mockEmitStreakExtended).toHaveBeenCalledWith(
      mockWixClient,
      expect.objectContaining({ streak: 5, delta: 1 }),
    );
  });

  it('does not call emitStreakExtended when wasExtendedToday is false', async () => {
    mockUseStreak.mockReturnValue(STREAK_SAME_DAY);
    renderScreen();
    await Promise.resolve();
    expect(mockEmitStreakExtended).not.toHaveBeenCalled();
  });

  it('does not call emitStreakExtended while streak is still loading', async () => {
    mockUseStreak.mockReturnValue(STREAK_LOADING);
    renderScreen();
    await Promise.resolve();
    expect(mockEmitStreakExtended).not.toHaveBeenCalled();
  });

  it('passes newTotal from loyalty points to emitStreakExtended', async () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 1200 });
    renderScreen();
    await Promise.resolve();
    expect(mockEmitStreakExtended).toHaveBeenCalledWith(
      mockWixClient,
      expect.objectContaining({ newTotal: 1200 }),
    );
  });
});

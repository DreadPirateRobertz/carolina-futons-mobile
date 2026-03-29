/**
 * LoyaltyScreen cross-rig event bus tests — cf-87tn
 *
 * Verifies that emitStreakExtended fires when the screen mounts
 * and wasExtendedToday is true.
 * Also verifies emitTierChanged fires when tier upgrades (Task 6, epicD).
 */

import React from 'react';
import { act, render } from '@testing-library/react-native';
import { LoyaltyScreen, __resetStreakEmitState, __resetTierEmitState } from '../LoyaltyScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/services/crossRigEventBus', () => ({
  emitStreakExtended: jest.fn(() => Promise.resolve({ success: true })),
  emitTierChanged: jest.fn(() => Promise.resolve({ success: true })),
}));
const mockEmitStreakExtended = jest.requireMock('@/services/crossRigEventBus')
  .emitStreakExtended as jest.Mock;
const mockEmitTierChanged = jest.requireMock('@/services/crossRigEventBus')
  .emitTierChanged as jest.Mock;

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

const mockCaptureException = jest.fn();
jest.mock('@/services/crashReporting', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
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
    __resetStreakEmitState();
    mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
    mockUseStreak.mockReturnValue(STREAK_EXTENDED);
  });

  it('calls emitStreakExtended when wasExtendedToday is true', async () => {
    renderScreen();
    await new Promise((r) => setTimeout(r, 10));
    expect(mockEmitStreakExtended).toHaveBeenCalledTimes(1);
    expect(mockEmitStreakExtended).toHaveBeenCalledWith(
      mockWixClient,
      expect.objectContaining({ streak: 5, delta: 1 }),
    );
  });

  it('does not call emitStreakExtended when wasExtendedToday is false', async () => {
    mockUseStreak.mockReturnValue(STREAK_SAME_DAY);
    renderScreen();
    await new Promise((r) => setTimeout(r, 10));
    expect(mockEmitStreakExtended).not.toHaveBeenCalled();
  });

  it('does not call emitStreakExtended while streak is still loading', async () => {
    mockUseStreak.mockReturnValue(STREAK_LOADING);
    renderScreen();
    await new Promise((r) => setTimeout(r, 10));
    expect(mockEmitStreakExtended).not.toHaveBeenCalled();
  });

  it('passes newTotal from loyalty points to emitStreakExtended', async () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 1200 });
    renderScreen();
    await new Promise((r) => setTimeout(r, 10));
    expect(mockEmitStreakExtended).toHaveBeenCalledWith(
      mockWixClient,
      expect.objectContaining({ newTotal: 1200 }),
    );
  });

  it('does not re-emit on remount (module-level dedup)', async () => {
    const { unmount } = renderScreen();
    await new Promise((r) => setTimeout(r, 10));
    expect(mockEmitStreakExtended).toHaveBeenCalledTimes(1);

    unmount();
    mockEmitStreakExtended.mockClear();

    renderScreen();
    await new Promise((r) => setTimeout(r, 10));
    expect(mockEmitStreakExtended).not.toHaveBeenCalled();
  });

  it('captures exception when emitStreakExtended rejects', async () => {
    mockEmitStreakExtended.mockRejectedValueOnce(new Error('event bus down'));
    renderScreen();
    await new Promise((r) => setTimeout(r, 10));
    expect(mockCaptureException).toHaveBeenCalled();
  });
});

// ── emitTierChanged wiring (Task 6, epicD) ────────────────────────────────────

describe('LoyaltyScreen — tier change push wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetStreakEmitState();
    __resetTierEmitState();
    mockUseStreak.mockReturnValue(STREAK_SAME_DAY);
  });

  it('emits emitTierChanged when tier upgrades from bronze to silver', async () => {
    const { rerender } = render(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, tier: 'bronze' });
    rerender(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, tier: 'silver' });
    rerender(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockEmitTierChanged).toHaveBeenCalledTimes(1);
    expect(mockEmitTierChanged).toHaveBeenCalledWith(
      mockWixClient,
      expect.objectContaining({ oldTier: 'bronze', newTier: 'silver' }),
    );
  });

  it('does not emit emitTierChanged on initial load (no prev tier)', async () => {
    mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
    renderScreen();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(mockEmitTierChanged).not.toHaveBeenCalled();
  });

  it('does not emit emitTierChanged when tier stays the same', async () => {
    const { rerender } = render(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
    rerender(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, tier: 'bronze' });
    rerender(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockEmitTierChanged).not.toHaveBeenCalled();
  });

  it('does not re-emit on remount after tier already upgraded (module-level dedup)', async () => {
    const silver = { ...DEFAULT_LOYALTY, tier: 'silver' as const };

    const { unmount, rerender } = render(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
    rerender(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    await act(async () => await new Promise((r) => setTimeout(r, 10)));

    mockUseLoyalty.mockReturnValue(silver);
    rerender(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    await act(async () => await new Promise((r) => setTimeout(r, 10)));
    expect(mockEmitTierChanged).toHaveBeenCalledTimes(1);

    unmount();
    mockEmitTierChanged.mockClear();
    mockUseLoyalty.mockReturnValue(silver);
    renderScreen();
    await act(async () => await new Promise((r) => setTimeout(r, 10)));
    expect(mockEmitTierChanged).not.toHaveBeenCalled();
  });

  it('captures exception when emitTierChanged rejects', async () => {
    mockEmitTierChanged.mockRejectedValueOnce(new Error('bus error'));
    const { rerender } = render(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
    rerender(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    await act(async () => await new Promise((r) => setTimeout(r, 10)));

    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, tier: 'silver' as const });
    rerender(
      <ThemeProvider>
        <LoyaltyScreen />
      </ThemeProvider>,
    );
    await act(async () => await new Promise((r) => setTimeout(r, 10)));
    expect(mockCaptureException).toHaveBeenCalled();
  });
});

/**
 * RewardsScreen cross-rig event bus tests — cf-87tn
 *
 * Verifies that emitRedemptionInitiated fires when the user presses
 * the Redeem button on the RewardsScreen.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RewardsScreen } from '../RewardsScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockEmitRedemptionInitiated = jest.fn(() => Promise.resolve({ success: true }));
jest.mock('@/services/crossRigEventBus', () => ({
  emitRedemptionInitiated: (...args: any[]) => mockEmitRedemptionInitiated(...args),
}));

const mockWixClient = { callFunction: jest.fn(() => Promise.resolve({ success: true })) };
jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => mockWixClient,
}));

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

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

function renderScreen(props = {}) {
  return render(
    <ThemeProvider>
      <RewardsScreen {...props} />
    </ThemeProvider>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RewardsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
  });

  it('renders the redeem button', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-redeem-button')).toBeTruthy();
  });

  it('shows current points balance', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-points').props.children).toBe(500);
  });

  it('shows loading indicator while fetching', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, loading: true });
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-loading')).toBeTruthy();
  });

  it('calls emitRedemptionInitiated with correct args when redeem is pressed', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-redeem-button'));
    await Promise.resolve();
    expect(mockEmitRedemptionInitiated).toHaveBeenCalledTimes(1);
    expect(mockEmitRedemptionInitiated).toHaveBeenCalledWith(
      mockWixClient,
      expect.objectContaining({ pointsRedeemed: 500, newTotal: 0 }),
    );
  });

  it('does not call emitRedemptionInitiated when points is zero', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 0 });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-redeem-button'));
    expect(mockEmitRedemptionInitiated).not.toHaveBeenCalled();
  });
});

/**
 * LoyaltyScreen TDD tests — cm-elo / deacon-cjv
 *
 * 4 tests for LoyaltyScreen UI states.
 * useLoyalty is mocked so screen tests control the data layer.
 *
 * Note: transaction history was removed in cm-a11y-shipping — the Wix
 * webMethod only exposes points and tier, not transaction history.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoyaltyScreen } from '../LoyaltyScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { LOYALTY_TIERS } from '@/data/loyaltyTiers';

const [TRAIL_BLAZER, MOUNTAIN_GUIDE] = LOYALTY_TIERS;

const mockRefreshPoints = jest.fn();
const mockUseLoyalty = jest.fn();

jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

const DEFAULT_LOYALTY = {
  points: 750,
  tier: TRAIL_BLAZER,
  nextTier: MOUNTAIN_GUIDE,
  pointsToNext: 250,
  progress: 60,
  loading: false,
  error: null,
  refreshPoints: mockRefreshPoints,
};

function renderScreen(props: Partial<React.ComponentProps<typeof LoyaltyScreen>> = {}) {
  return render(
    <ThemeProvider>
      <LoyaltyScreen {...props} />
    </ThemeProvider>,
  );
}

describe('LoyaltyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
  });

  it('shows loading indicator while fetching', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, loading: true });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-loading')).toBeTruthy();
  });

  it('shows error message and retry button on API failure', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: 'Wix API error', loading: false });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-error')).toBeTruthy();
    expect(getByTestId('loyalty-retry')).toBeTruthy();
    fireEvent.press(getByTestId('loyalty-retry'));
    expect(mockRefreshPoints).toHaveBeenCalledTimes(1);
  });

  it('shows points balance when loaded', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 1500 });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-points').props.children).toBe(1500);
  });

  it('shows tier badge when loaded', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, tier: MOUNTAIN_GUIDE });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-tier-badge')).toBeTruthy();
  });
});

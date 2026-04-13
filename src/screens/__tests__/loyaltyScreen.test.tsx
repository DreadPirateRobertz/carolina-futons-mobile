/**
 * LoyaltyScreen TDD tests — cm-elo / deacon-cjv / cm-abu
 *
 * UI state tests for LoyaltyScreen.
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

const [TRAIL_BLAZER, MOUNTAIN_GUIDE, , BLUE_RIDGE_LEGEND] = LOYALTY_TIERS;

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

  it('renders skeleton when loading=true', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, loading: true });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-loading')).toBeTruthy();
  });

  it('renders content when loading=false', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, loading: false });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-points')).toBeTruthy();
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

  it('shows tier perk card with current tier perks', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-tier-perk-card')).toBeTruthy();
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  it('renders 0 points correctly (boundary: lowest possible balance)', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 0 });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-points').props.children).toBe(0);
  });

  it('shows progress bar when nextTier is set', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, nextTier: MOUNTAIN_GUIDE });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-progress')).toBeTruthy();
  });

  it('hides progress bar at max tier (Blue Ridge Legend — no nextTier)', () => {
    mockUseLoyalty.mockReturnValue({
      ...DEFAULT_LOYALTY,
      tier: BLUE_RIDGE_LEGEND,
      nextTier: null,
      progress: 100,
    });
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('loyalty-progress')).toBeNull();
  });

  it('shows no-transactions notice in loaded state', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-no-transactions')).toBeTruthy();
  });

  it('shows perks section heading in loaded state', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-perks-heading')).toBeTruthy();
  });

  it('renders with custom testID on root element', () => {
    const { getByTestId } = renderScreen({ testID: 'my-loyalty' });
    expect(getByTestId('my-loyalty')).toBeTruthy();
  });

  it('displays the error message text from the hook', () => {
    mockUseLoyalty.mockReturnValue({
      ...DEFAULT_LOYALTY,
      error: 'Service temporarily unavailable',
      loading: false,
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loyalty-error').props.children).toBe('Service temporarily unavailable');
  });

  it('hides content and shows skeleton while loading (no points visible)', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, loading: true });
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('loyalty-points')).toBeNull();
  });

  describe('Accessibility — retry button (cm-b6v)', () => {
    it('retry button has accessibilityLabel and role', () => {
      mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: 'API error', loading: false });
      const { getByTestId } = renderScreen();
      const btn = getByTestId('loyalty-retry');
      expect(btn.props.accessibilityLabel).toBe('Retry loading loyalty points');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('retry button calls refreshPoints when pressed', () => {
      mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: 'API error', loading: false });
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('loyalty-retry'));
      expect(mockRefreshPoints).toHaveBeenCalledTimes(1);
    });
  });
});

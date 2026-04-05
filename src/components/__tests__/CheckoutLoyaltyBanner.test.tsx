/**
 * CheckoutLoyaltyBanner TDD tests — cm-ds5 / deacon-cjv
 *
 * Covers: all tier states, progress text, no-next-tier (Blue Ridge Legend),
 * graceful fallback on loading/error/null, no crash on null service response.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { CheckoutLoyaltyBanner } from '../CheckoutLoyaltyBanner';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { LOYALTY_TIERS } from '@/data/loyaltyTiers';

const [TRAIL_BLAZER, MOUNTAIN_GUIDE, , BLUE_RIDGE_LEGEND] = LOYALTY_TIERS;

function renderBanner(props: React.ComponentProps<typeof CheckoutLoyaltyBanner>) {
  return render(
    <ThemeProvider>
      <CheckoutLoyaltyBanner {...props} />
    </ThemeProvider>,
  );
}

describe('CheckoutLoyaltyBanner', () => {
  // ── Tier rendering ──────────────────────────────────────────────────

  it('renders Trail Blazer tier label', () => {
    const { getByTestId } = renderBanner({
      tier: TRAIL_BLAZER,
      points: 120,
      pointsToNext: 380,
      nextTierLabel: 'Mountain Guide',
    });
    expect(getByTestId('checkout-loyalty-banner')).toBeTruthy();
    expect(getByTestId('checkout-loyalty-tier-label').props.children).toMatch(/Trail Blazer/i);
  });

  it('renders Mountain Guide tier label', () => {
    const { getByTestId } = renderBanner({
      tier: MOUNTAIN_GUIDE,
      points: 750,
      pointsToNext: 750,
      nextTierLabel: 'Summit Master',
    });
    expect(getByTestId('checkout-loyalty-tier-label').props.children).toMatch(/Mountain Guide/i);
  });

  it('renders Blue Ridge Legend tier label', () => {
    const { getByTestId } = renderBanner({
      tier: BLUE_RIDGE_LEGEND,
      points: 3000,
      pointsToNext: 0,
      nextTierLabel: null,
    });
    expect(getByTestId('checkout-loyalty-tier-label').props.children).toMatch(/Blue Ridge Legend/i);
  });

  // ── Progress text ───────────────────────────────────────────────────

  it('shows points-to-next progress text for Trail Blazer → Mountain Guide', () => {
    const { getByTestId } = renderBanner({
      tier: TRAIL_BLAZER,
      points: 120,
      pointsToNext: 380,
      nextTierLabel: 'Mountain Guide',
    });
    const progress = getByTestId('checkout-loyalty-progress');
    expect(progress.props.children).toMatch(/380/);
    expect(progress.props.children).toMatch(/Mountain Guide/);
  });

  it('shows points-to-next progress text for Mountain Guide → Summit Master', () => {
    const { getByTestId } = renderBanner({
      tier: MOUNTAIN_GUIDE,
      points: 800,
      pointsToNext: 700,
      nextTierLabel: 'Summit Master',
    });
    const progress = getByTestId('checkout-loyalty-progress');
    expect(progress.props.children).toMatch(/700/);
    expect(progress.props.children).toMatch(/Summit Master/);
  });

  it('shows top-tier message when Blue Ridge Legend (no next tier)', () => {
    const { getByTestId } = renderBanner({
      tier: BLUE_RIDGE_LEGEND,
      points: 3000,
      pointsToNext: 0,
      nextTierLabel: null,
    });
    const progress = getByTestId('checkout-loyalty-progress');
    expect(progress.props.children).not.toMatch(/pts to/i);
    expect(progress.props.children).toMatch(/top tier|max|highest/i);
  });

  // ── Graceful fallback ───────────────────────────────────────────────

  it('renders nothing when loading=true', () => {
    const { queryByTestId } = renderBanner({
      tier: TRAIL_BLAZER,
      points: 0,
      pointsToNext: 500,
      nextTierLabel: 'Mountain Guide',
      loading: true,
    });
    expect(queryByTestId('checkout-loyalty-banner')).toBeNull();
  });

  it('renders nothing when error is set', () => {
    const { queryByTestId } = renderBanner({
      tier: TRAIL_BLAZER,
      points: 0,
      pointsToNext: 500,
      nextTierLabel: 'Mountain Guide',
      error: 'Network error',
    });
    expect(queryByTestId('checkout-loyalty-banner')).toBeNull();
  });

  it('renders nothing when hidden=true', () => {
    const { queryByTestId } = renderBanner({
      tier: TRAIL_BLAZER,
      points: 100,
      pointsToNext: 400,
      nextTierLabel: 'Mountain Guide',
      hidden: true,
    });
    expect(queryByTestId('checkout-loyalty-banner')).toBeNull();
  });

  it('does not crash when pointsToNext is 0 with a next tier', () => {
    expect(() =>
      renderBanner({
        tier: MOUNTAIN_GUIDE,
        points: 500,
        pointsToNext: 0,
        nextTierLabel: 'Summit Master',
      }),
    ).not.toThrow();
  });

  it('does not crash when points is 0', () => {
    expect(() =>
      renderBanner({
        tier: TRAIL_BLAZER,
        points: 0,
        pointsToNext: 500,
        nextTierLabel: 'Mountain Guide',
      }),
    ).not.toThrow();
  });

  it('has accessible label on banner', () => {
    const { getByTestId } = renderBanner({
      tier: BLUE_RIDGE_LEGEND,
      points: 3000,
      pointsToNext: 0,
      nextTierLabel: null,
    });
    const banner = getByTestId('checkout-loyalty-banner');
    expect(banner.props.accessibilityLabel).toBeTruthy();
  });
});

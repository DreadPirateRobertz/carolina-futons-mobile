/**
 * CheckoutLoyaltyBanner TDD tests — cm-ds5
 *
 * Covers: all tier states, progress text, no-next-tier (Gold),
 * graceful fallback on loading/error/null, no crash on null service response.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { CheckoutLoyaltyBanner } from '../CheckoutLoyaltyBanner';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderBanner(props: React.ComponentProps<typeof CheckoutLoyaltyBanner>) {
  return render(
    <ThemeProvider>
      <CheckoutLoyaltyBanner {...props} />
    </ThemeProvider>,
  );
}

describe('CheckoutLoyaltyBanner', () => {
  // ── Tier rendering ──────────────────────────────────────────────────

  it('renders Bronze tier label for bronze state', () => {
    const { getByTestId } = renderBanner({
      tier: 'bronze',
      points: 120,
      pointsToNext: 380,
      nextTierLabel: 'Silver',
    });
    expect(getByTestId('checkout-loyalty-banner')).toBeTruthy();
    expect(getByTestId('checkout-loyalty-tier-label').props.children).toMatch(/Bronze/i);
  });

  it('renders Silver tier label for silver state', () => {
    const { getByTestId } = renderBanner({
      tier: 'silver',
      points: 750,
      pointsToNext: 750,
      nextTierLabel: 'Gold',
    });
    expect(getByTestId('checkout-loyalty-tier-label').props.children).toMatch(/Silver/i);
  });

  it('renders Gold tier label for gold state', () => {
    const { getByTestId } = renderBanner({
      tier: 'gold',
      points: 2000,
      pointsToNext: 0,
      nextTierLabel: null,
    });
    expect(getByTestId('checkout-loyalty-tier-label').props.children).toMatch(/Gold/i);
  });

  // ── Progress text ───────────────────────────────────────────────────

  it('shows points-to-next progress text for Bronze → Silver', () => {
    const { getByTestId } = renderBanner({
      tier: 'bronze',
      points: 120,
      pointsToNext: 380,
      nextTierLabel: 'Silver',
    });
    const progress = getByTestId('checkout-loyalty-progress');
    expect(progress.props.children).toMatch(/380/);
    expect(progress.props.children).toMatch(/Silver/);
  });

  it('shows points-to-next progress text for Silver → Gold', () => {
    const { getByTestId } = renderBanner({
      tier: 'silver',
      points: 800,
      pointsToNext: 700,
      nextTierLabel: 'Gold',
    });
    const progress = getByTestId('checkout-loyalty-progress');
    expect(progress.props.children).toMatch(/700/);
    expect(progress.props.children).toMatch(/Gold/);
  });

  it('shows top-tier message when Gold (no next tier)', () => {
    const { getByTestId } = renderBanner({
      tier: 'gold',
      points: 1800,
      pointsToNext: 0,
      nextTierLabel: null,
    });
    const progress = getByTestId('checkout-loyalty-progress');
    // Should NOT show "pts to" — should indicate max tier
    expect(progress.props.children).not.toMatch(/pts to/i);
    expect(progress.props.children).toMatch(/top tier|max|highest/i);
  });

  // ── Graceful fallback ───────────────────────────────────────────────

  it('renders nothing when loading=true', () => {
    const { queryByTestId } = renderBanner({
      tier: 'bronze',
      points: 0,
      pointsToNext: 500,
      nextTierLabel: 'Silver',
      loading: true,
    });
    expect(queryByTestId('checkout-loyalty-banner')).toBeNull();
  });

  it('renders nothing when error is set', () => {
    const { queryByTestId } = renderBanner({
      tier: 'bronze',
      points: 0,
      pointsToNext: 500,
      nextTierLabel: 'Silver',
      error: 'Network error',
    });
    expect(queryByTestId('checkout-loyalty-banner')).toBeNull();
  });

  it('renders nothing when hidden=true', () => {
    const { queryByTestId } = renderBanner({
      tier: 'bronze',
      points: 100,
      pointsToNext: 400,
      nextTierLabel: 'Silver',
      hidden: true,
    });
    expect(queryByTestId('checkout-loyalty-banner')).toBeNull();
  });

  it('does not crash when pointsToNext is 0 with a next tier', () => {
    // Edge: exactly at threshold
    expect(() =>
      renderBanner({
        tier: 'silver',
        points: 500,
        pointsToNext: 0,
        nextTierLabel: 'Gold',
      }),
    ).not.toThrow();
  });

  it('does not crash when points is 0', () => {
    expect(() =>
      renderBanner({
        tier: 'bronze',
        points: 0,
        pointsToNext: 500,
        nextTierLabel: 'Silver',
      }),
    ).not.toThrow();
  });

  it('has accessible label on banner', () => {
    const { getByTestId } = renderBanner({
      tier: 'gold',
      points: 2000,
      pointsToNext: 0,
      nextTierLabel: null,
    });
    const banner = getByTestId('checkout-loyalty-banner');
    expect(banner.props.accessibilityLabel).toBeTruthy();
  });
});

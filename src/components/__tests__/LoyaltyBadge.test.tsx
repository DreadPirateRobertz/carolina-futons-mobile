/**
 * LoyaltyBadge TDD tests — cm-elo / deacon-cjv
 *
 * Tests for LoyaltyBadge with the new 4-tier LoyaltyTierConfig system.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LoyaltyBadge } from '../LoyaltyBadge';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { LOYALTY_TIERS } from '@/data/loyaltyTiers';

const [TRAIL_BLAZER, MOUNTAIN_GUIDE, SUMMIT_MASTER, BLUE_RIDGE_LEGEND] = LOYALTY_TIERS;

function renderBadge(tier: (typeof LOYALTY_TIERS)[number], testID?: string) {
  return render(
    <ThemeProvider>
      <LoyaltyBadge tier={tier} testID={testID} />
    </ThemeProvider>,
  );
}

describe('LoyaltyBadge', () => {
  it('renders Trail Blazer label', () => {
    const { getByText } = renderBadge(TRAIL_BLAZER);
    expect(getByText('Trail Blazer')).toBeTruthy();
  });

  it('renders Mountain Guide label', () => {
    const { getByText } = renderBadge(MOUNTAIN_GUIDE);
    expect(getByText('Mountain Guide')).toBeTruthy();
  });

  it('renders Summit Master label', () => {
    const { getByText } = renderBadge(SUMMIT_MASTER);
    expect(getByText('Summit Master')).toBeTruthy();
  });

  it('renders Blue Ridge Legend label', () => {
    const { getByText } = renderBadge(BLUE_RIDGE_LEGEND);
    expect(getByText('Blue Ridge Legend')).toBeTruthy();
  });

  it('uses tier color from config', () => {
    const { getByTestId } = renderBadge(TRAIL_BLAZER);
    const badge = getByTestId('loyalty-badge-trail-blazer');
    expect(badge.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderColor: TRAIL_BLAZER.color })]),
    );
  });

  it('uses testID override when provided', () => {
    const { getByTestId } = renderBadge(MOUNTAIN_GUIDE, 'custom-id');
    expect(getByTestId('custom-id')).toBeTruthy();
  });
});

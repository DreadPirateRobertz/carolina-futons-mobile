import React from 'react';
import { render } from '@testing-library/react-native';
import { LoyaltyTierBadge } from '../LoyaltyTierBadge';

jest.mock('@/theme', () => ({
  useTheme: () => ({ borderRadius: { pill: 100 } }),
}));

jest.mock('@/public/gamificationTokens', () => ({
  getTierIndex: (points: number) => {
    if (points >= 5000) return 3;
    if (points >= 1000) return 2;
    if (points >= 250) return 1;
    return 0;
  },
  TIER_NAMES: ['Trail Blazer', 'Ridge Runner', 'Summit Seeker', 'Blue Ridge Legend'],
}));

describe('LoyaltyTierBadge', () => {
  it('renders tier name and points', () => {
    const { getByTestId } = render(<LoyaltyTierBadge points={500} />);
    expect(getByTestId('loyalty-tier-badge')).toBeTruthy();
    expect(getByTestId('loyalty-tier-name')).toBeTruthy();
    expect(getByTestId('loyalty-points-balance')).toBeTruthy();
  });

  it('has correct accessibilityLabel with tier and points', () => {
    const { getByTestId } = render(<LoyaltyTierBadge points={500} />);
    const badge = getByTestId('loyalty-tier-badge');
    expect(badge.props.accessibilityLabel).toBe('Ridge Runner tier, 500 points');
  });

  it('uses custom testID when provided', () => {
    const { getByTestId } = render(<LoyaltyTierBadge points={100} testID="custom-badge" />);
    expect(getByTestId('custom-badge')).toBeTruthy();
  });

  it('shows correct tier for high points', () => {
    const { getByTestId } = render(<LoyaltyTierBadge points={6000} />);
    const badge = getByTestId('loyalty-tier-badge');
    expect(badge.props.accessibilityLabel).toContain('Blue Ridge Legend');
  });

  it('shows trail blazer tier for low points', () => {
    const { getByTestId } = render(<LoyaltyTierBadge points={0} />);
    const badge = getByTestId('loyalty-tier-badge');
    expect(badge.props.accessibilityLabel).toContain('Trail Blazer');
  });

  it('is marked as accessible', () => {
    const { getByTestId } = render(<LoyaltyTierBadge points={1000} />);
    const badge = getByTestId('loyalty-tier-badge');
    expect(badge.props.accessible).toBe(true);
  });
});

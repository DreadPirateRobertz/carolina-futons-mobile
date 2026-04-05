/**
 * TierPerkCard TDD tests — deacon-cjv
 *
 * Tests for the TierPerkCard component that displays perks for a loyalty tier.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { TierPerkCard } from '../TierPerkCard';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { LOYALTY_TIERS } from '@/data/loyaltyTiers';

const [TRAIL_BLAZER, MOUNTAIN_GUIDE, , BLUE_RIDGE_LEGEND] = LOYALTY_TIERS;

function renderCard(tier: (typeof LOYALTY_TIERS)[number], testID?: string) {
  return render(
    <ThemeProvider>
      <TierPerkCard tier={tier} testID={testID} />
    </ThemeProvider>,
  );
}

describe('TierPerkCard', () => {
  it('renders tier name as title', () => {
    const { getByTestId } = renderCard(TRAIL_BLAZER);
    expect(getByTestId('tier-perk-card-title').props.children).toBe('Trail Blazer');
  });

  it('renders Mountain Guide title', () => {
    const { getByTestId } = renderCard(MOUNTAIN_GUIDE);
    expect(getByTestId('tier-perk-card-title').props.children).toBe('Mountain Guide');
  });

  it('renders all perks for Trail Blazer', () => {
    const { getByText } = renderCard(TRAIL_BLAZER);
    for (const perk of TRAIL_BLAZER.perks) {
      expect(getByText(perk)).toBeTruthy();
    }
  });

  it('renders all perks for Blue Ridge Legend', () => {
    const { getByText } = renderCard(BLUE_RIDGE_LEGEND);
    for (const perk of BLUE_RIDGE_LEGEND.perks) {
      expect(getByText(perk)).toBeTruthy();
    }
  });

  it('has correct number of perk items', () => {
    const { getAllByTestId } = renderCard(MOUNTAIN_GUIDE);
    expect(getAllByTestId('tier-perk-item')).toHaveLength(MOUNTAIN_GUIDE.perks.length);
  });

  it('uses tier color for accent', () => {
    const { getByTestId } = renderCard(TRAIL_BLAZER);
    const card = getByTestId('tier-perk-card');
    // Card container should have border using tier color
    const flatStyle = Array.isArray(card.props.style)
      ? Object.assign({}, ...card.props.style)
      : card.props.style;
    expect(flatStyle.borderColor).toContain(TRAIL_BLAZER.color);
  });

  it('renders the card root with default testID', () => {
    const { getByTestId } = renderCard(TRAIL_BLAZER);
    expect(getByTestId('tier-perk-card')).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = renderCard(MOUNTAIN_GUIDE, 'custom-card');
    expect(getByTestId('custom-card')).toBeTruthy();
  });

  it('has accessible role', () => {
    const { getByTestId } = renderCard(TRAIL_BLAZER);
    const card = getByTestId('tier-perk-card');
    expect(card.props.accessibilityRole).toBeTruthy();
  });
});

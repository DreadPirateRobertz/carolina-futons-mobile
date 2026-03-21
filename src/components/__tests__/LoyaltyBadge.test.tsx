/**
 * LoyaltyBadge TDD tests — cm-elo
 *
 * 3 tests for LoyaltyBadge tier display.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LoyaltyBadge } from '../LoyaltyBadge';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderBadge(tier: 'bronze' | 'silver' | 'gold', testID?: string) {
  return render(
    <ThemeProvider>
      <LoyaltyBadge tier={tier} testID={testID} />
    </ThemeProvider>,
  );
}

describe('LoyaltyBadge', () => {
  it('renders Bronze label for bronze tier', () => {
    const { getByText } = renderBadge('bronze');
    expect(getByText('Bronze')).toBeTruthy();
  });

  it('renders Silver label for silver tier', () => {
    const { getByText } = renderBadge('silver');
    expect(getByText('Silver')).toBeTruthy();
  });

  it('renders Gold label for gold tier', () => {
    const { getByText } = renderBadge('gold');
    expect(getByText('Gold')).toBeTruthy();
  });
});

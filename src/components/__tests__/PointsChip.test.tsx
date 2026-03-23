/**
 * PointsChip TDD tests — cfutons_mobile-a02
 *
 * Tests written BEFORE implementation per CLAUDE.md mandate.
 * Component shows 'Earn X pts' pill below price on PDP.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PointsChip } from '../PointsChip';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderChip(props: React.ComponentProps<typeof PointsChip>) {
  return render(
    <ThemeProvider>
      <PointsChip {...props} />
    </ThemeProvider>,
  );
}

describe('PointsChip', () => {
  it('renders correct point value for a given price', () => {
    const { getByTestId } = renderChip({ price: 799, isAuthenticated: true });
    // floor(799 * 0.06) = floor(47.94) = 47
    expect(getByTestId('points-chip-label').props.children).toBe('Earn 47 pts');
  });

  it('renders 0 pts for price 0 (no negative)', () => {
    const { getByTestId } = renderChip({ price: 0, isAuthenticated: true });
    expect(getByTestId('points-chip-label').props.children).toBe('Earn 0 pts');
  });

  it('rounds down (floor) correctly', () => {
    const { getByTestId } = renderChip({ price: 100, isAuthenticated: true });
    // floor(100 * 0.06) = 6
    expect(getByTestId('points-chip-label').props.children).toBe('Earn 6 pts');
  });

  it('is hidden when user is not authenticated', () => {
    const { queryByTestId } = renderChip({ price: 500, isAuthenticated: false });
    expect(queryByTestId('points-chip')).toBeNull();
  });

  it('is visible when user is authenticated', () => {
    const { getByTestId } = renderChip({ price: 500, isAuthenticated: true });
    expect(getByTestId('points-chip')).toBeTruthy();
  });

  it('has accessibilityLabel describing the earning', () => {
    const { getByTestId } = renderChip({ price: 500, isAuthenticated: true });
    // floor(500 * 0.06) = 30
    expect(getByTestId('points-chip').props.accessibilityLabel).toBe('Earn 30 loyalty points');
  });

  it('accepts optional testID override', () => {
    const { getByTestId } = renderChip({
      price: 100,
      isAuthenticated: true,
      testID: 'custom-chip',
    });
    expect(getByTestId('custom-chip')).toBeTruthy();
  });
});

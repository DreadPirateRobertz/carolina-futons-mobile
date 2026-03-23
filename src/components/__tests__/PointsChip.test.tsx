/**
 * PointsChip TDD tests — cfutons_mobile-a02, hq-xfib1
 *
 * Tests written BEFORE implementation per CLAUDE.md mandate.
 * Component shows 'Earn X pts' pill below price on PDP.
 * Phase 6: bonus points day indicator when bonusPointsDayActive=true.
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

  describe('bonus points day indicator', () => {
    it('shows no bonus badge by default', () => {
      const { queryByTestId } = renderChip({ price: 500, isAuthenticated: true });
      expect(queryByTestId('points-chip-bonus')).toBeNull();
    });

    it('shows bonus badge when bonusPointsDayActive=true', () => {
      const { getByTestId } = renderChip({
        price: 500,
        isAuthenticated: true,
        bonusPointsDayActive: true,
      });
      expect(getByTestId('points-chip-bonus')).toBeTruthy();
    });

    it('bonus badge is hidden when bonusPointsDayActive=false', () => {
      const { queryByTestId } = renderChip({
        price: 500,
        isAuthenticated: true,
        bonusPointsDayActive: false,
      });
      expect(queryByTestId('points-chip-bonus')).toBeNull();
    });

    it('includes 2x in the bonus badge label', () => {
      const { getByTestId } = renderChip({
        price: 500,
        isAuthenticated: true,
        bonusPointsDayActive: true,
      });
      expect(getByTestId('points-chip-bonus').props.children).toContain('2×');
    });

    it('updates accessibilityLabel to include bonus when active', () => {
      const { getByTestId } = renderChip({
        price: 500,
        isAuthenticated: true,
        bonusPointsDayActive: true,
      });
      expect(getByTestId('points-chip').props.accessibilityLabel).toBe(
        'Earn 30 loyalty points — bonus points day, 2× multiplier active',
      );
    });
  });
});

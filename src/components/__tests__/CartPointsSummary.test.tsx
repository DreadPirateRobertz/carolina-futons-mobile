/**
 * CartPointsSummary TDD tests — cfutons_mobile-a02
 *
 * Tests written BEFORE implementation per CLAUDE.md mandate.
 * Component shows 'You'll earn X pts on this order' in cart summary.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { CartPointsSummary } from '../CartPointsSummary';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderSummary(props: React.ComponentProps<typeof CartPointsSummary>) {
  return render(
    <ThemeProvider>
      <CartPointsSummary {...props} />
    </ThemeProvider>,
  );
}

describe('CartPointsSummary', () => {
  it('renders correct total points for a cart subtotal', () => {
    const { getByTestId } = renderSummary({ subtotal: 799, isAuthenticated: true });
    // floor(799 * 0.06) = 47
    expect(getByTestId('cart-points-label').props.children).toBe("You'll earn 47 pts on this order");
  });

  it('is hidden when user is not authenticated', () => {
    const { queryByTestId } = renderSummary({ subtotal: 500, isAuthenticated: false });
    expect(queryByTestId('cart-points-summary')).toBeNull();
  });

  it('is hidden when subtotal is 0 (empty cart)', () => {
    const { queryByTestId } = renderSummary({ subtotal: 0, isAuthenticated: true });
    expect(queryByTestId('cart-points-summary')).toBeNull();
  });

  it('is visible when authenticated and cart has items', () => {
    const { getByTestId } = renderSummary({ subtotal: 500, isAuthenticated: true });
    expect(getByTestId('cart-points-summary')).toBeTruthy();
  });

  it('has accessibilityLabel', () => {
    const { getByTestId } = renderSummary({ subtotal: 500, isAuthenticated: true });
    // floor(500 * 0.06) = 30
    expect(getByTestId('cart-points-summary').props.accessibilityLabel).toBe(
      "You'll earn 30 loyalty points on this order",
    );
  });

  it('floors fractional points correctly', () => {
    const { getByTestId } = renderSummary({ subtotal: 1001, isAuthenticated: true });
    // floor(1001 * 0.06) = floor(60.06) = 60
    expect(getByTestId('cart-points-label').props.children).toBe("You'll earn 60 pts on this order");
  });
});

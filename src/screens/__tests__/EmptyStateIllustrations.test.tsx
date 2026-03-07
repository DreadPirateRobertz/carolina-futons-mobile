/**
 * Tests that empty states in screens use Blue Ridge illustrations
 * instead of emoji icons.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { CartScreen } from '../CartScreen';
import { WishlistScreen } from '../WishlistScreen';
import { ShopScreen } from '../ShopScreen';
import { OrderHistoryScreen } from '../OrderHistoryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { CartProvider } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { WishlistProvider } from '@/hooks/useWishlist';

jest.useFakeTimers();

// Skip: illustration components not yet built (sprint bead cm-0qn)
describe.skip('Empty state illustrations', () => {
  describe('CartScreen', () => {
    it('renders cart illustration in empty state', () => {
      const { getByTestId } = render(
        <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
          <ThemeProvider>
            <CartProvider>
            <CartScreen />
            </CartProvider>
          </ThemeProvider>
        </ConnectivityProvider>,
      );
      expect(getByTestId('cart-illustration')).toBeTruthy();
    });

    it('does not render emoji icon when illustration present', () => {
      const { queryByTestId } = render(
        <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
          <ThemeProvider>
            <CartProvider>
            <CartScreen />
            </CartProvider>
          </ThemeProvider>
        </ConnectivityProvider>,
      );
      expect(queryByTestId('cart-empty-state-icon')).toBeNull();
    });
  });

  describe('WishlistScreen', () => {
    it('renders wishlist illustration in empty state', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <WishlistProvider>
            <WishlistScreen />
          </WishlistProvider>
        </ThemeProvider>,
      );
      expect(getByTestId('wishlist-illustration')).toBeTruthy();
    });
  });

  describe('ShopScreen (no results)', () => {
    it('renders search illustration when no results', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <WishlistProvider>
            <ShopScreen />
          </WishlistProvider>
        </ThemeProvider>,
      );
      // Advance past loading skeleton
      act(() => { jest.advanceTimersByTime(700); });
      // Search for nonexistent term
      const { fireEvent } = require('@testing-library/react-native');
      fireEvent.changeText(getByTestId('search-input'), 'xyznonexistent');
      expect(getByTestId('search-illustration')).toBeTruthy();
    });
  });

  describe('OrderHistoryScreen', () => {
    it('renders category illustration in empty state', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <OrderHistoryScreen orders={[]} />
        </ThemeProvider>,
      );
      expect(getByTestId('orders-illustration')).toBeTruthy();
    });

    it('does not render emoji icon when illustration present', () => {
      const { queryByTestId } = render(
        <ThemeProvider>
          <OrderHistoryScreen orders={[]} />
        </ThemeProvider>,
      );
      expect(queryByTestId('orders-empty-state-icon')).toBeNull();
    });
  });
});

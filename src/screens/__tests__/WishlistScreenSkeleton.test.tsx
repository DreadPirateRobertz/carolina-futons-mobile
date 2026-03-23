/**
 * @module WishlistScreenSkeleton.test
 *
 * Skeleton loading state tests for WishlistScreen — cm-1jd.
 * Uses WishlistProvider's isLoading override prop to simulate loading state.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { WishlistScreen } from '../WishlistScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';

jest.mock('@/components/ProductCard', () => ({ ProductCard: () => null }));

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    items: [],
    itemCount: 0,
    subtotal: 0,
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    syncing: false,
  }),
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function renderScreen(isLoading: boolean) {
  return render(
    <ThemeProvider>
      <WishlistProvider isLoading={isLoading}>
        <CompareProvider>
          <WishlistScreen />
        </CompareProvider>
      </WishlistProvider>
    </ThemeProvider>,
  );
}

describe('WishlistScreen — loading state', () => {
  describe('while loading', () => {
    it('shows skeleton grid while loading', () => {
      const { getByTestId } = renderScreen(true);
      expect(getByTestId('skeleton-wishlist-grid')).toBeTruthy();
    });

    it('does not show wishlist FlatList while loading', () => {
      const { queryByTestId } = renderScreen(true);
      expect(queryByTestId('wishlist-screen-list')).toBeNull();
    });

    it('does not show empty state while loading', () => {
      const { queryByTestId } = renderScreen(true);
      expect(queryByTestId('wishlist-empty')).toBeNull();
    });
  });

  describe('after loading', () => {
    it('does not show skeleton after loading completes', () => {
      const { queryByTestId } = renderScreen(false);
      expect(queryByTestId('skeleton-wishlist-grid')).toBeNull();
    });

    it('shows empty state when loaded with no items', () => {
      const { getByTestId } = renderScreen(false);
      expect(getByTestId('wishlist-empty')).toBeTruthy();
    });
  });
});

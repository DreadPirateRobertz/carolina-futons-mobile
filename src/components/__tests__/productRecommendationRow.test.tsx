/**
 * Tests for ProductRecommendationRow — self-contained recommendation rail.
 * Covers: hook wiring, loading skeleton, empty state, rendering, a11y, edge cases.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductRecommendationRow } from '../ProductRecommendationRow';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { PRODUCTS } from '@/data/products';

// ── mutable mock state ────────────────────────────────────────────────────────

const mockRecsState = {
  recommendations: [] as typeof PRODUCTS,
  isLoading: false,
  error: null as string | null,
};

jest.mock('@/hooks/useProductRecommendations', () => ({
  useProductRecommendations: (_productId: string) => mockRecsState,
}));

const MOCK_PRODUCTS = PRODUCTS.slice(0, 4);

// ── helpers ───────────────────────────────────────────────────────────────────

function renderRow(props: Partial<React.ComponentProps<typeof ProductRecommendationRow>> = {}) {
  return render(
    <ThemeProvider>
      <WishlistProvider>
        <ProductRecommendationRow productId="prod-1" {...props} />
      </WishlistProvider>
    </ThemeProvider>,
  );
}

function resetMocks() {
  mockRecsState.recommendations = [];
  mockRecsState.isLoading = false;
  mockRecsState.error = null;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ProductRecommendationRow', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('loading state', () => {
    it('renders skeleton while loading', () => {
      mockRecsState.isLoading = true;
      const { getByTestId } = renderRow();
      expect(getByTestId('rec-row-skeleton')).toBeTruthy();
    });

    it('does not render carousel while loading', () => {
      mockRecsState.isLoading = true;
      const { queryByTestId } = renderRow({ testID: 'rec-row' });
      expect(queryByTestId('rec-row')).toBeNull();
    });
  });

  describe('empty state (no recommendations)', () => {
    it('renders nothing when not loading and no recommendations', () => {
      const { toJSON } = renderRow();
      expect(toJSON()).toBeNull();
    });
  });

  describe('with recommendations', () => {
    beforeEach(() => {
      mockRecsState.recommendations = MOCK_PRODUCTS;
    });

    it('renders the recommendation carousel', () => {
      const { getByTestId } = renderRow({ testID: 'rec-row' });
      expect(getByTestId('rec-row')).toBeTruthy();
    });

    it('renders default title "Recommended for You"', () => {
      const { getByText } = renderRow();
      expect(getByText('Recommended for You')).toBeTruthy();
    });

    it('renders custom title when provided', () => {
      const { getByText } = renderRow({ title: 'You May Also Like' });
      expect(getByText('You May Also Like')).toBeTruthy();
    });

    it('renders a card for each recommended product', () => {
      const { getByTestId } = renderRow();
      for (const p of MOCK_PRODUCTS) {
        expect(getByTestId(`rec-card-${p.id}`)).toBeTruthy();
      }
    });

    it('passes testID to the container', () => {
      const { getByTestId } = renderRow({ testID: 'cart-rec-row' });
      expect(getByTestId('cart-rec-row')).toBeTruthy();
    });
  });

  describe('onProductPress', () => {
    it('calls onProductPress when a product card is tapped', () => {
      mockRecsState.recommendations = MOCK_PRODUCTS;
      const onProductPress = jest.fn();
      const { getByTestId } = renderRow({ onProductPress });
      fireEvent.press(getByTestId(`rec-card-${MOCK_PRODUCTS[0].id}`));
      expect(onProductPress).toHaveBeenCalledWith(MOCK_PRODUCTS[0]);
    });

    it('does not throw when no onProductPress provided', () => {
      mockRecsState.recommendations = MOCK_PRODUCTS;
      const { getByTestId } = renderRow();
      expect(() =>
        fireEvent.press(getByTestId(`rec-card-${MOCK_PRODUCTS[0].id}`)),
      ).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('renders nothing for empty productId', () => {
      const { toJSON } = renderRow({ productId: '' });
      expect(toJSON()).toBeNull();
    });

    it('does not render skeleton when not loading and productId empty', () => {
      const { queryByTestId } = renderRow({ productId: '' });
      expect(queryByTestId('rec-row-skeleton')).toBeNull();
    });

    it('shows skeleton when loading regardless of testID', () => {
      mockRecsState.isLoading = true;
      const { getByTestId } = renderRow({ testID: 'pdp-rec-row' });
      expect(getByTestId('rec-row-skeleton')).toBeTruthy();
    });
  });
});

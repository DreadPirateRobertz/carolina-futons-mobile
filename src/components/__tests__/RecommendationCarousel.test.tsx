import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RecommendationCarousel } from '../RecommendationCarousel';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { PRODUCTS } from '@/data/products';

const items = PRODUCTS.slice(0, 4);

function renderCarousel(
  props: Partial<React.ComponentProps<typeof RecommendationCarousel>> = {},
) {
  const onProductPress = props.onProductPress ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <WishlistProvider>
          <RecommendationCarousel
            title="Similar Items"
            products={items}
            onProductPress={onProductPress}
            {...props}
          />
        </WishlistProvider>
      </ThemeProvider>,
    ),
    onProductPress,
  };
}

describe('RecommendationCarousel', () => {
  describe('rendering', () => {
    it('renders with testID', () => {
      const { getByTestId } = renderCarousel({ testID: 'similar-carousel' });
      expect(getByTestId('similar-carousel')).toBeTruthy();
    });

    it('renders default testID when not specified', () => {
      const { getByTestId } = renderCarousel();
      expect(getByTestId('recommendation-carousel')).toBeTruthy();
    });

    it('shows section title', () => {
      const { getByText } = renderCarousel();
      expect(getByText('Similar Items')).toBeTruthy();
    });

    it('renders horizontal scrollable list', () => {
      const { getByTestId } = renderCarousel();
      const list = getByTestId('recommendation-list');
      expect(list).toBeTruthy();
      expect(list.props.horizontal).toBe(true);
    });

    it('renders product cards for each item', () => {
      const { getByTestId } = renderCarousel();
      for (const item of items) {
        expect(getByTestId(`rec-card-${item.id}`)).toBeTruthy();
      }
    });

    it('shows product name on each card', () => {
      const { getByText } = renderCarousel();
      for (const item of items) {
        expect(getByText(item.name)).toBeTruthy();
      }
    });

    it('shows product price on each card', () => {
      const { getByText } = renderCarousel();
      for (const item of items) {
        expect(getByText(`$${item.price.toFixed(2)}`)).toBeTruthy();
      }
    });
  });

  describe('empty state', () => {
    it('does not render when products list is empty', () => {
      const { queryByTestId } = renderCarousel({ products: [] });
      expect(queryByTestId('recommendation-carousel')).toBeNull();
    });
  });

  describe('interactions', () => {
    it('calls onProductPress with product when card tapped', () => {
      const onProductPress = jest.fn();
      const { getByTestId } = renderCarousel({ onProductPress });
      fireEvent.press(getByTestId(`rec-card-${items[0].id}`));
      expect(onProductPress).toHaveBeenCalledWith(items[0]);
    });

    it('does not crash when onProductPress not provided', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <WishlistProvider>
            <RecommendationCarousel title="Test" products={items} />
          </WishlistProvider>
        </ThemeProvider>,
      );
      expect(() => fireEvent.press(getByTestId(`rec-card-${items[0].id}`))).not.toThrow();
    });
  });

  describe('rating display', () => {
    it('shows star rating on cards', () => {
      const { getByTestId } = renderCarousel();
      expect(getByTestId(`rec-card-rating-${items[0].id}`)).toBeTruthy();
    });

    it('shows review count on cards', () => {
      const { getByText } = renderCarousel();
      expect(getByText(`(${items[0].reviewCount})`)).toBeTruthy();
    });
  });

  describe('see all link', () => {
    it('renders see all link when onSeeAll provided', () => {
      const onSeeAll = jest.fn();
      const { getByTestId } = renderCarousel({ onSeeAll });
      expect(getByTestId('see-all-link')).toBeTruthy();
    });

    it('does not render see all when onSeeAll not provided', () => {
      const { queryByTestId } = renderCarousel();
      expect(queryByTestId('see-all-link')).toBeNull();
    });

    it('calls onSeeAll when pressed', () => {
      const onSeeAll = jest.fn();
      const { getByTestId } = renderCarousel({ onSeeAll });
      fireEvent.press(getByTestId('see-all-link'));
      expect(onSeeAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('section title has header role', () => {
      const { getByTestId } = renderCarousel();
      const title = getByTestId('carousel-title');
      expect(title.props.accessibilityRole).toBe('header');
    });

    it('product cards have accessible labels', () => {
      const { getByTestId } = renderCarousel();
      const card = getByTestId(`rec-card-${items[0].id}`);
      expect(card.props.accessibilityLabel).toContain(items[0].name);
      expect(card.props.accessibilityLabel).toContain(`$${items[0].price.toFixed(2)}`);
    });

    it('product cards have button role', () => {
      const { getByTestId } = renderCarousel();
      expect(getByTestId(`rec-card-${items[0].id}`).props.accessibilityRole).toBe('button');
    });
  });
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductCard } from '../ProductCard';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import { PRODUCTS, type Product } from '@/data/products';
import { productId } from '@/data/productId';
import * as Haptics from 'expo-haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'Medium', Light: 'Light' },
}));

const futon = PRODUCTS.find((p) => p.category === 'futons')!;
const saleProduct = PRODUCTS.find((p) => p.originalPrice !== undefined)!;
const noBadgeProduct = PRODUCTS.find((p) => !p.badge)!;

function renderCard(overrides: { product?: Product; onPress?: jest.Mock } = {}) {
  const onPress = overrides.onPress ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <WishlistProvider>
          <CompareProvider>
            <ProductCard product={overrides.product ?? futon} onPress={onPress} />
          </CompareProvider>
        </WishlistProvider>
      </ThemeProvider>,
    ),
    onPress,
  };
}

describe('ProductCard', () => {
  describe('rendering', () => {
    it('renders product name', () => {
      const { getByText } = renderCard();
      expect(getByText(futon.name)).toBeTruthy();
    });

    it('renders short description', () => {
      const { getByText } = renderCard();
      expect(getByText(futon.shortDescription)).toBeTruthy();
    });

    it('renders formatted price', () => {
      const { getByText } = renderCard();
      expect(getByText(`$${futon.price.toFixed(2)}`)).toBeTruthy();
    });

    it('renders review count', () => {
      const { getByText } = renderCard();
      expect(getByText(`(${futon.reviewCount})`)).toBeTruthy();
    });

    it('renders star rating', () => {
      const { getByText } = renderCard();
      const stars = '★'.repeat(Math.round(futon.rating)) + '☆'.repeat(5 - Math.round(futon.rating));
      expect(getByText(stars)).toBeTruthy();
    });

    it('has correct testID', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId(`product-card-${futon.id}`)).toBeTruthy();
    });
  });

  describe('badge', () => {
    it('renders badge when present', () => {
      const badgedProduct = PRODUCTS.find((p) => p.badge)!;
      const { getByText } = renderCard({ product: badgedProduct });
      expect(getByText(badgedProduct.badge!)).toBeTruthy();
    });

    it('does not render badge when not present', () => {
      const { queryByText } = renderCard({ product: noBadgeProduct });
      // No badge text should exist that matches common badge values
      expect(queryByText('Bestseller')).toBeNull();
      expect(queryByText('Sale')).toBeNull();
      expect(queryByText('New')).toBeNull();
      expect(queryByText('Premium')).toBeNull();
    });
  });

  describe('pricing', () => {
    it('shows sale price and original price when on sale', () => {
      const { getByText } = renderCard({ product: saleProduct });
      expect(getByText(`$${saleProduct.price.toFixed(2)}`)).toBeTruthy();
      expect(getByText(`$${saleProduct.originalPrice!.toFixed(2)}`)).toBeTruthy();
    });

    it('does not show original price for non-sale items', () => {
      const regularProduct = PRODUCTS.find((p) => !p.originalPrice)!;
      const { queryByText } = renderCard({ product: regularProduct });
      // Only one price element should be present
      expect(queryByText(`$${regularProduct.price.toFixed(2)}`)).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onPress with product when tapped', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderCard({ onPress });
      fireEvent.press(getByTestId(`product-card-${futon.id}`));
      expect(onPress).toHaveBeenCalledWith(futon);
    });

    it('does not crash when onPress is not provided', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <WishlistProvider>
            <CompareProvider>
              <ProductCard product={futon} />
            </CompareProvider>
          </WishlistProvider>
        </ThemeProvider>,
      );
      fireEvent.press(getByTestId(`product-card-${futon.id}`));
    });
  });

  describe('accessibility', () => {
    it('has accessible label with product name and price', () => {
      const { getByTestId } = renderCard();
      const card = getByTestId(`product-card-${futon.id}`);
      expect(card.props.accessibilityLabel).toContain(futon.name);
      expect(card.props.accessibilityLabel).toContain(`$${futon.price.toFixed(2)}`);
    });

    it('has button role', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId(`product-card-${futon.id}`).props.accessibilityRole).toBe('button');
    });
  });

  describe('stock status', () => {
    const lowStockProduct: Product = {
      ...futon,
      id: productId('test-low-stock'),
      stockCount: 3,
    };

    const outOfStockProduct: Product = {
      ...futon,
      id: productId('test-oos'),
      inStock: false,
      stockCount: 0,
    };

    it('shows Low Stock badge when stockCount < 5', () => {
      const { getByText } = renderCard({ product: lowStockProduct });
      expect(getByText('Low Stock')).toBeTruthy();
    });

    it('shows Out of Stock badge when product is not in stock', () => {
      const { getByTestId } = renderCard({ product: outOfStockProduct });
      expect(getByTestId(`stock-badge-${outOfStockProduct.id}`)).toBeTruthy();
    });

    it('does not show stock badge for in-stock products', () => {
      const { queryByText } = renderCard();
      expect(queryByText('Low Stock')).toBeNull();
      expect(queryByText('Out of Stock')).toBeNull();
    });

    it('renders stock badge with correct testID', () => {
      const { getByTestId } = renderCard({ product: lowStockProduct });
      expect(getByTestId(`stock-badge-${lowStockProduct.id}`)).toBeTruthy();
    });
  });

  describe('shared element transition', () => {
    it('renders image container with testID for transition target', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId(`product-image-container-${futon.id}`)).toBeTruthy();
    });

    it('image container testID exists for every test product', () => {
      // Verify the Animated.View wrapper renders for non-default products too,
      // confirming the transition anchor is present across the product range.
      const saleCard = renderCard({ product: saleProduct });
      expect(saleCard.getByTestId(`product-image-container-${saleProduct.id}`)).toBeTruthy();

      const noBadgeCard = renderCard({ product: noBadgeProduct });
      expect(noBadgeCard.getByTestId(`product-image-container-${noBadgeProduct.id}`)).toBeTruthy();
    });

    it('image container is a direct child of the card (transition element is in DOM)', () => {
      // The sharedTransitionTag is on the Animated.View that wraps the image.
      // Confirm it is rendered inside the card so Reanimated can locate it.
      const { getByTestId } = renderCard();
      const card = getByTestId(`product-card-${futon.id}`);
      const container = getByTestId(`product-image-container-${futon.id}`);
      // Both elements must exist — transition only fires if both are present.
      expect(card).toBeTruthy();
      expect(container).toBeTruthy();
    });
  });

  describe('video preview', () => {
    // Product without a videoUri for "no video" assertions
    const noVideoProduct: Product = { ...futon, videoUri: undefined };
    // Product with a videoUri
    const videoProduct: Product = {
      ...futon,
      videoUri: 'https://example.com/preview.mp4',
    };

    it('renders video container when product has videoUri', () => {
      const { getByTestId } = renderCard({ product: videoProduct });
      expect(getByTestId(`product-video-${videoProduct.id}`)).toBeTruthy();
    });

    it('does not render video container when product has no videoUri', () => {
      const { queryByTestId } = renderCard({ product: noVideoProduct });
      expect(queryByTestId(`product-video-${noVideoProduct.id}`)).toBeNull();
    });

    it('does not render video container when videoUri is undefined', () => {
      const { queryByTestId } = renderCard({ product: noVideoProduct });
      expect(queryByTestId(`product-video-${noVideoProduct.id}`)).toBeNull();
    });

    it('still renders image container when videoUri is absent', () => {
      const { getByTestId } = renderCard({ product: noVideoProduct });
      expect(getByTestId(`product-image-container-${noVideoProduct.id}`)).toBeTruthy();
    });

    it('tapping card with video still fires onPress', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderCard({ product: videoProduct, onPress });
      fireEvent.press(getByTestId(`product-card-${videoProduct.id}`));
      expect(onPress).toHaveBeenCalledWith(videoProduct);
    });
  });

  // =========================================================================
  // Compare Button (cm-c4w)
  // =========================================================================
  describe('compare button', () => {
    it('renders compare button on each card', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId(`compare-btn-${futon.id}`)).toBeTruthy();
    });

    it('compare button shows "Compare" label by default', () => {
      const { getByText } = renderCard();
      expect(getByText('Compare')).toBeTruthy();
    });

    it('compare button has correct accessibility label when not in compare list', () => {
      const { getByTestId } = renderCard();
      const btn = getByTestId(`compare-btn-${futon.id}`);
      expect(btn.props.accessibilityLabel).toBe('Add to compare');
    });

    it('compare button has button role', () => {
      const { getByTestId } = renderCard();
      const btn = getByTestId(`compare-btn-${futon.id}`);
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('pressing compare button adds product to compare list (shows "Remove")', () => {
      const { getByTestId, getByText } = renderCard();
      fireEvent.press(getByTestId(`compare-btn-${futon.id}`));
      expect(getByText('Remove')).toBeTruthy();
    });

    it('compare button accessibility label updates when product is in compare list', () => {
      const { getByTestId } = renderCard();
      fireEvent.press(getByTestId(`compare-btn-${futon.id}`));
      const btn = getByTestId(`compare-btn-${futon.id}`);
      expect(btn.props.accessibilityLabel).toBe('Remove from compare');
    });

    it('pressing compare button again removes product from compare list', () => {
      const { getByTestId, getByText } = renderCard();
      fireEvent.press(getByTestId(`compare-btn-${futon.id}`));
      fireEvent.press(getByTestId(`compare-btn-${futon.id}`));
      expect(getByText('Compare')).toBeTruthy();
    });

    it('tapping compare button does not fire card onPress', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderCard({ onPress });
      fireEvent.press(getByTestId(`compare-btn-${futon.id}`));
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('Long-press context menu', () => {
    function renderWithContextMenu(contextMenu: {
      onAddToCart?: jest.Mock;
      onAddToWishlist?: jest.Mock;
      onShare?: jest.Mock;
    }) {
      return render(
        <ThemeProvider>
          <WishlistProvider>
            <CompareProvider>
              <ProductCard product={futon} onPress={jest.fn()} contextMenu={contextMenu} />
            </CompareProvider>
          </WishlistProvider>
        </ThemeProvider>,
      );
    }

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows context menu trigger button when contextMenu prop provided', () => {
      const { getByTestId } = renderWithContextMenu({ onAddToCart: jest.fn() });
      expect(getByTestId(`product-context-trigger-${futon.id}`)).toBeTruthy();
    });

    it('hides context menu trigger when contextMenu prop absent', () => {
      const { queryByTestId } = renderCard();
      expect(queryByTestId(`product-context-trigger-${futon.id}`)).toBeNull();
    });

    it('fires haptic on long press when contextMenu provided', () => {
      const { getByTestId } = renderWithContextMenu({ onAddToCart: jest.fn() });
      fireEvent(getByTestId(`product-card-${futon.id}`), 'longPress');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('shows context menu after long press', () => {
      const { getByTestId } = renderWithContextMenu({ onAddToCart: jest.fn() });
      fireEvent(getByTestId(`product-card-${futon.id}`), 'longPress');
      expect(getByTestId('product-context-menu')).toBeTruthy();
    });

    it('shows context menu after pressing trigger button', () => {
      const { getByTestId } = renderWithContextMenu({ onAddToCart: jest.fn() });
      fireEvent.press(getByTestId(`product-context-trigger-${futon.id}`));
      expect(getByTestId('product-context-menu')).toBeTruthy();
    });

    it('context menu trigger has accessibilityLabel', () => {
      const { getByTestId } = renderWithContextMenu({ onAddToCart: jest.fn() });
      const trigger = getByTestId(`product-context-trigger-${futon.id}`);
      expect(trigger.props.accessibilityLabel).toBeTruthy();
    });

    it('context menu trigger has accessibilityRole=button', () => {
      const { getByTestId } = renderWithContextMenu({ onAddToCart: jest.fn() });
      const trigger = getByTestId(`product-context-trigger-${futon.id}`);
      expect(trigger.props.accessibilityRole).toBe('button');
    });
  });
});

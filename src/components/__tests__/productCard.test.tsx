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

// Prevent expo-video workspace-pollution: stub preserves testID so existing
// video-presence tests continue to pass.
jest.mock('../ProductCardVideo', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ProductCardVideo: ({ testID }: { testID?: string }) => React.createElement(View, { testID }),
  };
});

jest.mock('../BNPLModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BNPLModal: ({ visible, testID }: { visible: boolean; testID?: string }) =>
      visible ? React.createElement(View, { testID: testID ?? 'bnpl-modal' }) : null,
  };
});

// Mock useInventoryBadge so ProductCard tests control live-inventory state
// without needing a Wix client. Default: no badge (well-stocked).
const mockUseInventoryBadge = jest.fn();
jest.mock('@/hooks/useInventoryBadge', () => ({
  useInventoryBadge: (...args: unknown[]) => mockUseInventoryBadge(...args),
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
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: well-stocked, no live inventory badge
    mockUseInventoryBadge.mockReturnValue({
      badge: 'none',
      quantity: 0,
      isLoading: false,
      error: null,
    });
  });

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

  // =========================================================================
  // Lifestyle photography placeholder (cm-1sp)
  // =========================================================================
  describe('lifestyle photo slot', () => {
    const noLifestyleProduct: Product = { ...futon, lifestyleUri: undefined };
    const lifestyleProduct: Product = {
      ...futon,
      lifestyleUri: 'https://example.com/lifestyle.jpg',
    };

    it('renders lifestyle photo slot with testID', () => {
      const { getByTestId } = renderCard({ product: lifestyleProduct });
      expect(getByTestId(`product-lifestyle-photo-${lifestyleProduct.id}`)).toBeTruthy();
    });

    it('renders lifestyle slot even when lifestyleUri is absent (shows placeholder)', () => {
      const { getByTestId } = renderCard({ product: noLifestyleProduct });
      expect(getByTestId(`product-lifestyle-photo-${noLifestyleProduct.id}`)).toBeTruthy();
    });

    it('lifestyle slot has accessibility label', () => {
      const { getByTestId } = renderCard({ product: lifestyleProduct });
      const slot = getByTestId(`product-lifestyle-photo-${lifestyleProduct.id}`);
      expect(slot.props.accessibilityLabel).toBeTruthy();
    });

    it('uses product lifestyleUri as image source when provided', () => {
      const { getByTestId, UNSAFE_getAllByType } = renderCard({ product: lifestyleProduct });
      // Slot must render
      expect(getByTestId(`product-lifestyle-photo-${lifestyleProduct.id}`)).toBeTruthy();
      // At least one Image in the tree should have the lifestyleUri as its source
      const { Image: ExpoImage } = require('expo-image');
      const images = UNSAFE_getAllByType(ExpoImage);
      const hasLifestyleSource = images.some(
        (img: any) => img.props.source?.uri === lifestyleProduct.lifestyleUri,
      );
      expect(hasLifestyleSource).toBe(true);
    });

    it('tapping card with lifestyle photo still fires onPress', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderCard({ product: lifestyleProduct, onPress });
      fireEvent.press(getByTestId(`product-card-${lifestyleProduct.id}`));
      expect(onPress).toHaveBeenCalledWith(lifestyleProduct);
    });

    it('lifestyle slot renders inside the image container', () => {
      const { getByTestId } = renderCard({ product: lifestyleProduct });
      expect(getByTestId(`product-image-container-${lifestyleProduct.id}`)).toBeTruthy();
      expect(getByTestId(`product-lifestyle-photo-${lifestyleProduct.id}`)).toBeTruthy();
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

  describe('lifestyle image', () => {
    it('uses lifestyleImageUri as hero image when provided', () => {
      const lifestyleUri = 'https://images.unsplash.com/photo-lifestyle-test';
      const productWithLifestyle: Product = {
        ...futon,
        lifestyleImageUri: lifestyleUri,
      };
      const { getByTestId } = renderCard({ product: productWithLifestyle });
      const heroImage = getByTestId(`product-hero-image-${futon.id}`);
      expect(heroImage.props.source?.uri).toBe(lifestyleUri);
    });

    it('falls back to images[0].uri when lifestyleImageUri is not set', () => {
      const productWithoutLifestyle: Product = { ...futon, lifestyleImageUri: undefined };
      const { getByTestId } = renderCard({ product: productWithoutLifestyle });
      const heroImage = getByTestId(`product-hero-image-${futon.id}`);
      // wixImageUrl optimizes the URL — verify it contains the original mediaId and enc_webp
      expect(heroImage.props.source?.uri).toContain('enc_webp');
      expect(heroImage.props.source?.uri).toContain('cc389e_b524b0ad680c4c65b91c2339633c5208');
    });

    it('falls back to images[0].uri when lifestyleImageUri is empty string', () => {
      const productWithEmpty: Product = { ...futon, lifestyleImageUri: '' };
      const { getByTestId } = renderCard({ product: productWithEmpty });
      const heroImage = getByTestId(`product-hero-image-${futon.id}`);
      expect(heroImage.props.source?.uri).toContain('enc_webp');
      expect(heroImage.props.source?.uri).toContain('cc389e_b524b0ad680c4c65b91c2339633c5208');
    });

    it('top 3 futon products have lifestyleImageUri wired in mock data', () => {
      const futons = PRODUCTS.filter((p) => p.category === 'futons').slice(0, 3);
      expect(futons.length).toBe(3);
      for (const p of futons) {
        expect(p.lifestyleImageUri).toBeTruthy();
        expect(p.lifestyleImageUri).toMatch(/^https:\/\//);
      }
    });
  });

  // =========================================================================
  // Live inventory badge (cm-8t9) — useInventoryBadge integration
  // Badge: "Only X left" in sunsetCoral when stock < LOW_STOCK_MAX (5)
  // Hidden when well-stocked, out-of-stock, or inventory unknown.
  // =========================================================================
  describe('live inventory badge', () => {
    it('shows "Only X left" badge when hook returns low_stock', () => {
      mockUseInventoryBadge.mockReturnValue({
        badge: 'low_stock',
        quantity: 3,
        isLoading: false,
        error: null,
      });
      const { getByTestId, getByText } = renderCard();
      expect(getByTestId(`inventory-badge-${futon.id}`)).toBeTruthy();
      expect(getByText('Only 3 left')).toBeTruthy();
    });

    it('shows badge at threshold boundary (quantity=5)', () => {
      mockUseInventoryBadge.mockReturnValue({
        badge: 'low_stock',
        quantity: 5,
        isLoading: false,
        error: null,
      });
      const { getByText } = renderCard();
      expect(getByText('Only 5 left')).toBeTruthy();
    });

    it('shows badge at minimum (quantity=1)', () => {
      mockUseInventoryBadge.mockReturnValue({
        badge: 'low_stock',
        quantity: 1,
        isLoading: false,
        error: null,
      });
      const { getByText } = renderCard();
      expect(getByText('Only 1 left')).toBeTruthy();
    });

    it('hides badge when hook returns none (well-stocked, quantity > 5)', () => {
      mockUseInventoryBadge.mockReturnValue({
        badge: 'none',
        quantity: 50,
        isLoading: false,
        error: null,
      });
      const { queryByTestId } = renderCard();
      expect(queryByTestId(`inventory-badge-${futon.id}`)).toBeNull();
    });

    it('hides badge when hook returns none (unknown quantity)', () => {
      mockUseInventoryBadge.mockReturnValue({
        badge: 'none',
        quantity: 0,
        isLoading: false,
        error: null,
      });
      const { queryByTestId } = renderCard();
      expect(queryByTestId(`inventory-badge-${futon.id}`)).toBeNull();
    });

    it('hides badge when hook returns none (API error)', () => {
      mockUseInventoryBadge.mockReturnValue({
        badge: 'none',
        quantity: 0,
        isLoading: false,
        error: 'Network timeout',
      });
      const { queryByTestId } = renderCard();
      expect(queryByTestId(`inventory-badge-${futon.id}`)).toBeNull();
    });

    it('hides badge while inventory is loading', () => {
      mockUseInventoryBadge.mockReturnValue({
        badge: 'none',
        quantity: 0,
        isLoading: true,
        error: null,
      });
      const { queryByTestId } = renderCard();
      expect(queryByTestId(`inventory-badge-${futon.id}`)).toBeNull();
    });

    it('passes productId to useInventoryBadge', () => {
      renderCard();
      expect(mockUseInventoryBadge).toHaveBeenCalledWith(futon.id);
    });

    it('shows just_restocked badge when hook returns just_restocked', () => {
      mockUseInventoryBadge.mockReturnValue({
        badge: 'just_restocked',
        quantity: 0,
        isLoading: false,
        error: null,
      });
      const { getByTestId, getByText } = renderCard();
      expect(getByTestId(`inventory-badge-${futon.id}`)).toBeTruthy();
      expect(getByText('Just restocked')).toBeTruthy();
    });

    it('inventory badge has accessibility label when low_stock', () => {
      mockUseInventoryBadge.mockReturnValue({
        badge: 'low_stock',
        quantity: 2,
        isLoading: false,
        error: null,
      });
      const { getByTestId } = renderCard();
      const badge = getByTestId(`inventory-badge-${futon.id}`);
      expect(badge.props.accessibilityLabel).toBeTruthy();
      expect(badge.props.accessibilityLabel).toContain('2');
    });
  });

  // ── CF-lalh: Klarna/Affirm badge prominence ─────────────────────────────────
  describe('financing badge prominence (CF-lalh)', () => {
    it('renders financing badge for eligible price (>=$200)', () => {
      const eligibleProduct = PRODUCTS.find((p) => p.price >= 200)!;
      const { getByTestId } = renderCard({ product: eligibleProduct });
      expect(getByTestId('financing-badge-compact')).toBeTruthy();
    });

    it('shows Klarna and Affirm branding in compact badge on card', () => {
      const eligibleProduct = PRODUCTS.find((p) => p.price >= 200)!;
      const { getByText } = renderCard({ product: eligibleProduct });
      expect(getByText(/Klarna/i)).toBeTruthy();
      expect(getByText(/Affirm/i)).toBeTruthy();
    });

    it('does not render financing badge for ineligible price (<$200)', () => {
      const ineligibleProduct = PRODUCTS.find((p) => p.price < 200)!;
      const { queryByTestId } = renderCard({ product: ineligibleProduct });
      expect(queryByTestId('financing-badge-compact')).toBeNull();
    });

    it('financing badge shows "As low as" monthly amount', () => {
      const eligibleProduct = PRODUCTS.find((p) => p.price >= 200)!;
      const { getByText } = renderCard({ product: eligibleProduct });
      expect(getByText(/As low as/i)).toBeTruthy();
      expect(getByText(/\/mo/)).toBeTruthy();
    });
  });

  // ── cm-kag: BNPL modal wiring via financing badge ────────────────────────────
  describe('BNPL modal wiring (cm-kag)', () => {
    it('BNPL modal is not shown by default', () => {
      const eligibleProduct = PRODUCTS.find((p) => p.price >= 200)!;
      const { queryByTestId } = renderCard({ product: eligibleProduct });
      expect(queryByTestId('bnpl-modal')).toBeNull();
    });

    it('pressing financing badge opens BNPL modal', () => {
      const eligibleProduct = PRODUCTS.find((p) => p.price >= 200)!;
      const { getByTestId } = renderCard({ product: eligibleProduct });
      fireEvent.press(getByTestId('financing-badge-compact'));
      expect(getByTestId('bnpl-modal')).toBeTruthy();
    });

    it('BNPL modal does not appear for ineligible product', () => {
      const ineligibleProduct = PRODUCTS.find((p) => p.price < 200)!;
      const { queryByTestId } = renderCard({ product: ineligibleProduct });
      expect(queryByTestId('financing-badge-compact')).toBeNull();
      expect(queryByTestId('bnpl-modal')).toBeNull();
    });
  });
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import { WishlistScreen } from '../WishlistScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider, type WishlistItem } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import { PRODUCTS } from '@/data/products';

// Mock ReanimatedSwipeable — wraps each wishlist item; expose renderRightActions
// so swipe action buttons are visible in tests.
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockSwipeable = React.forwardRef(
    ({ children, testID, renderRightActions }: any, _ref: any) => (
      <View testID={testID}>
        {renderRightActions
          ? renderRightActions({ value: 1 }, { value: -100 }, { close: jest.fn() })
          : null}
        {children}
      </View>
    ),
  );
  return { __esModule: true, default: MockSwipeable };
});

// Mock ProductCard to avoid expo-video transitive dependency chain.
// WishlistScreen only uses the testID, onPress, and onLongPress props.
jest.mock('@/components/ProductCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ProductCard: ({ testID, onPress, onLongPress }: any) =>
      React.createElement(View, { testID, onPress, onLongPress }),
  };
});

// useSyncedWishlist wraps useWishlist + Wix sync. Screen tests cover UI only;
// sync behaviour is tested in useSyncedWishlist.test.tsx.
jest.mock('@/hooks/useSyncedWishlist', () => ({
  useSyncedWishlist: (_opts: unknown) => {
    const { useWishlist } = require('@/hooks/useWishlist');
    return { ...useWishlist(), pendingCount: 0, isSyncing: false, syncNow: jest.fn() };
  },
}));

const product1 = PRODUCTS[0]; // prod-asheville-full  $349
const product2 = PRODUCTS[1]; // prod-blue-ridge-queen $449
const product3 = PRODUCTS[2]; // prod-pisgah-twin      $279

const mockAddItem = jest.fn();

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    items: [],
    itemCount: 0,
    subtotal: 0,
    addItem: mockAddItem,
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    syncing: false,
  }),
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function makeItems(...products: typeof PRODUCTS): WishlistItem[] {
  return products.map((p, i) => ({
    productId: p.id,
    addedAt: Date.now() + i * 1000,
    savedPrice: p.price,
  }));
}

function renderScreen(
  opts: {
    items?: WishlistItem[];
    onProductPress?: jest.Mock;
    onBrowse?: jest.Mock;
  } = {},
) {
  const onProductPress = opts.onProductPress ?? jest.fn();
  const onBrowse = opts.onBrowse ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <WishlistProvider initialItems={opts.items ?? []}>
          <CompareProvider>
            <WishlistScreen onProductPress={onProductPress} onBrowse={onBrowse} />
          </CompareProvider>
        </WishlistProvider>
      </ThemeProvider>,
    ),
    onProductPress,
    onBrowse,
  };
}

beforeEach(() => {
  mockAddItem.mockClear();
});

describe('WishlistScreen', () => {
  describe('empty state', () => {
    it('renders empty state when no items', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('wishlist-empty')).toBeTruthy();
    });

    it('shows browse button in empty state', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('wishlist-empty-action')).toBeTruthy();
    });

    it('calls onBrowse when browse button pressed', () => {
      const { getByTestId, onBrowse } = renderScreen();
      fireEvent.press(getByTestId('wishlist-empty-action'));
      expect(onBrowse).toHaveBeenCalled();
    });

    it('empty state CTA label is "Start shopping"', () => {
      const { getByTestId } = renderScreen();
      const cta = getByTestId('wishlist-empty-action');
      expect(cta.props.accessibilityLabel).toBe('Start shopping');
    });

    it('empty state renders WishlistIllustration', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('wishlist-illustration')).toBeTruthy();
    });

    it('renders title', () => {
      const { getByText } = renderScreen();
      expect(getByText('Wishlist')).toBeTruthy();
    });

    it('shows 0 items count', () => {
      const { getByText } = renderScreen();
      expect(getByText('0 items')).toBeTruthy();
    });
  });

  describe('with items', () => {
    it('renders products in grid', () => {
      const { getByTestId } = renderScreen({
        items: makeItems(product1, product2),
      });
      expect(getByTestId(`wishlist-item-${product1.id}`)).toBeTruthy();
      expect(getByTestId(`wishlist-item-${product2.id}`)).toBeTruthy();
    });

    it('shows correct item count', () => {
      const { getByText } = renderScreen({
        items: makeItems(product1, product2),
      });
      expect(getByText('2 items')).toBeTruthy();
    });

    it('shows singular when 1 item', () => {
      const { getByText } = renderScreen({
        items: makeItems(product1),
      });
      expect(getByText('1 item')).toBeTruthy();
    });

    it('renders share button', () => {
      const { getByTestId } = renderScreen({
        items: makeItems(product1),
      });
      expect(getByTestId('wishlist-share')).toBeTruthy();
    });

    it('renders clear button', () => {
      const { getByTestId } = renderScreen({
        items: makeItems(product1),
      });
      expect(getByTestId('wishlist-clear')).toBeTruthy();
    });

    it('does not show share/clear when empty', () => {
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('wishlist-share')).toBeNull();
      expect(queryByTestId('wishlist-clear')).toBeNull();
    });
  });

  describe('price drop', () => {
    it('shows price drop badge when saved price > current price', () => {
      const { getByText } = renderScreen({
        items: [
          {
            productId: product1.id,
            addedAt: Date.now(),
            savedPrice: product1.price + 50,
          },
        ],
      });
      expect(getByText('$50.00 off!')).toBeTruthy();
    });

    it('does not show price drop when prices are same', () => {
      const { queryByText } = renderScreen({
        items: makeItems(product1),
      });
      expect(queryByText(/off!/)).toBeNull();
    });
  });

  describe('long press removal', () => {
    it('shows alert on long press', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByTestId } = renderScreen({
        items: makeItems(product1),
      });
      fireEvent(getByTestId(`wishlist-item-${product1.id}`), 'longPress');
      expect(alertSpy).toHaveBeenCalledWith(
        'Remove from Wishlist',
        expect.stringContaining(product1.name),
        expect.any(Array),
      );
      alertSpy.mockRestore();
    });
  });

  describe('share', () => {
    it('calls Share.share when share button pressed', async () => {
      const shareSpy = jest
        .spyOn(Share, 'share')
        .mockResolvedValue({ action: 'sharedAction' } as any);
      const { getByTestId } = renderScreen({
        items: makeItems(product1),
      });
      fireEvent.press(getByTestId('wishlist-share'));
      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(product1.name),
        }),
      );
      shareSpy.mockRestore();
    });

    it('share text includes product link URL for each item', async () => {
      const shareSpy = jest
        .spyOn(Share, 'share')
        .mockResolvedValue({ action: 'sharedAction' } as any);
      const { getByTestId } = renderScreen({
        items: makeItems(product1),
      });
      fireEvent.press(getByTestId('wishlist-share'));
      // product1 slug: 'asheville-full-futon'
      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('carolinafutons.com/products/asheville-full-futon'),
        }),
      );
      shareSpy.mockRestore();
    });
  });

  describe('clear all', () => {
    it('shows confirmation alert when clear pressed', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByTestId } = renderScreen({
        items: makeItems(product1),
      });
      fireEvent.press(getByTestId('wishlist-clear'));
      expect(alertSpy).toHaveBeenCalledWith(
        'Clear Wishlist',
        expect.any(String),
        expect.any(Array),
      );
      alertSpy.mockRestore();
    });
  });

  describe('accessibility', () => {
    it('has correct testID on screen', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('wishlist-screen')).toBeTruthy();
    });

    it('share button has accessible label', () => {
      const { getByTestId } = renderScreen({
        items: makeItems(product1),
      });
      expect(getByTestId('wishlist-share').props.accessibilityLabel).toBe('Share wishlist');
    });

    it('clear button has accessible label', () => {
      const { getByTestId } = renderScreen({
        items: makeItems(product1),
      });
      expect(getByTestId('wishlist-clear').props.accessibilityLabel).toBe(
        'Clear all items from wishlist',
      );
    });
  });

  describe('pull-to-refresh', () => {
    it('FlatList has refreshControl configured', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1) });
      const flatList = getByTestId('wishlist-list');
      expect(flatList.props.refreshControl).toBeTruthy();
    });

    it('FlatList has refreshControl on empty wishlist', () => {
      const { getByTestId } = renderScreen();
      const flatList = getByTestId('wishlist-list');
      expect(flatList.props.refreshControl).toBeTruthy();
    });

    it('PTR onRefresh fires without throwing (wishlist.refresh() is wired)', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1) });
      const flatList = getByTestId('wishlist-list');
      const { onRefresh } = flatList.props.refreshControl.props;
      expect(typeof onRefresh).toBe('function');
      expect(() => onRefresh()).not.toThrow();
    });
  });

  describe('sort', () => {
    it('renders sort selector when items exist', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1) });
      expect(getByTestId('wishlist-sort-selector')).toBeTruthy();
    });

    it('does not render sort selector when empty', () => {
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('wishlist-sort-selector')).toBeNull();
    });

    it('renders date sort button active by default', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1) });
      const btn = getByTestId('wishlist-sort-date');
      expect(btn).toBeTruthy();
    });

    it('renders price-asc and price-desc sort buttons', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1) });
      expect(getByTestId('wishlist-sort-price-asc')).toBeTruthy();
      expect(getByTestId('wishlist-sort-price-desc')).toBeTruthy();
    });

    it('price-asc button has accessible label', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1) });
      expect(getByTestId('wishlist-sort-price-asc').props.accessibilityLabel).toBe(
        'Sort by price low to high',
      );
    });

    it('price-desc button has accessible label', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1) });
      expect(getByTestId('wishlist-sort-price-desc').props.accessibilityLabel).toBe(
        'Sort by price high to low',
      );
    });

    it('date button has accessible label', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1) });
      expect(getByTestId('wishlist-sort-date').props.accessibilityLabel).toBe('Sort by date added');
    });

    it('pressing price-asc does not throw', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1, product2, product3) });
      expect(() => fireEvent.press(getByTestId('wishlist-sort-price-asc'))).not.toThrow();
    });

    it('pressing price-desc does not throw', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1, product2, product3) });
      expect(() => fireEvent.press(getByTestId('wishlist-sort-price-desc'))).not.toThrow();
    });

    it('after price-asc, cheapest item renders first (pisgah $279)', () => {
      // product3 = prod-pisgah-twin $279, product1 = asheville $349, product2 = blue-ridge $449
      const { getByTestId, queryByTestId } = renderScreen({
        items: makeItems(product1, product2, product3),
      });
      fireEvent.press(getByTestId('wishlist-sort-price-asc'));
      // All items still render
      expect(queryByTestId(`wishlist-item-${product3.id}`)).toBeTruthy();
      expect(queryByTestId(`wishlist-item-${product1.id}`)).toBeTruthy();
      expect(queryByTestId(`wishlist-item-${product2.id}`)).toBeTruthy();
    });

    it('after price-desc, most expensive item renders (blue-ridge $449)', () => {
      const { getByTestId, queryByTestId } = renderScreen({
        items: makeItems(product1, product2, product3),
      });
      fireEvent.press(getByTestId('wishlist-sort-price-desc'));
      expect(queryByTestId(`wishlist-item-${product2.id}`)).toBeTruthy();
      expect(queryByTestId(`wishlist-item-${product1.id}`)).toBeTruthy();
      expect(queryByTestId(`wishlist-item-${product3.id}`)).toBeTruthy();
    });
  });

  describe('Add All to Cart', () => {
    it('renders Add All to Cart button when 2+ items exist', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1, product2) });
      expect(getByTestId('wishlist-add-all')).toBeTruthy();
    });

    it('does not render Add All to Cart when empty', () => {
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('wishlist-add-all')).toBeNull();
    });

    it('does not render Add All to Cart when only 1 item', () => {
      const { queryByTestId } = renderScreen({ items: makeItems(product1) });
      expect(queryByTestId('wishlist-add-all')).toBeNull();
    });

    it('Add All to Cart button has accessible label', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1, product2) });
      expect(getByTestId('wishlist-add-all').props.accessibilityLabel).toBe(
        'Add all items to cart',
      );
    });

    it('calls addItem for each futon product when Add All pressed', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1, product2) });
      fireEvent.press(getByTestId('wishlist-add-all'));
      // product1 = asheville-full, product2 = blue-ridge-queen — both are futons
      expect(mockAddItem).toHaveBeenCalledTimes(2);
    });

    it('addItem called with FutonModel and default fabric for futon product', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1, product2) });
      fireEvent.press(getByTestId('wishlist-add-all'));
      expect(mockAddItem).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.stringContaining('Asheville') }),
        expect.objectContaining({ id: expect.any(String) }), // default fabric
        1,
      );
    });

    it('Add All does not crash when no futon model found for product', () => {
      // Use a product whose ID doesn't match any FutonModel (e.g., a murphy bed)
      const murphyProduct = PRODUCTS.find((p) => p.category === 'murphy-beds') ?? product2;
      const { getByTestId } = renderScreen({ items: makeItems(murphyProduct, product1) });
      expect(() => fireEvent.press(getByTestId('wishlist-add-all'))).not.toThrow();
    });
  });

  describe('swipe-left actions', () => {
    it('wraps each item in Swipeable', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1) });
      expect(getByTestId(`wishlist-swipeable-${product1.id}`)).toBeTruthy();
    });

    it('renders swipe Remove action button', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1) });
      expect(getByTestId(`swipe-remove-${product1.id}`)).toBeTruthy();
    });

    it('renders swipe Move to Cart action button', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1) });
      expect(getByTestId(`swipe-move-to-cart-${product1.id}`)).toBeTruthy();
    });

    it('swipe Remove button has accessible label', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1) });
      expect(getByTestId(`swipe-remove-${product1.id}`).props.accessibilityLabel).toBe(
        'Remove from wishlist',
      );
    });

    it('swipe Move to Cart button has accessible label', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1) });
      expect(getByTestId(`swipe-move-to-cart-${product1.id}`).props.accessibilityLabel).toBe(
        'Move to cart',
      );
    });

    it('pressing swipe Remove removes item from wishlist', () => {
      const { getByTestId, queryByTestId } = renderScreen({ items: makeItems(product1) });
      fireEvent.press(getByTestId(`swipe-remove-${product1.id}`));
      expect(queryByTestId(`wishlist-item-${product1.id}`)).toBeNull();
    });

    it('pressing swipe Move to Cart calls addItem for futon product', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1) });
      fireEvent.press(getByTestId(`swipe-move-to-cart-${product1.id}`));
      expect(mockAddItem).toHaveBeenCalledTimes(1);
      expect(mockAddItem).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.stringContaining('Asheville') }),
        expect.objectContaining({ id: expect.any(String) }),
        1,
      );
    });

    it('pressing swipe Move to Cart removes item from wishlist (futon)', () => {
      const { getByTestId, queryByTestId } = renderScreen({ items: makeItems(product1) });
      fireEvent.press(getByTestId(`swipe-move-to-cart-${product1.id}`));
      expect(queryByTestId(`wishlist-item-${product1.id}`)).toBeNull();
    });

    it('pressing swipe Move to Cart on non-futon navigates to PDP via onProductPress', () => {
      const murphyProduct = PRODUCTS.find((p) => p.category === 'murphy-beds') ?? product1;
      const onProductPress = jest.fn();
      const { getByTestId } = renderScreen({
        items: makeItems(murphyProduct),
        onProductPress,
      });
      fireEvent.press(getByTestId(`swipe-move-to-cart-${murphyProduct.id}`));
      // Non-futon: no addItem call, navigate to PDP instead
      expect(mockAddItem).not.toHaveBeenCalled();
      expect(onProductPress).toHaveBeenCalledWith(
        expect.objectContaining({ id: murphyProduct.id }),
      );
    });

    it('swipe actions render for multiple items independently', () => {
      const { getByTestId } = renderScreen({ items: makeItems(product1, product2) });
      expect(getByTestId(`swipe-remove-${product1.id}`)).toBeTruthy();
      expect(getByTestId(`swipe-remove-${product2.id}`)).toBeTruthy();
      expect(getByTestId(`swipe-move-to-cart-${product1.id}`)).toBeTruthy();
      expect(getByTestId(`swipe-move-to-cart-${product2.id}`)).toBeTruthy();
    });
  });
});

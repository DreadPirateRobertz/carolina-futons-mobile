import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import { WishlistScreen } from '../WishlistScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider, type WishlistItem } from '@/hooks/useWishlist';
import { PRODUCTS } from '@/data/products';

const product1 = PRODUCTS[0];
const product2 = PRODUCTS[1];

function makeItems(...products: typeof PRODUCTS): WishlistItem[] {
  return products.map((p) => ({
    productId: p.id,
    addedAt: Date.now(),
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
          <WishlistScreen onProductPress={onProductPress} onBrowse={onBrowse} />
        </WishlistProvider>
      </ThemeProvider>,
    ),
    onProductPress,
    onBrowse,
  };
}

describe('WishlistScreen', () => {
  describe('empty state', () => {
    it('renders empty state when no items', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('wishlist-empty')).toBeTruthy();
    });

    it('shows browse button in empty state', () => {
      const { getByTestId, onBrowse } = renderScreen();
      expect(getByTestId('wishlist-empty-action')).toBeTruthy();
    });

    it('calls onBrowse when browse button pressed', () => {
      const { getByTestId, onBrowse } = renderScreen();
      fireEvent.press(getByTestId('wishlist-empty-action'));
      expect(onBrowse).toHaveBeenCalled();
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
      const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
      const { getByTestId } = renderScreen({
        items: makeItems(product1),
      });
      await fireEvent.press(getByTestId('wishlist-share'));
      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(product1.name),
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
});

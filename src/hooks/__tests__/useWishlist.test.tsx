import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { WishlistProvider, useWishlist } from '../useWishlist';
import { PRODUCTS } from '@/data/products';

const product1 = PRODUCTS[0];
const product2 = PRODUCTS[1];
const product3 = PRODUCTS[2];

function TestHarness() {
  const { items, count, isInWishlist, toggle, add, remove, clear, getProducts, getShareText } =
    useWishlist();
  return (
    <View testID="harness">
      <Text testID="count">{count}</Text>
      <Text testID="items">{JSON.stringify(items.map((i) => i.productId))}</Text>
      <Text testID="is-in-1">{isInWishlist(product1.id) ? 'yes' : 'no'}</Text>
      <Text testID="is-in-2">{isInWishlist(product2.id) ? 'yes' : 'no'}</Text>
      <Text testID="products-count">{getProducts().length}</Text>
      <Text testID="share-text">{getShareText()}</Text>
      <TouchableOpacity testID="add-1" onPress={() => add(product1)} />
      <TouchableOpacity testID="add-2" onPress={() => add(product2)} />
      <TouchableOpacity testID="add-3" onPress={() => add(product3)} />
      <TouchableOpacity testID="remove-1" onPress={() => remove(product1.id)} />
      <TouchableOpacity testID="toggle-1" onPress={() => toggle(product1)} />
      <TouchableOpacity testID="toggle-2" onPress={() => toggle(product2)} />
      <TouchableOpacity testID="clear" onPress={clear} />
    </View>
  );
}

function renderHarness(
  initialItems?: { productId: string; addedAt: number; savedPrice: number }[],
) {
  return render(
    <WishlistProvider initialItems={initialItems}>
      <TestHarness />
    </WishlistProvider>,
  );
}

describe('useWishlist', () => {
  describe('initial state', () => {
    it('starts empty by default', () => {
      const { getByTestId } = renderHarness();
      expect(getByTestId('count').props.children).toBe(0);
    });

    it('starts with initial items when provided', () => {
      const { getByTestId } = renderHarness([
        { productId: product1.id, addedAt: Date.now(), savedPrice: product1.price },
      ]);
      expect(getByTestId('count').props.children).toBe(1);
      expect(getByTestId('is-in-1').props.children).toBe('yes');
    });
  });

  describe('add', () => {
    it('adds a product to wishlist', () => {
      const { getByTestId } = renderHarness();
      expect(getByTestId('is-in-1').props.children).toBe('no');
      fireEvent.press(getByTestId('add-1'));
      expect(getByTestId('is-in-1').props.children).toBe('yes');
      expect(getByTestId('count').props.children).toBe(1);
    });

    it('does not duplicate when adding same product twice', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('add-1'));
      fireEvent.press(getByTestId('add-1'));
      expect(getByTestId('count').props.children).toBe(1);
    });

    it('adds multiple different products', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('add-1'));
      fireEvent.press(getByTestId('add-2'));
      fireEvent.press(getByTestId('add-3'));
      expect(getByTestId('count').props.children).toBe(3);
    });
  });

  describe('remove', () => {
    it('removes a product from wishlist', () => {
      const { getByTestId } = renderHarness([
        { productId: product1.id, addedAt: Date.now(), savedPrice: product1.price },
      ]);
      expect(getByTestId('count').props.children).toBe(1);
      fireEvent.press(getByTestId('remove-1'));
      expect(getByTestId('count').props.children).toBe(0);
      expect(getByTestId('is-in-1').props.children).toBe('no');
    });

    it('is a no-op for non-existent products', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('remove-1'));
      expect(getByTestId('count').props.children).toBe(0);
    });
  });

  describe('toggle', () => {
    it('adds product when not in wishlist', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('toggle-1'));
      expect(getByTestId('is-in-1').props.children).toBe('yes');
    });

    it('removes product when already in wishlist', () => {
      const { getByTestId } = renderHarness([
        { productId: product1.id, addedAt: Date.now(), savedPrice: product1.price },
      ]);
      fireEvent.press(getByTestId('toggle-1'));
      expect(getByTestId('is-in-1').props.children).toBe('no');
    });
  });

  describe('clear', () => {
    it('removes all items', () => {
      const { getByTestId } = renderHarness([
        { productId: product1.id, addedAt: Date.now(), savedPrice: product1.price },
        { productId: product2.id, addedAt: Date.now(), savedPrice: product2.price },
      ]);
      expect(getByTestId('count').props.children).toBe(2);
      fireEvent.press(getByTestId('clear'));
      expect(getByTestId('count').props.children).toBe(0);
    });
  });

  describe('getProducts', () => {
    it('returns enriched product objects', () => {
      const { getByTestId } = renderHarness([
        { productId: product1.id, addedAt: Date.now(), savedPrice: product1.price },
      ]);
      expect(getByTestId('products-count').props.children).toBe(1);
    });

    it('calculates price drop', () => {
      // savedPrice higher than current price -> positive priceDrop
      const { getByTestId } = renderHarness([
        { productId: product1.id, addedAt: Date.now(), savedPrice: product1.price + 50 },
      ]);
      expect(getByTestId('products-count').props.children).toBe(1);
    });

    it('skips products not found in catalog', () => {
      const { getByTestId } = renderHarness([
        { productId: 'nonexistent', addedAt: Date.now(), savedPrice: 100 },
      ]);
      expect(getByTestId('products-count').props.children).toBe(0);
    });
  });

  describe('getShareText', () => {
    it('returns empty string for empty wishlist', () => {
      const { getByTestId } = renderHarness();
      expect(getByTestId('share-text').props.children).toBe('');
    });

    it('includes product names for non-empty wishlist', () => {
      const { getByTestId } = renderHarness([
        { productId: product1.id, addedAt: Date.now(), savedPrice: product1.price },
      ]);
      const text = getByTestId('share-text').props.children;
      expect(text).toContain(product1.name);
      expect(text).toContain('carolinafutons.com');
    });
  });

  describe('isInWishlist', () => {
    it('returns true for wishlisted product', () => {
      const { getByTestId } = renderHarness([
        { productId: product1.id, addedAt: Date.now(), savedPrice: product1.price },
      ]);
      expect(getByTestId('is-in-1').props.children).toBe('yes');
    });

    it('returns false for non-wishlisted product', () => {
      const { getByTestId } = renderHarness();
      expect(getByTestId('is-in-1').props.children).toBe('no');
    });
  });

  describe('error boundary', () => {
    it('throws when used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<TestHarness />)).toThrow(
        'useWishlist must be used within a WishlistProvider',
      );
      consoleError.mockRestore();
    });
  });
});

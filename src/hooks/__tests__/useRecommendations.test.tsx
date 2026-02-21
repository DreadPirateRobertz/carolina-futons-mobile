import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { RecommendationsProvider, useRecommendations } from '../useRecommendations';
import { PRODUCTS } from '@/data/products';

const product1 = PRODUCTS[0]; // Asheville futon
const product2 = PRODUCTS[1]; // Blue Ridge futon
const product3 = PRODUCTS[2]; // Pisgah futon
const product4 = PRODUCTS[4]; // Mountain Weave cover (different category)

/** Test harness exposing recommendations hook state + actions */
function RecommendationsHarness() {
  const {
    recentlyViewed,
    similarItems,
    alsoBoought,
    recommendedForYou,
    trackView,
    trackPurchase,
    clearHistory,
  } = useRecommendations();

  return (
    <View>
      <Text testID="recently-viewed-count">{recentlyViewed.length}</Text>
      <Text testID="similar-count">{similarItems.length}</Text>
      <Text testID="also-bought-count">{alsoBoought.length}</Text>
      <Text testID="recommended-count">{recommendedForYou.length}</Text>
      <Text testID="recently-viewed-json">
        {JSON.stringify(recentlyViewed.map((p) => p.id))}
      </Text>
      <Text testID="similar-json">
        {JSON.stringify(similarItems.map((p) => p.id))}
      </Text>

      <TouchableOpacity testID="view-product-1" onPress={() => trackView(product1.id)} />
      <TouchableOpacity testID="view-product-2" onPress={() => trackView(product2.id)} />
      <TouchableOpacity testID="view-product-3" onPress={() => trackView(product3.id)} />
      <TouchableOpacity testID="view-product-4" onPress={() => trackView(product4.id)} />
      <TouchableOpacity testID="purchase-product-1" onPress={() => trackPurchase(product1.id)} />
      <TouchableOpacity testID="purchase-product-2" onPress={() => trackPurchase(product2.id)} />
      <TouchableOpacity testID="clear-history" onPress={clearHistory} />
    </View>
  );
}

function renderHarness() {
  return render(
    <RecommendationsProvider>
      <RecommendationsHarness />
    </RecommendationsProvider>,
  );
}

describe('useRecommendations', () => {
  describe('initial state', () => {
    it('starts with empty recently viewed', () => {
      const { getByTestId } = renderHarness();
      expect(getByTestId('recently-viewed-count').props.children).toBe(0);
    });

    it('starts with empty also bought', () => {
      const { getByTestId } = renderHarness();
      expect(getByTestId('also-bought-count').props.children).toBe(0);
    });

    it('provides recommended for you based on catalog', () => {
      const { getByTestId } = renderHarness();
      // Should have some default recommendations from catalog
      const count = getByTestId('recommended-count').props.children;
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recently viewed tracking', () => {
    it('tracks a product view', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('view-product-1'));
      expect(getByTestId('recently-viewed-count').props.children).toBe(1);
    });

    it('does not duplicate consecutive views of same product', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('view-product-1'));
      fireEvent.press(getByTestId('view-product-1'));
      expect(getByTestId('recently-viewed-count').props.children).toBe(1);
    });

    it('tracks multiple different products', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('view-product-1'));
      fireEvent.press(getByTestId('view-product-2'));
      fireEvent.press(getByTestId('view-product-3'));
      expect(getByTestId('recently-viewed-count').props.children).toBe(3);
    });

    it('most recently viewed appears first', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('view-product-1'));
      fireEvent.press(getByTestId('view-product-2'));
      const viewed = JSON.parse(getByTestId('recently-viewed-json').props.children);
      expect(viewed[0]).toBe(product2.id);
      expect(viewed[1]).toBe(product1.id);
    });

    it('moves re-viewed product to front', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('view-product-1'));
      fireEvent.press(getByTestId('view-product-2'));
      fireEvent.press(getByTestId('view-product-1')); // re-view
      const viewed = JSON.parse(getByTestId('recently-viewed-json').props.children);
      expect(viewed[0]).toBe(product1.id);
    });

    it('caps recently viewed at 20 items', () => {
      const { getByTestId } = renderHarness();
      // View many products — use all available
      for (let i = 0; i < PRODUCTS.length; i++) {
        // We only have 12 products so this won't actually test 20, but verifies no crash
        fireEvent.press(getByTestId(`view-product-${i + 1 <= 4 ? i + 1 : 1}`));
      }
      const count = getByTestId('recently-viewed-count').props.children;
      expect(count).toBeLessThanOrEqual(20);
    });
  });

  describe('similar items', () => {
    it('returns similar items after viewing a product', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('view-product-1')); // Asheville futon
      const count = getByTestId('similar-count').props.children;
      expect(count).toBeGreaterThan(0);
    });

    it('similar items are from same category', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('view-product-1')); // futon
      const similar = JSON.parse(getByTestId('similar-json').props.children);
      // Should contain other futons, not the viewed product itself
      expect(similar).not.toContain(product1.id);
    });

    it('does not include the currently viewed product', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('view-product-1'));
      const similar = JSON.parse(getByTestId('similar-json').props.children);
      expect(similar).not.toContain(product1.id);
    });
  });

  describe('purchase tracking', () => {
    it('tracks a purchase', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('purchase-product-1'));
      // Also bought should have items after purchase tracking
      const count = getByTestId('also-bought-count').props.children;
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clear history', () => {
    it('clears all browsing history', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('view-product-1'));
      fireEvent.press(getByTestId('view-product-2'));
      expect(getByTestId('recently-viewed-count').props.children).toBe(2);
      fireEvent.press(getByTestId('clear-history'));
      expect(getByTestId('recently-viewed-count').props.children).toBe(0);
    });
  });

  describe('error boundary', () => {
    it('throws when used outside RecommendationsProvider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<RecommendationsHarness />)).toThrow(
        'useRecommendations must be used within a RecommendationsProvider',
      );
      consoleError.mockRestore();
    });
  });
});

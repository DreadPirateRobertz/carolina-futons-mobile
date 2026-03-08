/**
 * @module ListVirtualization
 *
 * Tests for FlatList performance optimizations across product grid screens.
 * Verifies that virtualization props (windowSize, maxToRenderPerBatch,
 * removeClippedSubviews, getItemLayout) and scroll performance tracking
 * are correctly configured on all product-listing FlatLists.
 */
import React from 'react';
import { FlatList } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider, type WishlistItem } from '@/hooks/useWishlist';
import { PRODUCTS } from '@/data/products';
import { ShopScreen } from '../ShopScreen';
import { CategoryScreen } from '../CategoryScreen';
import { CollectionsScreen } from '../CollectionsScreen';
import { WishlistScreen } from '../WishlistScreen';

jest.useFakeTimers();

jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => ({
    isPremium: false,
    isLoading: false,
    offerings: [],
    error: null,
    purchase: jest.fn(),
    restore: jest.fn(),
    refreshStatus: jest.fn(),
  }),
}));

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => ({
    queryData: jest.fn().mockResolvedValue({ items: [], totalResults: 0 }),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

// Spy on FlatList to capture props
const flatListSpy = jest.spyOn(FlatList.prototype, 'render');

function getLastFlatListProps() {
  // Get the most recent FlatList render call's props
  const calls = flatListSpy.mock.instances;
  if (calls.length === 0) return null;
  const lastInstance = calls[calls.length - 1] as any;
  return lastInstance?.props ?? null;
}

// Helper: find FlatList props by testID from rendered tree
function findFlatListProps(root: any, testID: string): Record<string, any> | null {
  const flatList = root.UNSAFE_queryByType?.(FlatList);
  if (!flatList) return null;
  return flatList.props;
}

async function renderShop() {
  const result = render(
    <ThemeProvider>
      <WishlistProvider>
        <ShopScreen onProductPress={jest.fn()} />
      </WishlistProvider>
    </ThemeProvider>,
  );
  await act(async () => {
    jest.advanceTimersByTime(700);
  });
  return result;
}

function renderCategory() {
  return render(
    <ThemeProvider>
      <WishlistProvider>
        <CategoryScreen categoryId="futons" onProductPress={jest.fn()} />
      </WishlistProvider>
    </ThemeProvider>,
  );
}

function renderCollections() {
  return render(
    <NavigationContainer>
      <ThemeProvider>
        <CollectionsScreen />
      </ThemeProvider>
    </NavigationContainer>,
  );
}

function renderWishlist(items?: WishlistItem[]) {
  return render(
    <ThemeProvider>
      <WishlistProvider
        initialItems={
          items ?? [
            { productId: PRODUCTS[0].id, addedAt: Date.now(), savedPrice: PRODUCTS[0].price },
            { productId: PRODUCTS[1].id, addedAt: Date.now(), savedPrice: PRODUCTS[1].price },
          ]
        }
      >
        <WishlistScreen onProductPress={jest.fn()} />
      </WishlistProvider>
    </ThemeProvider>,
  );
}

describe('List Virtualization Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ShopScreen FlatList', () => {
    it('has windowSize tuned for performance', async () => {
      const { getByTestId } = await renderShop();
      const flatList = getByTestId('product-list');
      expect(flatList.props.windowSize).toBeLessThanOrEqual(7);
      expect(flatList.props.windowSize).toBeGreaterThanOrEqual(3);
    });

    it('has maxToRenderPerBatch set', async () => {
      const { getByTestId } = await renderShop();
      const flatList = getByTestId('product-list');
      expect(flatList.props.maxToRenderPerBatch).toBeGreaterThanOrEqual(4);
      expect(flatList.props.maxToRenderPerBatch).toBeLessThanOrEqual(10);
    });

    it('has removeClippedSubviews enabled', async () => {
      const { getByTestId } = await renderShop();
      const flatList = getByTestId('product-list');
      expect(flatList.props.removeClippedSubviews).toBe(true);
    });

    it('has getItemLayout for fixed-height product rows', async () => {
      const { getByTestId } = await renderShop();
      const flatList = getByTestId('product-list');
      expect(flatList.props.getItemLayout).toBeDefined();
      expect(typeof flatList.props.getItemLayout).toBe('function');
    });

    it('getItemLayout returns consistent offset calculations', async () => {
      const { getByTestId } = await renderShop();
      const flatList = getByTestId('product-list');
      const layout0 = flatList.props.getItemLayout(null, 0);
      const layout1 = flatList.props.getItemLayout(null, 1);
      expect(layout0.index).toBe(0);
      expect(layout1.index).toBe(1);
      expect(layout0.length).toBe(layout1.length);
      expect(layout1.offset).toBe(layout0.length);
    });

    it('has scroll performance tracking handlers', async () => {
      const { getByTestId } = await renderShop();
      const flatList = getByTestId('product-list');
      expect(flatList.props.onScrollBeginDrag).toBeDefined();
      expect(flatList.props.onMomentumScrollEnd).toBeDefined();
    });
  });

  describe('CategoryScreen FlatList', () => {
    it('has windowSize tuned for performance', () => {
      const { getByTestId } = renderCategory();
      const flatList = getByTestId('category-product-list');
      expect(flatList.props.windowSize).toBeLessThanOrEqual(7);
      expect(flatList.props.windowSize).toBeGreaterThanOrEqual(3);
    });

    it('has maxToRenderPerBatch set', () => {
      const { getByTestId } = renderCategory();
      const flatList = getByTestId('category-product-list');
      expect(flatList.props.maxToRenderPerBatch).toBeGreaterThanOrEqual(4);
      expect(flatList.props.maxToRenderPerBatch).toBeLessThanOrEqual(10);
    });

    it('has removeClippedSubviews enabled', () => {
      const { getByTestId } = renderCategory();
      const flatList = getByTestId('category-product-list');
      expect(flatList.props.removeClippedSubviews).toBe(true);
    });

    it('has getItemLayout for fixed-height product rows', () => {
      const { getByTestId } = renderCategory();
      const flatList = getByTestId('category-product-list');
      expect(flatList.props.getItemLayout).toBeDefined();
      expect(typeof flatList.props.getItemLayout).toBe('function');
    });

    it('has scroll performance tracking handlers', () => {
      const { getByTestId } = renderCategory();
      const flatList = getByTestId('category-product-list');
      expect(flatList.props.onScrollBeginDrag).toBeDefined();
      expect(flatList.props.onMomentumScrollEnd).toBeDefined();
    });
  });

  describe('CollectionsScreen FlatList', () => {
    it('has windowSize tuned for performance', () => {
      const { getByTestId } = renderCollections();
      const flatList = getByTestId('collections-list');
      expect(flatList.props.windowSize).toBeLessThanOrEqual(7);
      expect(flatList.props.windowSize).toBeGreaterThanOrEqual(3);
    });

    it('has maxToRenderPerBatch set', () => {
      const { getByTestId } = renderCollections();
      const flatList = getByTestId('collections-list');
      expect(flatList.props.maxToRenderPerBatch).toBeGreaterThanOrEqual(4);
      expect(flatList.props.maxToRenderPerBatch).toBeLessThanOrEqual(10);
    });

    it('has removeClippedSubviews enabled', () => {
      const { getByTestId } = renderCollections();
      const flatList = getByTestId('collections-list');
      expect(flatList.props.removeClippedSubviews).toBe(true);
    });

    it('has getItemLayout for fixed-height collection cards', () => {
      const { getByTestId } = renderCollections();
      const flatList = getByTestId('collections-list');
      expect(flatList.props.getItemLayout).toBeDefined();
      expect(typeof flatList.props.getItemLayout).toBe('function');
    });

    it('has scroll performance tracking handlers', () => {
      const { getByTestId } = renderCollections();
      const flatList = getByTestId('collections-list');
      expect(flatList.props.onScrollBeginDrag).toBeDefined();
      expect(flatList.props.onMomentumScrollEnd).toBeDefined();
    });
  });

  describe('WishlistScreen FlatList', () => {
    it('has windowSize tuned for performance', () => {
      const { getByTestId } = renderWishlist();
      const flatList = getByTestId('wishlist-list');
      expect(flatList.props.windowSize).toBeLessThanOrEqual(7);
      expect(flatList.props.windowSize).toBeGreaterThanOrEqual(3);
    });

    it('has maxToRenderPerBatch set', () => {
      const { getByTestId } = renderWishlist();
      const flatList = getByTestId('wishlist-list');
      expect(flatList.props.maxToRenderPerBatch).toBeGreaterThanOrEqual(4);
      expect(flatList.props.maxToRenderPerBatch).toBeLessThanOrEqual(10);
    });

    it('has removeClippedSubviews enabled', () => {
      const { getByTestId } = renderWishlist();
      const flatList = getByTestId('wishlist-list');
      expect(flatList.props.removeClippedSubviews).toBe(true);
    });

    it('has getItemLayout for fixed-height product rows', () => {
      const { getByTestId } = renderWishlist();
      const flatList = getByTestId('wishlist-list');
      expect(flatList.props.getItemLayout).toBeDefined();
      expect(typeof flatList.props.getItemLayout).toBe('function');
    });

    it('has scroll performance tracking handlers', () => {
      const { getByTestId } = renderWishlist();
      const flatList = getByTestId('wishlist-list');
      expect(flatList.props.onScrollBeginDrag).toBeDefined();
      expect(flatList.props.onMomentumScrollEnd).toBeDefined();
    });
  });

  describe('ProductCard memoization', () => {
    it('ProductCard is wrapped in React.memo', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ProductCard } = require('@/components/ProductCard');
      // React.memo components have $$typeof Symbol.for('react.memo')
      expect(ProductCard.$$typeof).toBe(Symbol.for('react.memo'));
    });
  });

  describe('CollectionCard memoization', () => {
    it('CollectionCard is wrapped in React.memo', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { CollectionCard } = require('@/components/CollectionCard');
      expect(CollectionCard.$$typeof).toBe(Symbol.for('react.memo'));
    });
  });
});

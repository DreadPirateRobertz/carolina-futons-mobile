/**
 * @module WishlistScreen
 *
 * Saved-for-later product grid with share, sort, bulk-add-to-cart, and swipe
 * actions (Remove / Move to Cart). Highlights price drops since the item was
 * wishlisted so users can spot deals. Long-press triggers a removal
 * confirmation dialog. Share exports a plain-text list via the native share
 * sheet.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
} from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { MountainRefreshControl } from '@/components/MountainRefreshControl';
import { useSyncedWishlist } from '@/hooks/useSyncedWishlist';
import { useCart } from '@/hooks/useCart';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { type Product } from '@/hooks/useProducts';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonProductGrid } from '@/components/SkeletonProductCard';
import { useScrollPerformance } from '@/hooks/useScrollPerformance';
import { WishlistIllustration } from '@/components/illustrations/WishlistIllustration';
import { formatPrice } from '@/utils';
import { events } from '@/services/analytics';
import { useFutonModels } from '@/hooks/useFutonModels';

/** Estimated height (px) of a single product-grid row (two-column layout). */
const ESTIMATED_PRODUCT_ROW_HEIGHT = 262;

type SortOption = 'date' | 'price-asc' | 'price-desc';

interface Props {
  onProductPress?: (product: Product) => void;
  onBrowse?: () => void;
  testID?: string;
}

type WishlistProduct = Product & { savedPrice: number; priceDrop: number };

/** Wishlist grid with price-drop badges, sort, swipe actions, and bulk-add-to-cart. */
export function WishlistScreen({ onProductPress, onBrowse, testID }: Props) {
  const { colors, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const wixClient = useOptionalWixClient();
  const { count, getProducts, getShareText, remove, clear, refresh, isLoading } = useSyncedWishlist(
    { client: wixClient },
  );
  const { addItem } = useCart();
  const { getModelForProduct } = useFutonModels();

  const scrollPerf = useScrollPerformance('WishlistScreen');

  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date');

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 600);
  }, [refresh]);

  const handleRemove = useCallback(
    (productId: string) => {
      remove(productId);
      events.removeFromWishlist(productId);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    },
    [remove],
  );

  const handleLongPress = useCallback(
    (product: Product) => {
      Alert.alert('Remove from Wishlist', `Remove "${product.name}" from your wishlist?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => handleRemove(product.id),
        },
      ]);
    },
    [handleRemove],
  );

  const handleShare = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const text = getShareText();
    if (!text) return;
    events.shareWishlist(count);
    try {
      await Share.share({ message: text });
    } catch {
      // user cancelled or error
    }
  }, [getShareText, count]);

  const handleClearAll = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    Alert.alert('Clear Wishlist', 'Remove all items from your wishlist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clear },
    ]);
  }, [clear]);

  const handleAddAllToCart = useCallback(() => {
    const products = getProducts();
    for (const product of products) {
      const model = getModelForProduct(product.id);
      if (model) {
        addItem(model, model.fabrics[0], 1);
        remove(product.id);
      }
      // Non-futon products are skipped — no direct cart add without fabric selection
    }
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [getProducts, addItem, remove]);

  const handleSwipeRemove = useCallback(
    (productId: string) => {
      handleRemove(productId);
    },
    [handleRemove],
  );

  const handleSwipeMoveToCart = useCallback(
    (product: WishlistProduct) => {
      const model = getModelForProduct(product.id);
      if (model) {
        addItem(model, model.fabrics[0], 1);
        remove(product.id);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        // Non-futon: navigate to PDP for fabric/variant selection
        onProductPress?.(product);
      }
    },
    [addItem, remove, onProductPress],
  );

  const sortedProducts = useMemo(() => {
    const products = getProducts();
    if (sortBy === 'price-asc') return [...products].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') return [...products].sort((a, b) => b.price - a.price);
    return products; // 'date': insertion order from the reducer
  }, [getProducts, sortBy]);

  const renderSwipeActions = useCallback(
    (product: WishlistProduct) => () => (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[
            styles.swipeButton,
            styles.swipeMoveToCart,
            { backgroundColor: colors.mountainBlue },
          ]}
          onPress={() => handleSwipeMoveToCart(product)}
          testID={`swipe-move-to-cart-${product.id}`}
          accessibilityLabel="Move to cart"
          accessibilityRole="button"
        >
          <Text style={styles.swipeButtonText}>Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.swipeButton,
            styles.swipeRemove,
            { backgroundColor: colors.error ?? '#C0392B' },
          ]}
          onPress={() => handleSwipeRemove(product.id)}
          testID={`swipe-remove-${product.id}`}
          accessibilityLabel="Remove from wishlist"
          accessibilityRole="button"
        >
          <Text style={styles.swipeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    ),
    [handleSwipeMoveToCart, handleSwipeRemove, colors],
  );

  const renderItem = useCallback(
    ({ item }: { item: WishlistProduct }) => (
      <ReanimatedSwipeable
        renderRightActions={renderSwipeActions(item)}
        overshootRight={false}
        testID={`wishlist-swipeable-${item.id}`}
      >
        <View style={styles.cardWrapper}>
          <ProductCard
            product={item}
            onPress={onProductPress}
            onLongPress={() => handleLongPress(item)}
            testID={`wishlist-item-${item.id}`}
          />
          {item.priceDrop > 0 && (
            <View
              style={[styles.priceDropBadge, { backgroundColor: colors.success }]}
              accessibilityLabel={`Price dropped ${formatPrice(item.priceDrop)}`}
            >
              <Text style={styles.priceDropText}>{formatPrice(item.priceDrop)} off!</Text>
            </View>
          )}
        </View>
      </ReanimatedSwipeable>
    ),
    [onProductPress, handleLongPress, colors, renderSwipeActions],
  );

  const keyExtractor = useCallback((item: WishlistProduct) => item.id, []);

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: ESTIMATED_PRODUCT_ROW_HEIGHT,
      offset: ESTIMATED_PRODUCT_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderSortSelector = useCallback(
    () => (
      <View style={styles.sortRow} testID="wishlist-sort-selector">
        <TouchableOpacity
          onPress={() => setSortBy('date')}
          style={[styles.sortButton, sortBy === 'date' && { backgroundColor: colors.mountainBlue }]}
          testID="wishlist-sort-date"
          accessibilityLabel="Sort by date added"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.sortButtonText,
              { color: sortBy === 'date' ? '#FFFFFF' : colors.espressoLight },
            ]}
          >
            Date
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSortBy('price-asc')}
          style={[
            styles.sortButton,
            sortBy === 'price-asc' && { backgroundColor: colors.mountainBlue },
          ]}
          testID="wishlist-sort-price-asc"
          accessibilityLabel="Sort by price low to high"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.sortButtonText,
              { color: sortBy === 'price-asc' ? '#FFFFFF' : colors.espressoLight },
            ]}
          >
            Price ↑
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSortBy('price-desc')}
          style={[
            styles.sortButton,
            sortBy === 'price-desc' && { backgroundColor: colors.mountainBlue },
          ]}
          testID="wishlist-sort-price-desc"
          accessibilityLabel="Sort by price high to low"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.sortButtonText,
              { color: sortBy === 'price-desc' ? '#FFFFFF' : colors.espressoLight },
            ]}
          >
            Price ↓
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [sortBy, colors],
  );

  const renderHeader = useCallback(
    () => (
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.espresso }]} accessibilityRole="header">
            Wishlist
          </Text>
          <Text style={[styles.count, { color: colors.espressoLight }]}>
            {count} {count === 1 ? 'item' : 'items'}
          </Text>
        </View>
        {count > 0 && (
          <>
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={handleShare}
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.mountainBlue, borderRadius: borderRadius.button },
                ]}
                testID="wishlist-share"
                accessibilityLabel="Share wishlist"
                accessibilityHint="Opens the share sheet with your wishlist items"
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddAllToCart}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: colors.success ?? '#27AE60',
                    borderRadius: borderRadius.button,
                  },
                ]}
                testID="wishlist-add-all"
                accessibilityLabel="Add all items to cart"
                accessibilityHint="Adds all wishlist items to your cart"
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Add All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClearAll}
                style={[
                  styles.actionButton,
                  styles.clearButton,
                  { borderRadius: borderRadius.button, borderColor: colors.espressoLight },
                ]}
                testID="wishlist-clear"
                accessibilityLabel="Clear all items from wishlist"
                accessibilityHint="Removes all products from your wishlist"
                accessibilityRole="button"
              >
                <Text style={[styles.clearButtonText, { color: colors.espressoLight }]}>
                  Clear All
                </Text>
              </TouchableOpacity>
            </View>
            {renderSortSelector()}
          </>
        )}
      </View>
    ),
    [
      count,
      colors,
      spacing,
      borderRadius,
      handleShare,
      handleAddAllToCart,
      handleClearAll,
      renderSortSelector,
    ],
  );

  const renderEmpty = useCallback(
    () => (
      <EmptyState
        illustration={<WishlistIllustration testID="wishlist-illustration" />}
        title="Your wishlist is empty"
        message="Save products you love and come back to them later."
        action={onBrowse ? { label: 'Start shopping', onPress: onBrowse } : undefined}
        testID="wishlist-empty"
      />
    ),
    [onBrowse],
  );

  if (isLoading) {
    return <SkeletonProductGrid count={4} testID="skeleton-wishlist-grid" />;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandBase, paddingTop: insets.top }]}
      testID={testID ?? 'wishlist-screen'}
    >
      <FlatList
        data={sortedProducts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={sortedProducts.length > 0 ? styles.row : undefined}
        getItemLayout={getItemLayout}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <MountainRefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            testID="wishlist-refresh-control"
          />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
        onScrollBeginDrag={scrollPerf.onScrollBeginDrag}
        onScrollEndDrag={scrollPerf.onScrollEndDrag}
        onMomentumScrollEnd={scrollPerf.onMomentumScrollEnd}
        showsVerticalScrollIndicator={false}
        windowSize={5}
        maxToRenderPerBatch={6}
        removeClippedSubviews
        testID="wishlist-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  count: {
    fontSize: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  sortButton: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
  },
  row: {
    paddingHorizontal: 10,
  },
  cardWrapper: {
    flex: 1,
    position: 'relative',
  },
  priceDropBadge: {
    position: 'absolute',
    bottom: 18,
    left: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priceDropText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  swipeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
  },
  swipeMoveToCart: {},
  swipeRemove: {},
  swipeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

/**
 * @module WishlistScreen
 *
 * Saved-for-later product grid with share and bulk-clear actions.
 * Highlights price drops since the item was wishlisted so users can
 * spot deals. Long-press triggers a removal confirmation dialog.
 * Share exports a plain-text list via the native share sheet.
 */
import React, { useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { useWishlist } from '@/hooks/useWishlist';
import { type Product } from '@/hooks/useProducts';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { WishlistIllustration } from '@/components/illustrations';
import { formatPrice } from '@/utils';
import { events } from '@/services/analytics';

interface Props {
  onProductPress?: (product: Product) => void;
  onBrowse?: () => void;
  testID?: string;
}

/** Wishlist grid with price-drop badges, share, and bulk-clear actions. */
export function WishlistScreen({ onProductPress, onBrowse, testID }: Props) {
  const { colors, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const { count, getProducts, getShareText, remove, clear } = useWishlist();

  const products = getProducts();

  const handleRemove = useCallback(
    (productId: string) => {
      remove(productId);
      events.removeFromWishlist(productId);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    Alert.alert('Clear Wishlist', 'Remove all items from your wishlist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clear },
    ]);
  }, [clear]);

  const renderItem = useCallback(
    ({ item }: { item: Product & { savedPrice: number; priceDrop: number } }) => (
      <View style={styles.cardWrapper}>
        <ProductCard
          product={item}
          onPress={onProductPress}
          onLongPress={() => handleLongPress(item)}
          testID={`wishlist-item-${item.id}`}
        />
        {item.priceDrop > 0 && (
          <View style={[styles.priceDropBadge, { backgroundColor: colors.success }]}>
            <Text style={styles.priceDropText}>{formatPrice(item.priceDrop)} off!</Text>
          </View>
        )}
      </View>
    ),
    [onProductPress, handleLongPress, colors],
  );

  const keyExtractor = useCallback(
    (item: Product & { savedPrice: number; priceDrop: number }) => item.id,
    [],
  );

  const renderHeader = useCallback(
    () => (
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.espresso }]}>Wishlist</Text>
          <Text style={[styles.count, { color: colors.espressoLight }]}>
            {count} {count === 1 ? 'item' : 'items'}
          </Text>
        </View>
        {count > 0 && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleShare}
              style={[
                styles.actionButton,
                { backgroundColor: colors.mountainBlue, borderRadius: borderRadius.button },
              ]}
              testID="wishlist-share"
              accessibilityLabel="Share wishlist"
              accessibilityRole="button"
            >
              <Text style={styles.actionButtonText}>Share</Text>
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
              accessibilityRole="button"
            >
              <Text style={[styles.clearButtonText, { color: colors.espressoLight }]}>
                Clear All
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    ),
    [count, colors, spacing, borderRadius, handleShare, handleClearAll],
  );

  const renderEmpty = useCallback(
    () => (
      <EmptyState
        illustration={<WishlistIllustration testID="wishlist-illustration" />}
        title="Your wishlist is empty"
        message="Save products you love and come back to them later."
        action={onBrowse ? { label: 'Browse Products', onPress: onBrowse } : undefined}
        testID="wishlist-empty"
      />
    ),
    [onBrowse],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandBase, paddingTop: insets.top }]}
      testID={testID ?? 'wishlist-screen'}
    >
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={products.length > 0 ? styles.row : undefined}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
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
});

/**
 * @module ProductCard
 *
 * Primary product display card used in grids and lists throughout the app.
 * Shows product image with wishlist button overlay, badge (Sale/New/Bestseller),
 * out-of-stock overlay, name, description, star rating, and price. Memoized
 * to prevent unnecessary re-renders in FlatList/ScrollView contexts.
 */

import React, { memo, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import {
  type Product,
  DEFAULT_PRODUCT_BLURHASH,
  getStockStatus,
  type StockStatus,
} from '@/data/products';
import { productIdToModelId } from '@/data/productId';
import { formatPrice } from '@/utils';
import { sharedTransitionTag } from '@/utils/sharedTransitionTag';
import { useImageLoadTracking } from '@/hooks/useImageLoadTracking';
import { WishlistButton } from './WishlistButton';
import { FinancingBadge } from './FinancingBadge';
import { ProductCardVideo } from './ProductCardVideo';
import { CompareButton } from './CompareButton';
import { InventoryBadge } from './InventoryBadge';
import { useInventoryBadge } from '@/hooks/useInventoryBadge';
import { ProductContextMenu } from './ProductContextMenu';

/** Optional context menu actions shown on long-press. */
export interface ProductContextMenuActions {
  onAddToCart?: () => void;
  onAddToWishlist?: () => void;
  onShare?: () => void;
}

interface Props {
  product: Product;
  onPress?: (product: Product) => void;
  onLongPress?: (product: Product) => void;
  /** When provided, long-press shows a context menu with these actions. */
  contextMenu?: ProductContextMenuActions;
  testID?: string;
}

/** Memoized product card with image, badge, rating, price, and wishlist toggle. */
export const ProductCard = memo(function ProductCard({
  product,
  onPress,
  onLongPress,
  contextMenu,
  testID,
}: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const imageTracking = useImageLoadTracking('ProductCard');
  const [contextMenuVisible, setContextMenuVisible] = useState(false);

  const handleLongPress = useCallback(() => {
    if (contextMenu) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setContextMenuVisible(true);
    } else if (onLongPress) {
      onLongPress(product);
    }
  }, [contextMenu, onLongPress, product]);

  const handleContextMenuClose = useCallback(() => {
    setContextMenuVisible(false);
  }, []);

  const stockStatus = getStockStatus(product);
  const { badge: inventoryBadge, quantity: inventoryQuantity } = useInventoryBadge(product.id);

  const stockBadgeConfig: Record<StockStatus, { label: string; color: string } | null> = {
    in_stock: null,
    low_stock: { label: 'Low Stock', color: '#D4920B' },
    out_of_stock: { label: 'Out of Stock', color: '#C0392B' },
  };
  const stockBadge = stockBadgeConfig[stockStatus];

  const badgeColor =
    product.badge === 'Sale'
      ? colors.sunsetCoral
      : product.badge === 'New'
        ? colors.mountainBlue
        : product.badge === 'Bestseller'
          ? colors.mountainBlue
          : colors.espressoLight;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.card,
          shadows.card,
          { backgroundColor: colors.white, borderRadius: borderRadius.card },
        ]}
        onPress={() => onPress?.(product)}
        onLongPress={contextMenu || onLongPress ? handleLongPress : undefined}
        testID={testID ?? `product-card-${product.id}`}
        accessibilityLabel={`${product.name}, ${formatPrice(product.price)}`}
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        {/* Image with shared element transition tag.
          Tag uses the FutonModel ID (no 'prod-' prefix) so it matches the
          identical tag in ProductDetailScreen, enabling Reanimated to pair
          the source and destination elements for the shared-element transition. */}
        <Animated.View
          sharedTransitionTag={sharedTransitionTag(
            `product-image-${product.slug || productIdToModelId(product.id)}`,
          )}
          testID={`product-image-container-${product.id}`}
          style={[
            styles.imageContainer,
            { borderTopLeftRadius: borderRadius.card, borderTopRightRadius: borderRadius.card },
          ]}
        >
          <Image
            source={{ uri: product.images[0]?.uri }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            recyclingKey={product.id}
            accessibilityLabel={product.images[0]?.alt}
            cachePolicy="memory-disk"
            placeholder={{ blurhash: product.images[0]?.blurhash ?? DEFAULT_PRODUCT_BLURHASH }}
            onLoadStart={imageTracking.onLoadStart}
            onLoad={imageTracking.onLoad}
          />
          {product.videoUri && (
            <ProductCardVideo videoUri={product.videoUri} testID={`product-video-${product.id}`} />
          )}
          <WishlistButton
            product={product}
            size="sm"
            overlay
            testID={`wishlist-btn-${product.id}`}
          />
          {product.badge && (
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <Text style={styles.badgeText}>{product.badge}</Text>
            </View>
          )}
          {!product.inStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </Animated.View>

        {/* Info */}
        <View style={[styles.info, { padding: spacing.sm }]}>
          <Text style={[styles.name, { color: colors.espresso }]} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={[styles.description, { color: colors.espressoLight }]} numberOfLines={1}>
            {product.shortDescription}
          </Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <Text style={[styles.ratingStars, { color: colors.sunsetCoral }]}>
              {'★'.repeat(Math.round(product.rating))}
              {'☆'.repeat(5 - Math.round(product.rating))}
            </Text>
            <Text style={[styles.reviewCount, { color: colors.muted }]}>
              ({product.reviewCount})
            </Text>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.espresso }]}>
              {formatPrice(product.price)}
            </Text>
            {product.originalPrice && (
              <Text style={[styles.originalPrice, { color: colors.muted }]}>
                {formatPrice(product.originalPrice)}
              </Text>
            )}
          </View>

          <FinancingBadge price={product.price} variant="compact" />

          {stockBadge && (
            <View
              style={[styles.stockBadge, { backgroundColor: stockBadge.color }]}
              testID={`stock-badge-${product.id}`}
            >
              <Text style={styles.stockBadgeText}>{stockBadge.label}</Text>
            </View>
          )}

          <InventoryBadge
            badge={inventoryBadge}
            quantity={inventoryQuantity}
            compact
            testID={`inventory-badge-${product.id}`}
          />

          <CompareButton product={product} testID={`compare-btn-${product.id}`} />
        </View>
      </TouchableOpacity>

      {/* ⋮ context menu trigger — tap-accessible fallback for long-press */}
      {contextMenu && (
        <TouchableOpacity
          testID={`product-context-trigger-${product.id}`}
          style={styles.contextTrigger}
          onPress={() => setContextMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${product.name}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.contextTriggerText, { color: colors.espresso }]}>⋮</Text>
        </TouchableOpacity>
      )}

      {contextMenu && (
        <ProductContextMenu
          visible={contextMenuVisible}
          product={product}
          onClose={handleContextMenuClose}
          onAddToCart={contextMenu.onAddToCart}
          onAddToWishlist={contextMenu.onAddToWishlist}
          onShare={contextMenu.onShare}
        />
      )}
    </>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    aspectRatio: 4 / 3,
    overflow: 'hidden',
    backgroundColor: '#F2E8D5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  info: {
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingStars: {
    fontSize: 12,
    letterSpacing: 1,
  },
  reviewCount: {
    fontSize: 11,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  stockBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginTop: 2,
  },
  stockBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  contextTrigger: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    padding: 4,
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextTriggerText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  },
});

/**
 * @module ProductCard
 *
 * Primary product display card used in grids and lists throughout the app.
 * Shows product image with wishlist button overlay, badge (Sale/New/Bestseller),
 * out-of-stock overlay, name, description, star rating, and price. Memoized
 * to prevent unnecessary re-renders in FlatList/ScrollView contexts.
 */

import React, { memo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { type Product, DEFAULT_PRODUCT_BLURHASH } from '@/data/products';
import { formatPrice } from '@/utils';
import { sharedTransitionTag } from '@/utils/sharedTransitionTag';
import { WishlistButton } from './WishlistButton';

interface Props {
  product: Product;
  onPress?: (product: Product) => void;
  onLongPress?: (product: Product) => void;
  testID?: string;
}

/** Memoized product card with image, badge, rating, price, and wishlist toggle. */
export const ProductCard = memo(function ProductCard({
  product,
  onPress,
  onLongPress,
  testID,
}: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();

  const badgeColor =
    product.badge === 'Sale'
      ? colors.sunsetCoral
      : product.badge === 'New'
        ? colors.mountainBlue
        : product.badge === 'Bestseller'
          ? colors.mountainBlue
          : colors.espressoLight;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        shadows.card,
        { backgroundColor: colors.white, borderRadius: borderRadius.card },
      ]}
      onPress={() => onPress?.(product)}
      onLongPress={onLongPress ? () => onLongPress(product) : undefined}
      testID={testID ?? `product-card-${product.id}`}
      accessibilityLabel={`${product.name}, ${formatPrice(product.price)}`}
      accessibilityRole="button"
      activeOpacity={0.7}
    >
      {/* Image with shared element transition tag */}
      <Animated.View
        sharedTransitionTag={sharedTransitionTag(`product-image-${product.id}`)}
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
        />
        <WishlistButton product={product} size="sm" overlay testID={`wishlist-btn-${product.id}`} />
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
          <Text style={[styles.reviewCount, { color: colors.muted }]}>({product.reviewCount})</Text>
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
      </View>
    </TouchableOpacity>
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
});

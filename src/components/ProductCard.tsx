import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, shadows, typography } from '@/theme/tokens';
import { formatPrice } from '@/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  badge?: string;
  originalPrice?: number;
}

interface Props {
  product: Product;
  onPress: (product: Product) => void;
  testID?: string;
}

export function ProductCard({ product, onPress, testID }: Props) {
  const [imageError, setImageError] = useState(false);

  const handlePress = useCallback(() => {
    onPress(product);
  }, [product, onPress]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  return (
    <TouchableOpacity
      style={[styles.card, shadows.card]}
      onPress={handlePress}
      testID={testID}
      accessibilityLabel={`${product.name}, ${formatPrice(product.price)}`}
      accessibilityRole="button"
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {imageError ? (
          <View
            style={styles.imagePlaceholder}
            testID={testID ? `${testID}-image-placeholder` : undefined}
          >
            <Text style={styles.placeholderText}>🛋️</Text>
          </View>
        ) : (
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            testID={testID ? `${testID}-image` : undefined}
            onError={handleImageError}
            resizeMode="cover"
          />
        )}
        {product.badge && (
          <View style={styles.badge} testID={testID ? `${testID}-badge` : undefined}>
            <Text style={styles.badgeText}>{product.badge}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          {product.originalPrice && product.originalPrice > product.price && (
            <Text style={styles.originalPrice}>
              {formatPrice(product.originalPrice)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.sandLight,
    borderRadius: borderRadius.card,
    overflow: 'hidden',
  },
  imageContainer: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.sandDark,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sandDark,
  },
  placeholderText: {
    fontSize: 40,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.sunsetCoral,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  info: {
    padding: spacing.md,
  },
  name: {
    ...typography.body,
    color: colors.espresso,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    ...typography.price,
    color: colors.espresso,
  },
  originalPrice: {
    ...typography.priceStrike,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
});

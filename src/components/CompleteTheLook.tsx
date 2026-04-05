/**
 * @module CompleteTheLook
 *
 * Horizontal scroll strip of curated complementary products shown below the
 * product description on the PDP. Driven by `useCompleteTheLook`.
 *
 * Shows 2-4 products. Renders nothing when loading completes with 0 results.
 * Shows a skeleton while fetching.
 *
 * cm-3n3: Complete the look — complementary product recommendations on PDP.
 */

import React, { memo, useCallback } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import type { Product } from '@/data/products';
import { asWebP } from '@/utils';
import { DEFAULT_PRODUCT_BLURHASH } from '@/data/products';

export interface CompleteTheLookProps {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  onProductPress: (product: Product) => void;
}

const CARD_WIDTH = 150;
const CARD_IMAGE_HEIGHT = 110;

function SkeletonCard() {
  const { colors, borderRadius } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.overlay,
          borderRadius: borderRadius.md,
          width: CARD_WIDTH,
          height: CARD_IMAGE_HEIGHT + 60,
        },
      ]}
    />
  );
}

function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: (product: Product) => void;
}) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const handlePress = useCallback(() => onPress(product), [onPress, product]);

  return (
    <TouchableOpacity
      testID={`complete-the-look-card-${product.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, $${product.price.toFixed(2)}`}
      onPress={handlePress}
      style={[
        styles.card,
        {
          backgroundColor: colors.white,
          borderRadius: borderRadius.md,
          width: CARD_WIDTH,
          ...shadows.card,
        },
      ]}
    >
      {product.images[0] && (
        <Image
          source={{ uri: asWebP(product.images[0].uri) }}
          style={[
            styles.image,
            { borderTopLeftRadius: borderRadius.md, borderTopRightRadius: borderRadius.md },
          ]}
          contentFit="cover"
          transition={200}
          recyclingKey={product.id}
          accessibilityLabel={product.images[0].alt}
          cachePolicy="memory-disk"
          placeholder={{ blurhash: product.images[0].blurhash ?? DEFAULT_PRODUCT_BLURHASH }}
        />
      )}
      <View style={[styles.cardBody, { padding: spacing.sm }]}>
        <Text style={[styles.name, { color: colors.espresso }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.price, { color: colors.espresso }]}>${product.price.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const MemoProductCard = memo(ProductCard);
const keyExtractor = (item: Product) => item.id;

/** Horizontal "Complete the Look" strip — shows curated complementary products. */
export function CompleteTheLook({ products, isLoading, onProductPress }: CompleteTheLookProps) {
  const { colors, spacing, typography } = useTheme();

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <MemoProductCard product={item} onPress={onProductPress} />
    ),
    [onProductPress],
  );

  const renderSeparator = useCallback(
    () => <View style={{ width: spacing.sm }} />,
    [spacing.sm],
  );

  if (isLoading) {
    return (
      <View testID="complete-the-look-skeleton" style={styles.skeletonRow}>
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    );
  }

  if (products.length === 0) return null;

  return (
    <View testID="complete-the-look-strip">
      <Text
        style={[
          styles.title,
          { color: colors.espresso, fontFamily: typography.bodyFamilyBold, marginBottom: spacing.sm },
        ]}
        accessibilityRole="header"
      >
        Complete the Look
      </Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={products}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingHorizontal: spacing.md }}
        ItemSeparatorComponent={renderSeparator}
        renderItem={renderItem}
        windowSize={3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  card: {
    overflow: 'hidden',
  },
  image: {
    width: CARD_WIDTH,
    height: CARD_IMAGE_HEIGHT,
  },
  cardBody: {},
  name: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
  },
  skeletonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
});

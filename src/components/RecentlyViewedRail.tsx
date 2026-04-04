/**
 * @module RecentlyViewedRail
 *
 * Horizontal rail of recently viewed products shown at the bottom of
 * ProductDetailScreen. Renders nothing when history is empty or all items
 * match the current product.
 */
import React, { memo, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { PRODUCTS, DEFAULT_PRODUCT_BLURHASH, type Product } from '@/data/products';
import { asWebP } from '@/utils';

const CARD_IMAGE_SIZE = 120;
const MAX_DISPLAY = 5;

interface Props {
  /** Ordered list of recently viewed slugs (most recent first). */
  slugs: string[];
  /** Slug of the product currently being viewed — excluded from the rail. */
  currentSlug: string;
  /** Called with the slug when the user taps a card. */
  onProductPress: (slug: string) => void;
  testID?: string;
}

export const RecentlyViewedRail = memo(function RecentlyViewedRail({
  slugs,
  currentSlug,
  onProductPress,
  testID = 'recently-viewed-rail',
}: Props) {
  const { colors, spacing, borderRadius } = useTheme();

  const products = useMemo<Product[]>(() => {
    const seen = new Set<string>();
    const result: Product[] = [];
    for (const slug of slugs) {
      if (slug === currentSlug) continue;
      if (seen.has(slug)) continue;
      const product = PRODUCTS.find((p) => p.slug === slug);
      if (!product) continue;
      seen.add(slug);
      result.push(product);
      if (result.length >= MAX_DISPLAY) break;
    }
    return result;
  }, [slugs, currentSlug]);

  if (products.length === 0) return null;

  return (
    <View style={[styles.section, { paddingHorizontal: spacing.lg }]} testID={testID}>
      <Text style={[styles.header, { color: colors.espresso }]} accessibilityRole="header">
        Recently Viewed
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {products.map((product) => (
          <TouchableOpacity
            key={product.slug}
            style={[
              styles.card,
              {
                backgroundColor: colors.sandBase,
                borderRadius: borderRadius.card,
              },
            ]}
            onPress={() => onProductPress(product.slug)}
            testID={`recently-viewed-card-${product.slug}`}
            accessibilityRole="button"
            accessibilityLabel={`View ${product.name}`}
          >
            <Image
              source={{ uri: asWebP(product.images[0]?.uri ?? '') }}
              style={[styles.image, { borderRadius: borderRadius.card }]}
              contentFit="cover"
              transition={200}
              recyclingKey={product.slug}
              cachePolicy="memory-disk"
              placeholder={{ blurhash: product.images[0]?.blurhash ?? DEFAULT_PRODUCT_BLURHASH }}
              testID={`recently-viewed-img-${product.slug}`}
              accessibilityLabel={product.images[0]?.alt ?? product.name}
            />
            <Text style={[styles.name, { color: colors.espresso }]} numberOfLines={2}>
              {product.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    marginBottom: 8,
  },
  header: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  card: {
    width: CARD_IMAGE_SIZE,
  },
  image: {
    width: CARD_IMAGE_SIZE,
    height: CARD_IMAGE_SIZE,
    marginBottom: 6,
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});

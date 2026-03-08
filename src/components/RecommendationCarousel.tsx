/**
 * @module RecommendationCarousel
 *
 * Horizontally scrolling product carousel driven by the recommendation engine.
 * Displays a titled row of compact product cards with image, name, price, and
 * star rating. Used on the home screen, product detail page, and cart for
 * cross-sell and "You May Also Like" sections.
 */

import React, { useCallback, memo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { StarRating } from './StarRating';
import { Product, DEFAULT_PRODUCT_BLURHASH } from '@/data/products';

interface RecommendationCarouselProps {
  title: string;
  products: Product[];
  onProductPress?: (product: Product) => void;
  onSeeAll?: () => void;
  testID?: string;
}

const Separator = memo(function Separator({ width }: { width: number }) {
  return <View style={{ width }} />;
});

const keyExtractor = (item: Product) => item.id;

/** Horizontal product recommendation carousel with header and optional "See All" link. */
export function RecommendationCarousel({
  title,
  products,
  onProductPress,
  onSeeAll,
  testID = 'recommendation-carousel',
}: RecommendationCarouselProps) {
  const { colors, spacing, borderRadius, shadows } = useTheme();

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <TouchableOpacity
        testID={`rec-card-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, $${item.price.toFixed(2)}`}
        onPress={() => onProductPress?.(item)}
        style={[
          styles.card,
          {
            backgroundColor: colors.white,
            borderRadius: borderRadius.md,
            ...shadows.card,
          },
        ]}
      >
        {item.images[0] && (
          <Image
            source={{ uri: item.images[0].uri }}
            style={[
              styles.image,
              { borderTopLeftRadius: borderRadius.md, borderTopRightRadius: borderRadius.md },
            ]}
            contentFit="cover"
            transition={200}
            recyclingKey={item.id}
            accessibilityLabel={item.images[0].alt}
            cachePolicy="memory-disk"
            placeholder={{ blurhash: item.images[0].blurhash ?? DEFAULT_PRODUCT_BLURHASH }}
          />
        )}
        <View style={[styles.cardBody, { padding: spacing.sm }]}>
          <Text style={[styles.name, { color: colors.espresso }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.price, { color: colors.espresso }]}>${item.price.toFixed(2)}</Text>
          <StarRating
            rating={item.rating}
            size="sm"
            count={item.reviewCount}
            testID={`rec-card-rating-${item.id}`}
          />
        </View>
      </TouchableOpacity>
    ),
    [onProductPress, colors, borderRadius, shadows, spacing],
  );

  const renderSeparator = useCallback(() => <Separator width={spacing.sm} />, [spacing.sm]);

  if (products.length === 0) return null;

  return (
    <View testID={testID}>
      <View style={styles.header}>
        <Text
          testID="carousel-title"
          accessibilityRole="header"
          style={[styles.title, { color: colors.espresso, marginBottom: spacing.sm }]}
        >
          {title}
        </Text>
        {onSeeAll && (
          <TouchableOpacity
            testID="see-all-link"
            onPress={onSeeAll}
            accessibilityLabel={`See all ${title}`}
          >
            <Text style={[styles.seeAll, { color: colors.mountainBlue }]}>See All</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        testID="recommendation-list"
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

const CARD_WIDTH = 160;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    width: CARD_WIDTH,
    overflow: 'hidden',
  },
  image: {
    width: CARD_WIDTH,
    height: 120,
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
    marginBottom: 4,
  },
});

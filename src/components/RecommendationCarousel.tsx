import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { useTheme } from '@/theme';
import { StarRating } from './StarRating';
import { Product } from '@/data/products';

interface RecommendationCarouselProps {
  title: string;
  products: Product[];
  onProductPress?: (product: Product) => void;
  onSeeAll?: () => void;
  testID?: string;
}

export const RecommendationCarousel = React.memo(function RecommendationCarousel({
  title,
  products,
  onProductPress,
  onSeeAll,
  testID = 'recommendation-carousel',
}: RecommendationCarouselProps) {
  const { colors, spacing, borderRadius, shadows } = useTheme();

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
          <TouchableOpacity testID="see-all-link" onPress={onSeeAll}>
            <Text style={[styles.seeAll, { color: colors.mountainBlue }]}>See All</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        testID="recommendation-list"
        horizontal
        showsHorizontalScrollIndicator={false}
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md }}
        ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
        renderItem={({ item }) => (
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
              <View style={{ overflow: 'hidden', borderTopLeftRadius: borderRadius.md, borderTopRightRadius: borderRadius.md }}>
                <Image
                  source={{ uri: item.images[0].uri }}
                  style={styles.image}
                  accessibilityLabel={item.images[0].alt}
                />
              </View>
            )}
            <View style={[styles.cardBody, { padding: spacing.sm }]}>
              <Text style={[styles.name, { color: colors.espresso }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[styles.price, { color: colors.espresso }]}>
                ${item.price.toFixed(2)}
              </Text>
              <StarRating
                rating={item.rating}
                size="sm"
                count={item.reviewCount}
                testID={`rec-card-rating-${item.id}`}
              />
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
});

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

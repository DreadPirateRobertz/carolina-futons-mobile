/**
 * @module BundleRow
 *
 * Horizontal "Pairs Well With" product scroll row for the Product Detail Screen.
 * Renders a header and a horizontal ScrollView of ProductCards for bundle deal
 * products. Returns null when the products array is empty so the row hides
 * itself entirely with no visual gap.
 */

import React, { memo } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/theme';
import { type Product } from '@/data/products';
import { ProductCard } from './ProductCard';

interface Props {
  products: Product[];
  onProductPress: (product: Product) => void;
  testID?: string;
}

export const BundleRow = memo(function BundleRow({ products, onProductPress, testID }: Props) {
  if (products.length === 0) return null;

  return (
    <BundleRowInner products={products} onProductPress={onProductPress} testID={testID} />
  );
});

function BundleRowInner({ products, onProductPress, testID }: Props) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={styles.container} testID={testID}>
      <Text
        style={[styles.header, { color: colors.espresso, fontFamily: typography.bodyFamilyBold }]}
        accessibilityRole="header"
      >
        Pairs Well With
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md }]}
        testID={testID ? `${testID}-scroll` : undefined}
      >
        {products.map((product) => (
          <View key={product.id} style={styles.cardWrapper}>
            <ProductCard product={product} onPress={onProductPress} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  header: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  cardWrapper: {
    width: 200,
  },
});

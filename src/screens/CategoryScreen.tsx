/**
 * @module CategoryScreen
 *
 * Displays a filtered product grid for a single product category (e.g., "Futons",
 * "Covers", "Mattresses"). Reached from the ShopScreen category chips or deep
 * links. Includes sort controls and an empty state when the category has no
 * products yet.
 */

import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useProducts, type Product, type ProductCategory } from '@/hooks/useProducts';
import { ProductCard } from '@/components/ProductCard';
import { SortPicker } from '@/components/SortPicker';
import { EmptyState } from '@/components/EmptyState';

/** Props for the CategoryScreen component. */
interface Props {
  /** Explicit category identifier. Takes precedence over slug and route params. */
  categoryId?: ProductCategory;
  /** URL-friendly category slug; fallback when categoryId is not provided. */
  slug?: string;
  /** React Navigation route; used as final fallback for the category slug. */
  route?: { params?: { slug?: string } };
  /** Override for the displayed page title; defaults to capitalised category name. */
  categoryTitle?: string;
  /** Callback when the user taps a product card. */
  onProductPress?: (product: Product) => void;
  /** Callback for the back navigation button. */
  onBack?: () => void;
  /** Test identifier for end-to-end tests. */
  testID?: string;
}

/**
 * Category product listing screen with sort controls and two-column grid layout.
 *
 * @param props - {@link Props}
 * @returns A scrollable product grid filtered to a single category.
 */
export function CategoryScreen({
  categoryId,
  slug,
  route,
  categoryTitle,
  onProductPress,
  onBack,
  testID,
}: Props) {
  const resolvedCategory = (categoryId ??
    slug ??
    route?.params?.slug ??
    'futons') as ProductCategory;
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const { products, sortBy, setSortBy, setSelectedCategory } = useProducts({
    initialCategory: resolvedCategory,
  });

  // Sync hook state when category changes
  useEffect(() => {
    setSelectedCategory(resolvedCategory ?? null);
  }, [resolvedCategory, setSelectedCategory]);

  const title =
    categoryTitle ?? resolvedCategory.charAt(0).toUpperCase() + resolvedCategory.slice(1);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => <ProductCard product={item} onPress={onProductPress} />,
    [onProductPress],
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  const renderHeader = useCallback(
    () => (
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <View style={styles.titleRow}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              testID="category-back"
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Text style={[styles.backText, { color: colors.espresso }]}>{'‹'}</Text>
            </TouchableOpacity>
          )}
          <Text
            style={[styles.title, { color: colors.espresso }]}
            testID="category-title"
            accessibilityRole="header"
          >
            {title}
          </Text>
          <Text style={[styles.count, { color: colors.espressoLight }]} testID="category-count">
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </Text>
        </View>
        <SortPicker value={sortBy} onChange={setSortBy} resultCount={products.length} />
      </View>
    ),
    [title, products.length, sortBy, colors, spacing, onBack, setSortBy],
  );

  const renderEmpty = useCallback(
    () => (
      <EmptyState
        icon="empty"
        title="No products yet"
        message={`We're adding more ${title.toLowerCase()} soon. Check back later!`}
        action={onBack ? { label: 'Go Back', onPress: onBack } : undefined}
        testID="category-empty"
      />
    ),
    [title, onBack],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandBase, paddingTop: insets.top }]}
      testID={testID ?? 'category-screen'}
    >
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={products.length > 0 ? styles.row : undefined}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
        testID="category-product-list"
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
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 8,
  },
  backButton: {
    marginRight: 4,
    paddingRight: 4,
  },
  backText: {
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  count: {
    fontSize: 15,
  },
  listContent: {
    flexGrow: 1,
  },
  row: {
    paddingHorizontal: 10,
  },
});

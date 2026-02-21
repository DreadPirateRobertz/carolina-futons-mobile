import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { PRODUCTS, type Product, type ProductCategory, type SortOption } from '@/data/products';
import { ProductCard } from '@/components/ProductCard';
import { SortPicker } from '@/components/SortPicker';
import { EmptyState } from '@/components/EmptyState';

interface Props {
  categoryId?: ProductCategory;
  categoryTitle?: string;
  onProductPress?: (product: Product) => void;
  onBack?: () => void;
  testID?: string;
}

export function CategoryScreen({
  categoryId = 'futons',
  categoryTitle,
  onProductPress,
  onBack,
  testID,
}: Props) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  const title = categoryTitle ?? categoryId.charAt(0).toUpperCase() + categoryId.slice(1);

  const products = useMemo(() => {
    let result = PRODUCTS.filter((p) => p.category === categoryId);

    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        result.reverse();
        break;
      case 'featured':
      default:
        result.sort((a, b) => {
          if (a.badge === 'Bestseller' && b.badge !== 'Bestseller') return -1;
          if (b.badge === 'Bestseller' && a.badge !== 'Bestseller') return 1;
          return b.reviewCount - a.reviewCount;
        });
        break;
    }

    return result;
  }, [categoryId, sortBy]);

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

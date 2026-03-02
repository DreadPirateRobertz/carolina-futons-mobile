import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useProducts, type Product, type ProductCategory } from '@/hooks/useProducts';
import { ProductCard } from '@/components/ProductCard';
import { SortPicker } from '@/components/SortPicker';
import { EmptyState } from '@/components/EmptyState';

interface Props {
  categoryId?: ProductCategory;
  slug?: string;
  route?: { params?: { slug?: string } };
  categoryTitle?: string;
  onProductPress?: (product: Product) => void;
  onBack?: () => void;
  testID?: string;
}

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { products, sortBy, setSortBy, setSelectedCategory } = useProducts({
    initialCategory: resolvedCategory,
  });

  // Sync hook state when category changes
  useEffect(() => {
    setSelectedCategory(resolvedCategory ?? null);
  }, [resolvedCategory, setSelectedCategory]);

  const title =
    categoryTitle ?? resolvedCategory.charAt(0).toUpperCase() + resolvedCategory.slice(1);

  const handleProductPress = useCallback(
    (product: Product) => {
      if (onProductPress) {
        onProductPress(product);
      } else {
        navigation.navigate('ProductDetail', { slug: product.slug });
      }
    },
    [onProductPress, navigation],
  );

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => <ProductCard product={item} onPress={handleProductPress} />,
    [handleProductPress],
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

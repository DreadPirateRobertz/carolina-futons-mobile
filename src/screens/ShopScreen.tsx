import React, { useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useProducts, type Product } from '@/hooks/useProducts';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { SearchBar } from '@/components/SearchBar';
import { CategoryFilter } from '@/components/CategoryFilter';
import { SortPicker } from '@/components/SortPicker';
import { ProductCard } from '@/components/ProductCard';
import { SkeletonProductGrid } from '@/components/SkeletonProductCard';
import { EmptyState } from '@/components/EmptyState';
import { SearchIllustration } from '@/components/illustrations';

interface Props {
  onProductPress?: (product: Product) => void;
  testID?: string;
}

export function ShopScreen({ onProductPress, testID }: Props) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    products,
    categories,
    searchQuery,
    selectedCategory,
    sortBy,
    isLoading,
    isInitialLoading,
    suggestions,
    setSearchQuery,
    setSelectedCategory,
    setSortBy,
    loadMore,
    refresh,
  } = useProducts();
  const { recentSearches, addSearch, removeSearch, clearAll } = useRecentSearches();

  const handleSubmitSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      addSearch(query);
    },
    [setSearchQuery, addSearch],
  );

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => <ProductCard product={item} onPress={onProductPress} />,
    [onProductPress],
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  const renderHeader = useCallback(
    () => (
      <View>
        {/* Title */}
        <View style={[styles.titleRow, { paddingHorizontal: spacing.md }]}>
          <Text style={[styles.title, { color: colors.espresso }]}>Shop</Text>
        </View>

        {/* Search with autocomplete */}
        <View style={[styles.searchContainer, { paddingHorizontal: spacing.md }]}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            suggestions={suggestions}
            recentSearches={recentSearches}
            onSubmitSearch={handleSubmitSearch}
            onRemoveRecent={removeSearch}
            onClearRecent={clearAll}
          />
        </View>

        {/* Category chips */}
        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {/* Sort + count */}
        <SortPicker value={sortBy} onChange={setSortBy} resultCount={products.length} />
      </View>
    ),
    [
      searchQuery,
      selectedCategory,
      sortBy,
      products.length,
      categories,
      colors,
      spacing,
      suggestions,
      recentSearches,
      setSearchQuery,
      setSelectedCategory,
      setSortBy,
      handleSubmitSearch,
      removeSearch,
      clearAll,
    ],
  );

  const renderEmpty = useCallback(
    () =>
      isInitialLoading ? (
        <SkeletonProductGrid count={6} />
      ) : (
        <EmptyState
          illustration={<SearchIllustration testID="search-illustration" />}
          title="No products found"
          message={
            searchQuery
              ? `No results for "${searchQuery}". Try a different search.`
              : 'No products in this category yet.'
          }
          testID="shop-empty"
        />
      ),
    [searchQuery, colors, isInitialLoading],
  );

  const renderFooter = useCallback(
    () =>
      isLoading ? (
        <View style={styles.footer} testID="shop-loading-more">
          <ActivityIndicator color={colors.mountainBlue} />
        </View>
      ) : null,
    [isLoading, colors],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandBase, paddingTop: insets.top }]}
      testID={testID ?? 'shop-screen'}
    >
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={refresh}
        refreshing={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        windowSize={5}
        maxToRenderPerBatch={6}
        removeClippedSubviews
        testID="product-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleRow: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  searchContainer: {
    marginBottom: 4,
  },
  listContent: {
    flexGrow: 1,
  },
  row: {
    paddingHorizontal: 10,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

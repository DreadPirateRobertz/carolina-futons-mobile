import React, { useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { useProducts, type Product } from '@/hooks/useProducts';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { SearchBar } from '@/components/SearchBar';
import { CategoryFilter } from '@/components/CategoryFilter';
import { SortPicker } from '@/components/SortPicker';
import { ProductCard } from '@/components/ProductCard';

interface Props {
  onProductPress?: (product: Product) => void;
  testID?: string;
}

export function ShopScreen({ onProductPress, testID }: Props) {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    products,
    categories,
    searchQuery,
    selectedCategory,
    sortBy,
    isLoading,
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
          <Text
            style={[
              styles.title,
              {
                color: colors.espresso,
                fontFamily: typography.headingFamily,
              },
            ]}
          >
            Shop
          </Text>
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
    () => (
      <View
        style={[styles.emptyContainer, { backgroundColor: darkPalette.surface, borderRadius: 16 }]}
        testID="shop-empty"
      >
        <Text style={[styles.emptyIcon]}>🔍</Text>
        <Text
          style={[
            styles.emptyTitle,
            { color: colors.espresso, fontFamily: typography.headingFamily },
          ]}
        >
          No products found
        </Text>
        <Text
          style={[
            styles.emptyMessage,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
        >
          {searchQuery
            ? `No results for "${searchQuery}". Try a different search.`
            : 'No products in this category yet.'}
        </Text>
      </View>
    ),
    [searchQuery, colors],
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
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

/**
 * @module ShopScreen
 *
 * Primary product browsing screen. Renders a two-column product grid
 * with search (including autocomplete and recent-search history),
 * category chip filters, sort control, pull-to-refresh, and infinite
 * scroll pagination. Uses virtualized FlatList with tuned batch sizes
 * for smooth scrolling on lower-end devices.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { MountainSkyline } from '@/components/MountainSkyline';
import { MountainRefreshControl, MountainRefreshIndicator } from '@/components/MountainRefreshControl';
import { useProducts, type Product, type ProductCategory, type SortOption } from '@/hooks/useProducts';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { SearchBar } from '@/components/SearchBar';
import { CategoryFilter } from '@/components/CategoryFilter';
import { SortPicker } from '@/components/SortPicker';
import { ProductCard } from '@/components/ProductCard';
import { events } from '@/services/analytics';
import type { RootStackParamList } from '@/navigation/AppNavigator';

interface Props {
  onProductPress?: (product: Product) => void;
  testID?: string;
}

/** Two-column product grid with search, category filters, sort, and infinite scroll. */
export function ShopScreen({ onProductPress, testID }: Props) {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    // Allow animation to play briefly since refresh() is synchronous
    setTimeout(() => setRefreshing(false), 600);
  }, [refresh]);

  const handleSubmitSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      addSearch(query);
      events.search(query, products.length);
    },
    [setSearchQuery, addSearch, products.length],
  );

  const renderProduct = useCallback(
    ({ item, index }: { item: Product; index: number }) => (
      <Animated.View
        testID={`product-card-animated-${item.id}`}
        entering={FadeInDown.delay(index * 80).duration(400)}
      >
        <ProductCard product={item} onPress={handleProductPress} />
      </Animated.View>
    ),
    [handleProductPress],
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  const renderHeader = useCallback(
    () => (
      <View>
        <MountainRefreshIndicator refreshing={refreshing} />
        {/* Mountain skyline header */}
        <MountainSkyline variant="sunset" height={60} testID="shop-mountain-skyline" />

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
          onSelect={(category: ProductCategory | null) => {
            setSelectedCategory(category);
            if (category) events.filterCategory(category);
          }}
        />

        {/* Sort + count */}
        <SortPicker value={sortBy} onChange={(sort: SortOption) => {
          setSortBy(sort);
          events.sortProducts(sort);
        }} resultCount={products.length} />
      </View>
    ),
    [
      refreshing,
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
            { color: darkPalette.textPrimary, fontFamily: typography.headingFamily },
          ]}
        >
          No products found
        </Text>
        <Text
          style={[
            styles.emptyMessage,
            { color: darkPalette.textMuted, fontFamily: typography.bodyFamily },
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
        refreshControl={
          <MountainRefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            testID="shop-refresh-control"
          />
        }
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

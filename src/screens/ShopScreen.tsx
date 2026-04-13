/**
 * @module ShopScreen
 *
 * Primary product browsing screen. Renders a two-column product grid
 * with search (including autocomplete and recent-search history),
 * category chip filters, sort control, pull-to-refresh, and infinite
 * scroll pagination. Uses virtualized FlatList with tuned batch sizes
 * for smooth scrolling on lower-end devices.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ScrollView } from 'react-native';
import { BrandedSpinner } from '@/components/BrandedSpinner';
import { SkeletonProductGrid } from '@/components/SkeletonProductCard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { MountainSkyline } from '@/components/MountainSkyline';
import {
  MountainRefreshControl,
  MountainRefreshIndicator,
} from '@/components/MountainRefreshControl';
import {
  useProducts,
  type Product,
  type ProductCategory,
  type SortOption,
} from '@/hooks/useProducts';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { SearchBar } from '@/components/SearchBar';
import { CategoryFilter } from '@/components/CategoryFilter';
import { SortPicker } from '@/components/SortPicker';
import { FilterButton } from '@/components/FilterButton';
import { FilterModal } from '@/components/FilterModal';
import { ProductCard } from '@/components/ProductCard';
import { events } from '@/services/analytics';
import { useScrollPerformance } from '@/hooks/useScrollPerformance';
import { SearchEmptyState } from '@/components/SearchEmptyState';
import { CompareTray } from '@/components/CompareTray';
import { NetworkErrorState } from '@/components/NetworkErrorState';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useBundleDeals } from '@/hooks/useBundleDeals';
import { BundleDealsCard } from '@/components/BundleDealsCard';
import type { RootStackParamList } from '@/navigation/AppNavigator';

/** Estimated height of a product row for getItemLayout optimization */
const ESTIMATED_PRODUCT_ROW_HEIGHT = 262;

interface Props {
  onProductPress?: (product: Product) => void;
  testID?: string;
}

/** Two-column product grid with search, category filters, sort, and infinite scroll. */
export function ShopScreen({ onProductPress, testID }: Props) {
  const { colors, spacing, typography } = useTheme();
  const reduceMotion = useReducedMotion();
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
    filters,
    activeFilterCount,
    availableFabrics,
    priceExtent,
    isLoading,
    isInitialLoading,
    suggestions,
    fetchError,
    setSearchQuery,
    setSelectedCategory,
    setSortBy,
    setFilters,
    loadMore,
    refresh,
  } = useProducts();
  const { recentSearches, addSearch, removeSearch, clearAll } = useRecentSearches();
  const { recentProducts } = useRecentlyViewed();
  const { bundles, isLoading: bundlesLoading } = useBundleDeals();
  const scrollPerf = useScrollPerformance('ShopScreen');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (fetchError) {
      console.error('[ShopScreen] product fetch failed:', fetchError);
    }
  }, [fetchError]);

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
        entering={reduceMotion ? undefined : FadeInDown.delay(index * 80).duration(400)}
      >
        <ProductCard product={item} onPress={handleProductPress} />
      </Animated.View>
    ),
    [handleProductPress, reduceMotion],
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

        {/* Sort + filter + count */}
        <SortPicker
          value={sortBy}
          onChange={(sort: SortOption) => {
            setSortBy(sort);
            events.sortProducts(sort);
          }}
          resultCount={products.length}
          leftContent={
            <FilterButton activeCount={activeFilterCount} onPress={() => setShowFilters(true)} />
          }
        />

        {/* Recently viewed rail — surfaces last 10 viewed products */}
        {recentProducts.length > 0 && (
          <View testID="shop-recently-viewed-rail">
            <Text
              style={[styles.recentlyViewedTitle, { color: colors.espresso }]}
              accessibilityRole="header"
            >
              Recently Viewed
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
            >
              {recentProducts.slice(0, 10).map((product) => (
                <View key={product.id} style={styles.recentProductCard}>
                  <ProductCard product={product} onPress={onProductPress} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bundle deals promotions */}
        {!bundlesLoading && bundles.length > 0 && (
          <View
            testID="shop-bundle-deals"
            style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}
          >
            <Text
              style={[styles.recentlyViewedTitle, { color: colors.espresso }]}
              accessibilityRole="header"
            >
              Bundle Deals
            </Text>
            {bundles.map((bundle, index) => (
              <BundleDealsCard
                key={`${bundle.discountCode}-${index}`}
                bundle={bundle}
                testID={`shop-bundle-${index}`}
              />
            ))}
          </View>
        )}
      </View>
    ),
    [
      refreshing,
      searchQuery,
      selectedCategory,
      sortBy,
      activeFilterCount,
      products.length,
      recentProducts,
      categories,
      colors,
      spacing,
      suggestions,
      recentSearches,
      setSearchQuery,
      setSelectedCategory,
      setSortBy,
      setShowFilters,
      handleSubmitSearch,
      removeSearch,
      clearAll,
      bundles,
      bundlesLoading,
      onProductPress,
      typography.headingFamily,
    ],
  );

  const handleEmptyCategoryPress = useCallback(
    (category: ProductCategory) => {
      setSearchQuery('');
      setSelectedCategory(category);
    },
    [setSearchQuery, setSelectedCategory],
  );

  const handleTrendingPress = useCallback(
    (term: string) => {
      setSearchQuery(term);
      addSearch(term);
      events.search(term, 0);
    },
    [setSearchQuery, addSearch],
  );

  const renderEmpty = useCallback(
    () =>
      isInitialLoading ? (
        <SkeletonProductGrid count={6} testID="shop-skeleton" />
      ) : fetchError && !isInitialLoading ? (
        <NetworkErrorState
          message={fetchError.message || 'Could not load products.'}
          onRetry={refresh}
        />
      ) : searchQuery ? (
        <SearchEmptyState
          query={searchQuery}
          categories={categories.map((c) => ({ id: c.id, label: c.label }))}
          onCategoryPress={handleEmptyCategoryPress}
          onTrendingPress={handleTrendingPress}
        />
      ) : (
        <View
          style={[
            styles.emptyContainer,
            { backgroundColor: darkPalette.surface, borderRadius: 16 },
          ]}
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
            No products in this category yet.
          </Text>
        </View>
      ),
    [
      isInitialLoading,
      fetchError,
      refresh,
      searchQuery,
      categories,
      handleEmptyCategoryPress,
      handleTrendingPress,
      typography.bodyFamily,
      typography.headingFamily,
    ],
  );

  const renderFooter = useCallback(
    () =>
      isLoading ? (
        <View style={styles.footer} testID="shop-loading-more">
          <BrandedSpinner color={colors.mountainBlue} />
        </View>
      ) : null,
    [isLoading, colors],
  );

  const handleNavigateToCompare = useCallback(() => {
    navigation.navigate('Compare');
  }, [navigation]);

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
        getItemLayout={(_data, index) => ({
          length: ESTIMATED_PRODUCT_ROW_HEIGHT,
          offset: ESTIMATED_PRODUCT_ROW_HEIGHT * index,
          index,
        })}
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
        onScrollBeginDrag={scrollPerf.onScrollBeginDrag}
        onScrollEndDrag={scrollPerf.onScrollEndDrag}
        onMomentumScrollEnd={scrollPerf.onMomentumScrollEnd}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        windowSize={5}
        maxToRenderPerBatch={6}
        initialNumToRender={4}
        removeClippedSubviews
        testID="product-list"
      />
      <CompareTray onNavigateToCompare={handleNavigateToCompare} testID="shop-compare-tray" />
      <FilterModal
        visible={showFilters}
        filters={filters}
        availableFabrics={availableFabrics}
        priceExtent={priceExtent}
        onApply={setFilters}
        onClose={() => setShowFilters(false)}
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
  recentlyViewedTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  recentProductCard: {
    width: 140,
  },
});

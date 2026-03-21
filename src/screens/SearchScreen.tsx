/**
 * @module SearchScreen
 *
 * Dedicated full-screen search experience. Reached by tapping the search bar
 * on the ShopScreen. Auto-focuses the input, shows recent searches and
 * trending terms, and displays a two-column product results grid with
 * autocomplete suggestions as the user types.
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import {
  useProducts,
  type Product,
  type ProductCategory,
  type SortOption,
} from '@/hooks/useProducts';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { SearchBar } from '@/components/SearchBar';
import { ProductCard } from '@/components/ProductCard';
import { SearchEmptyState } from '@/components/SearchEmptyState';
import { SortPicker } from '@/components/SortPicker';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { events } from '@/services/analytics';
import { useScrollPerformance } from '@/hooks/useScrollPerformance';
import { useVisualSearch } from '@/hooks/useVisualSearch';
import { VisualSearchEmptyState } from '@/components/VisualSearchEmptyState';
import type { RootStackParamList } from '@/navigation/AppNavigator';

const ESTIMATED_PRODUCT_ROW_HEIGHT = 262;

const TRENDING_SEARCHES = ['futon mattress', 'queen size', 'wall bed', 'slipcover', 'memory foam'];

const POPULAR_CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: 'futons', label: 'Futons' },
  { id: 'murphy-beds', label: 'Murphy Beds' },
  { id: 'covers', label: 'Covers' },
  { id: 'mattresses', label: 'Mattresses' },
  { id: 'frames', label: 'Frames' },
  { id: 'pillows', label: 'Pillows' },
  { id: 'accessories', label: 'Accessories' },
];

interface Props {
  testID?: string;
}

export function SearchScreen({ testID }: Props) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scrollPerf = useScrollPerformance('SearchScreen');

  const {
    products,
    categories,
    searchQuery,
    sortBy,
    suggestions,
    isLoading,
    setSearchQuery,
    setSortBy,
    loadMore,
  } = useProducts();
  const { recentSearches, addSearch, removeSearch, clearAll } = useRecentSearches();
  const { trigger, status: vsStatus, results: vsResults, reset: vsReset } = useVisualSearch();
  const [hasSearched, setHasSearched] = useState(false);
  const visualSearchActive = vsStatus === 'success' || vsStatus === 'loading';

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleProductPress = useCallback(
    (product: Product) => {
      navigation.navigate('ProductDetail', { slug: product.slug });
    },
    [navigation],
  );

  const handleSubmitSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      addSearch(query);
      setHasSearched(true);
      events.search(query, products.length);
    },
    [setSearchQuery, addSearch, products.length],
  );

  const handleCategoryPress = useCallback(
    (categoryId: ProductCategory) => {
      navigation.navigate('Category', { slug: categoryId });
    },
    [navigation],
  );

  const handleTrendingPress = useCallback(
    (term: string) => {
      setSearchQuery(term);
      addSearch(term);
      setHasSearched(true);
      events.search(term, 0);
    },
    [setSearchQuery, addSearch],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      if (vsStatus !== 'idle') vsReset();
      setSearchQuery(text);
      if (text.length === 0) {
        setHasSearched(false);
      }
    },
    [setSearchQuery, vsStatus, vsReset],
  );

  const renderProduct = useCallback(
    ({ item, index }: { item: Product; index: number }) => (
      <Animated.View
        testID={`product-card-animated-${item.id}`}
        entering={FadeInDown.delay(index * 60).duration(350)}
      >
        <ProductCard product={item} onPress={handleProductPress} />
      </Animated.View>
    ),
    [handleProductPress],
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  const showResults = searchQuery.length > 0;
  const showInitialState = !showResults;

  const renderResultsHeader = useCallback(
    () => (
      <View style={[styles.resultsHeader, { paddingHorizontal: spacing.md }]}>
        <Text
          style={[styles.resultCount, { color: colors.espressoLight }]}
          testID="search-result-count"
        >
          {products.length} {products.length === 1 ? 'result' : 'results'}
        </Text>
        <SortPicker value={sortBy} onChange={setSortBy} resultCount={products.length} />
      </View>
    ),
    [products.length, sortBy, setSortBy, colors, spacing],
  );

  const renderEmpty = useCallback(
    () =>
      searchQuery ? (
        <SearchEmptyState
          query={searchQuery}
          categories={categories.map((c) => ({ id: c.id, label: c.label }))}
          onCategoryPress={handleCategoryPress}
          onTrendingPress={handleTrendingPress}
        />
      ) : null,
    [searchQuery, categories, handleCategoryPress, handleTrendingPress],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandBase, paddingTop: insets.top }]}
      testID={testID ?? 'search-screen'}
    >
      {/* Header with back + search */}
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          testID="search-back"
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={[styles.backText, { color: colors.espresso }]}>{'‹'}</Text>
        </TouchableOpacity>
        <View style={styles.searchBarWrap}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleChangeText}
            suggestions={suggestions}
            recentSearches={recentSearches}
            onSubmitSearch={handleSubmitSearch}
            onRemoveRecent={removeSearch}
            onClearRecent={clearAll}
            onCameraPress={trigger}
            placeholder="Search products..."
          />
        </View>
      </View>

      {/* Initial state — no query yet */}
      {showInitialState && (
        <View style={styles.initialState} testID="search-initial-state">
          {/* Popular categories */}
          <View style={[styles.section, { paddingHorizontal: spacing.md }]}>
            <Text
              style={[styles.sectionTitle, { color: colors.espressoLight }]}
              accessibilityRole="header"
            >
              Popular Categories
            </Text>
            <View style={[styles.chipsContainer, { gap: spacing.sm }]}>
              {POPULAR_CATEGORIES.map((cat) => (
                <AnimatedPressable
                  key={cat.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: colors.sandLight,
                      borderRadius: borderRadius.pill,
                      borderColor: colors.sandDark,
                    },
                  ]}
                  onPress={() => handleCategoryPress(cat.id)}
                  testID={`initial-category-${cat.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Browse ${cat.label}`}
                  haptic="light"
                >
                  <Text style={[styles.chipText, { color: colors.espresso }]}>{cat.label}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          {/* Trending searches */}
          <View style={[styles.section, { paddingHorizontal: spacing.md }]}>
            <Text
              style={[styles.sectionTitle, { color: colors.espressoLight }]}
              accessibilityRole="header"
            >
              Trending Searches
            </Text>
            <View style={[styles.chipsContainer, { gap: spacing.sm }]}>
              {TRENDING_SEARCHES.map((term, index) => (
                <AnimatedPressable
                  key={term}
                  style={[
                    styles.trendingChip,
                    {
                      backgroundColor: colors.mountainBlue,
                      borderRadius: borderRadius.pill,
                    },
                  ]}
                  onPress={() => handleTrendingPress(term)}
                  testID={`initial-trending-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Search for ${term}`}
                  haptic="light"
                >
                  <Text style={[styles.trendingChipText, { color: colors.offWhite }]}>{term}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Visual search loading */}
      {vsStatus === 'loading' && (
        <View style={styles.vsLoading} testID="visual-search-loading">
          <ActivityIndicator size="large" color={colors.mountainBlueDark} />
        </View>
      )}

      {/* Visual search success — no results */}
      {vsStatus === 'success' && vsResults.length === 0 && (
        <VisualSearchEmptyState
          testID="visual-search-empty-state"
          onBrowseAll={() => navigation.navigate('Tabs', { screen: 'Shop' })}
        />
      )}

      {/* Visual search success — with results */}
      {vsStatus === 'success' && vsResults.length > 0 && (
        <>
          {visualSearchActive && (
            <View testID="visual-search-badge" style={[styles.vsBadge, { paddingHorizontal: spacing.md }]}>
              <Text style={[styles.vsBadgeText, { color: colors.mountainBlueDark }]}>📷 Visual Search</Text>
              <TouchableOpacity onPress={vsReset}>
                <Text style={[styles.vsBadgeClear, { color: colors.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            data={vsResults}
            renderItem={renderProduct}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={vsResults.length > 0 ? styles.row : undefined}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            windowSize={5}
            maxToRenderPerBatch={6}
            initialNumToRender={4}
            removeClippedSubviews
            testID="visual-search-results-grid"
          />
        </>
      )}

      {/* Search results grid */}
      {!visualSearchActive && showResults && (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={products.length > 0 ? styles.row : undefined}
          ListHeaderComponent={products.length > 0 ? renderResultsHeader : undefined}
          ListEmptyComponent={renderEmpty}
          getItemLayout={(_data, index) => ({
            length: ESTIMATED_PRODUCT_ROW_HEIGHT,
            offset: ESTIMATED_PRODUCT_ROW_HEIGHT * index,
            index,
          })}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
          onScrollBeginDrag={scrollPerf.onScrollBeginDrag}
          onScrollEndDrag={scrollPerf.onScrollEndDrag}
          onMomentumScrollEnd={scrollPerf.onMomentumScrollEnd}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          windowSize={5}
          maxToRenderPerBatch={6}
          initialNumToRender={4}
          removeClippedSubviews
          testID="search-results-grid"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  backButton: {
    paddingRight: 4,
  },
  backText: {
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  searchBarWrap: {
    flex: 1,
  },
  initialState: {
    flex: 1,
    paddingTop: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  trendingChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  trendingChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  resultsHeader: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  listContent: {
    flexGrow: 1,
  },
  row: {
    paddingHorizontal: 10,
  },
  vsLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  vsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  vsBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  vsBadgeClear: {
    fontSize: 16,
    padding: 4,
  },
});

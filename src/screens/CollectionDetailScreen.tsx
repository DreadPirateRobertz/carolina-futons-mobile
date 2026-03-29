/**
 * @module CollectionDetailScreen
 *
 * Editorial "Shop the Look" detail page. Each collection is a curated room
 * setup (e.g., "The Minimalist Den") with a hero image, mood tags, editorial
 * description, and a two-column product grid of the items in that look.
 * A footer card shows the combined price for the entire collection.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useCollection } from '@/hooks/useCollections';
import { DEFAULT_COLLECTION_BLURHASH } from '@/data/collections';
import { wixOptimizedUrl } from '@/utils';
import { useCart } from '@/hooks/useCart';
import { useMiniCartDrawer } from '@/hooks/useMiniCartDrawer';
import { ProductCard } from '@/components/ProductCard';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { MountainSkyline } from '@/components/MountainSkyline';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import type { Product } from '@/data/products';

const HERO_HEIGHT = 320;
const PARALLAX_RATE = 0.5;
const AnimatedFlatList = Animated.createAnimatedComponent(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native').FlatList,
) as unknown as typeof import('react-native').FlatList;

/** Route parameters expected by this screen from React Navigation. */
type RouteParams = RouteProp<RootStackParamList, 'CollectionDetail'>;

/** FlatList key extractor using the product id. */
const keyExtractor = (item: Product) => item.id;

/**
 * Collection detail screen with hero image, mood tags, editorial copy,
 * product grid, and a "Complete This Look" price summary footer.
 *
 * @returns The collection detail view, or a "not found" empty state.
 */
export function CollectionDetailScreen() {
  const { colors, spacing, typography, shadows, borderRadius } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();
  const { collection, products } = useCollection(route.params.slug);
  const [heroImageError, setHeroImageError] = useState(false);
  const [heroRetryKey, setHeroRetryKey] = useState(0);

  const handleHeroImageError = useCallback(() => {
    console.error('[CollectionDetailScreen] hero image failed to load:', collection?.heroImage.uri);
    setHeroImageError(true);
  }, [collection?.heroImage.uri]);

  const handleHeroRetry = useCallback(() => {
    setHeroImageError(false);
    setHeroRetryKey((k) => k + 1);
  }, []);
  const { itemCount } = useCart();
  const { open: openCart } = useMiniCartDrawer();

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const heroAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, HERO_HEIGHT],
          [0, HERO_HEIGHT * PARALLAX_RATE],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const totalValue = useMemo(() => products.reduce((sum, p) => sum + p.price, 0), [products]);

  const handleProductPress = useCallback(
    (product: Product) => {
      navigation.navigate('ProductDetail', { slug: product.slug });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={styles.productCell}>
        <ProductCard product={item} onPress={() => handleProductPress(item)} />
      </View>
    ),
    [handleProductPress],
  );

  if (!collection) {
    return (
      <View style={[styles.container, { backgroundColor: colors.sandBase }]}>
        <Header
          title="Collection"
          showBack
          cartCount={itemCount}
          onCartPress={openCart}
          testID="collection-detail-header"
        />
        <EmptyState title="Collection not found" message="This collection may have been removed." />
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      {/* Hero Image */}
      <Animated.View testID="parallax-hero" style={[styles.heroContainer, heroAnimatedStyle]}>
        {heroImageError ? (
          <View testID="hero-image-error-fallback" style={styles.heroImageError}>
            <MountainSkyline variant="sunset" height={HERO_HEIGHT} />
            <TouchableOpacity
              testID="hero-image-retry-btn"
              onPress={handleHeroRetry}
              style={styles.heroRetryBtn}
              accessibilityLabel="Retry loading image"
            >
              <Text style={styles.heroRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Image
            key={heroRetryKey}
            testID="hero-image"
            source={{
              uri:
                wixOptimizedUrl(collection.heroImage.uri, { width: 800, height: 400 }) ??
                collection.heroImage.uri,
            }}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
            accessibilityLabel={collection.heroImage.alt}
            cachePolicy="memory-disk"
            placeholder={{ blurhash: collection.heroImage.blurhash ?? DEFAULT_COLLECTION_BLURHASH }}
            onError={handleHeroImageError}
          />
        )}
        <View style={[styles.heroOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.moodRow, { marginBottom: spacing.sm }]}>
            {collection.mood.map((tag) => (
              <View
                key={tag}
                style={[
                  styles.moodTag,
                  {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: borderRadius.pill,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                  },
                ]}
              >
                <Text style={styles.moodText}>{tag}</Text>
              </View>
            ))}
          </View>
          <Text
            style={[typography.h1, { color: colors.white, fontFamily: typography.headingFamily }]}
          >
            {collection.title}
          </Text>
          <Text
            style={[
              typography.bodyLarge,
              {
                color: 'rgba(255,255,255,0.9)',
                fontFamily: typography.bodyFamily,
                marginTop: spacing.xs,
              },
            ]}
          >
            {collection.subtitle}
          </Text>
        </View>
      </Animated.View>

      {/* Editorial Description */}
      <View style={[styles.editorialSection, { padding: spacing.pagePadding }]}>
        <Text
          style={[
            typography.bodyLarge,
            {
              color: colors.espressoLight,
              fontFamily: typography.bodyFamily,
              lineHeight: 28,
            },
          ]}
        >
          {collection.description}
        </Text>
      </View>

      {/* Section Header */}
      <View
        style={[
          styles.sectionHeader,
          { paddingHorizontal: spacing.pagePadding, marginBottom: spacing.md },
        ]}
      >
        <Text
          style={[typography.h3, { color: colors.espresso, fontFamily: typography.headingFamily }]}
        >
          In This Look
        </Text>
        <Text
          style={[
            typography.bodySmall,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
        >
          {products.length} items
        </Text>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={[styles.footer, { padding: spacing.pagePadding }]}>
      <View
        style={[
          styles.totalCard,
          {
            backgroundColor: colors.sandLight,
            borderRadius: borderRadius.card,
            padding: spacing.lg,
            ...shadows.card,
          },
        ]}
      >
        <View style={styles.totalRow}>
          <Text
            style={[
              typography.h4,
              { color: colors.espresso, fontFamily: typography.headingFamilyRegular },
            ]}
          >
            Complete This Look
          </Text>
          <Text style={[typography.price, { color: colors.espresso }]}>
            ${totalValue.toFixed(0)}
          </Text>
        </View>
        <Text
          style={[
            typography.bodySmall,
            {
              color: colors.espressoLight,
              fontFamily: typography.bodyFamily,
              marginTop: spacing.xs,
            },
          ]}
        >
          {products.length} items starting from ${Math.min(...products.map((p) => p.price))}
        </Text>
      </View>
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandBase }]}
      testID="collection-detail-screen"
    >
      <Header
        title={collection.title}
        showBack
        cartCount={itemCount}
        onCartPress={openCart}
        testID="collection-detail-header"
      />
      <AnimatedFlatList
        data={products}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={[
          styles.row,
          { paddingHorizontal: spacing.pagePadding, gap: spacing.md },
        ]}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        windowSize={5}
        maxToRenderPerBatch={6}
        removeClippedSubviews
        initialNumToRender={4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    height: 320,
    position: 'relative',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImageError: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  heroRetryBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  heroRetryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 24,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 6,
  },
  moodTag: {},
  moodText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editorialSection: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  row: {
    marginBottom: 16,
  },
  productCell: {
    flex: 1,
  },
  footer: {},
  totalCard: {},
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

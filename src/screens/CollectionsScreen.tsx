/**
 * @module CollectionsScreen
 *
 * Lists all "Shop the Look" editorial collections as featured cards.
 * Each card links to the {@link CollectionDetailScreen} for that collection.
 * This gives customers curated, room-styled inspiration beyond browsing
 * individual products.
 */

import React, { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useCollections } from '@/hooks/useCollections';
import { usePremium } from '@/hooks/usePremium';
import { useCart } from '@/hooks/useCart';
import { useMiniCartDrawer } from '@/hooks/useMiniCartDrawer';
import { CollectionCard } from '@/components/CollectionCard';
import { PremiumBadge } from '@/components/PremiumBadge';
import { Header } from '@/components/Header';
import { SkeletonCollectionList } from '@/components/SkeletonCollectionCard';
import { useScrollPerformance } from '@/hooks/useScrollPerformance';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import type { EditorialCollection } from '@/data/collections';

const ESTIMATED_COLLECTION_CARD_HEIGHT = 280;

/** FlatList key extractor using the collection id. */
const keyExtractor = (item: EditorialCollection) => item.id;

/**
 * "Curated Looks" listing screen. Renders a vertical list of editorial
 * collection cards, each navigating to the collection detail on press.
 *
 * @returns The collections list view.
 */
export function CollectionsScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { collections, isLoading, error, refresh } = useCollections();
  const { isPremium } = usePremium();
  const { itemCount } = useCart();
  const { open: openCart } = useMiniCartDrawer();
  const scrollPerf = useScrollPerformance('CollectionsScreen');

  const handleCollectionPress = useCallback(
    (collection: EditorialCollection) => {
      if (collection.earlyAccess && !isPremium) {
        Alert.alert(
          'CF+ Early Access',
          'This collection is available exclusively for CF+ members. Upgrade to preview new collections before they launch.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Learn More', onPress: () => navigation.navigate('Premium') },
          ],
        );
        return;
      }
      navigation.navigate('CollectionDetail', { slug: collection.slug });
    },
    [navigation, isPremium],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: EditorialCollection; index: number }) => (
      <View style={{ paddingHorizontal: spacing.pagePadding }}>
        <CollectionCard
          collection={item}
          onPress={handleCollectionPress}
          variant={index === 0 ? 'featured' : 'featured'}
          testID={`collection-card-${item.slug}`}
        />
        {item.earlyAccess && !isPremium && (
          <View style={styles.earlyAccessOverlay} testID={`early-access-lock-${item.slug}`}>
            <PremiumBadge size="sm" />
            <Text style={[styles.earlyAccessText, { color: colors.espresso }]}>
              CF+ Early Access
            </Text>
          </View>
        )}
      </View>
    ),
    [handleCollectionPress, spacing.pagePadding, isPremium, colors.espresso],
  );

  const renderSeparator = useCallback(() => <View style={{ height: spacing.md }} />, [spacing.md]);

  const renderHeader = useCallback(
    () => (
      <View style={{ paddingHorizontal: spacing.pagePadding, marginBottom: spacing.lg }}>
        <Text
          style={[
            typography.h1,
            {
              color: colors.espresso,
              fontFamily: typography.headingFamily,
              marginBottom: spacing.xs,
            },
          ]}
        >
          Shop the Look
        </Text>
        <Text
          style={[
            typography.body,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
        >
          Curated room collections styled by our design team
        </Text>
      </View>
    ),
    [colors, spacing, typography],
  );

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.sandBase }]}
        testID="collections-screen"
      >
        <Header
          title="Curated Looks"
          showBack
          cartCount={itemCount}
          onCartPress={openCart}
          testID="collections-header"
        />
        <SkeletonCollectionList count={3} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.container, styles.centered, { backgroundColor: colors.sandBase }]}
        testID="collections-screen"
      >
        <Header
          title="Curated Looks"
          showBack
          cartCount={itemCount}
          onCartPress={openCart}
          testID="collections-header"
        />
        <Text style={[styles.errorText, { color: colors.espresso }]} testID="collections-error">
          Couldn't load collections. Check your connection.
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.sunsetCoral }]}
          onPress={refresh}
          testID="collections-retry"
          accessibilityRole="button"
        >
          <Text style={[styles.retryButtonText, { color: colors.white }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (collections.length === 0) {
    return (
      <View
        style={[styles.container, styles.centered, { backgroundColor: colors.sandBase }]}
        testID="collections-screen"
      >
        <Header
          title="Curated Looks"
          showBack
          cartCount={itemCount}
          onCartPress={openCart}
          testID="collections-header"
        />
        <Text
          style={[styles.emptyText, { color: colors.espressoLight }]}
          testID="collections-empty"
        >
          No collections available yet. Check back soon!
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandBase }]}
      testID="collections-screen"
    >
      <Header
        title="Curated Looks"
        showBack
        cartCount={itemCount}
        onCartPress={openCart}
        testID="collections-header"
      />
      <FlatList
        testID="collections-list"
        data={collections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={renderSeparator}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        windowSize={5}
        maxToRenderPerBatch={6}
        removeClippedSubviews
        getItemLayout={(_data, index) => ({
          length: ESTIMATED_COLLECTION_CARD_HEIGHT,
          offset: ESTIMATED_COLLECTION_CARD_HEIGHT * index,
          index,
        })}
        onScrollBeginDrag={scrollPerf.onScrollBeginDrag}
        onScrollEndDrag={scrollPerf.onScrollEndDrag}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginHorizontal: 32,
  },
  earlyAccessOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  earlyAccessText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

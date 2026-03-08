/**
 * @module CollectionsScreen
 *
 * Lists all "Shop the Look" editorial collections as featured cards.
 * Each card links to the {@link CollectionDetailScreen} for that collection.
 * This gives customers curated, room-styled inspiration beyond browsing
 * individual products.
 */

import React, { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useCollections } from '@/hooks/useCollections';
import { usePremium } from '@/hooks/usePremium';
import { CollectionCard } from '@/components/CollectionCard';
import { PremiumBadge } from '@/components/PremiumBadge';
import { Header } from '@/components/Header';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import type { EditorialCollection } from '@/data/collections';

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
  const { collections } = useCollections();
  const { isPremium } = usePremium();

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

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandBase }]}
      testID="collections-screen"
    >
      <Header title="Curated Looks" showBack />
      <FlatList
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

import React, { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useCollections } from '@/hooks/useCollections';
import { CollectionCard } from '@/components/CollectionCard';
import { Header } from '@/components/Header';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import type { EditorialCollection } from '@/data/collections';

const keyExtractor = (item: EditorialCollection) => item.id;

export function CollectionsScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { collections } = useCollections();

  const handleCollectionPress = useCallback(
    (collection: EditorialCollection) => {
      navigation.navigate('CollectionDetail', { slug: collection.slug });
    },
    [navigation],
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
      </View>
    ),
    [handleCollectionPress, spacing.pagePadding],
  );

  const renderSeparator = useCallback(
    () => <View style={{ height: spacing.md }} />,
    [spacing.md],
  );

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
});
